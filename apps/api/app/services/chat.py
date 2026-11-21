"""Chat logic: turns a visitor action into a reply from the knowledge base.

Stateless. The browser sends a small context (ids only) with every turn. Order
of work for free text: guards (empty, crisis, too long, personal details),
small talk, "tell me more", then search, with a small boost toward the entries
related to the last answer and a small penalty for entries already shown.
"""

import re

from app.schemas.chat import (
    ChatContext,
    ChatReply,
    ChatTurn,
    EntryView,
    Option,
    TermView,
)
from app.schemas.kb import Entry, KnowledgeBase
from app.services.chat_guards import check
from app.services.kb_search import SearchIndex, tokens

RELATED_BOOST, THEME_BOOST, SEEN_PENALTY = 4.0, 2.0, 3.0
SHORT_FOLLOW_UP_WORDS = 3

REFERENCE_WORDS = frozenset(
    [
        "it",
        "that",
        "this",
        "he",
        "him",
        "his",
        "they",
        "them",
        "those",
        "these",
        "more",
        "why",
        "also",
        "else",
        "again",
    ]
)
CONNECTIVE = re.compile(r"^(?:and|but|so|what about|how about)\b")
MORE = re.compile(
    r"^(?:please )?(?:(?:tell|show|give) me more|more|go on|elaborate|explain"
    r"(?: (?:that|it|this|more|further|again|simply|in simple terms))?"
    r"|(?:can|could) you (?:explain|elaborate)(?: (?:that|it|this|more|further|simply|again))*"
    r"|what do you mean|i dont understand)(?: please)?$"
)
# "what does covenant mean", "define grace", "the Messiah": a question that is only a glossary word.
TERM_QUESTION = re.compile(
    r"^(?:(?:what is the meaning of|meaning of|what(?:s| is| are| does)|who(?:s| is| are)"
    r"|define|explain|tell me about)\s+)?(?:(?:the|a|an)\s+)?(?P<term>.+?)(?:\s+means?)?$"
)
SMALL_TALK = {
    "greeting": (
        re.compile(r"^(?:hi|hello|hey|howzit|good (?:morning|afternoon|evening))(?: there)?$"),
        "Hello. Ask a question about the Christian faith, or tap one of the suggestions.",
    ),
    "thanks": (
        re.compile(r"^(?:thanks|thank you|thx|cheers|thanks a lot|thank you very much)$"),
        "You are welcome. Ask another question any time.",
    ),
    "ack": (
        re.compile(r"^(?:ok|okay|cool|great|nice|amen|alright|got it|i see)$"),
        "Glad that helps. Ask another question any time, or tap one of the suggestions.",
    ),
    "bye": (
        re.compile(r"^(?:bye|goodbye|see you|good night|goodnight)$"),
        "God bless you. You are welcome back any time.",
    ),
}
DID_YOU_MEAN = "I am not sure what you mean. Did you mean one of these?"
RELATED_TEXT = "Here are some related questions."


def plain(text: str) -> str:
    """Lowercase and drop apostrophes and punctuation: how a message meets the patterns."""
    return re.sub(r"[^\w\s]", "", text.lower().replace("'", "")).strip()


class Chat:
    """Answers chat turns. Build once per process; `reply` is a pure function."""

    def __init__(self, kb: KnowledgeBase) -> None:
        self.kb = kb
        self.index = SearchIndex(kb)
        self.entries = kb.entries_by_id
        self.terms = {name.lower(): g for g in kb.glossary for name in (g.term, *g.aliases)}
        self.typed_terms = {plain(name): g for g in kb.glossary for name in (g.term, *g.aliases)}

    def reply(self, turn: ChatTurn, context: ChatContext) -> ChatReply:
        if not self._context_is_valid(context):
            return self._rejected("bad_context")
        last = self.entries.get(context.last_entry_id) if context.last_entry_id else None
        if turn.entry_id is not None:
            entry = self.entries.get(turn.entry_id)
            return self._answer(entry) if entry else self._rejected("unknown_id")
        if turn.action == "term":
            return self._term(turn.term or "")
        if turn.action is not None:
            if last is None:
                return self._rejected("no_context")
            return self._more(last, context) if turn.action == "more" else self._related(last)
        return self._message(turn.message or "", last, context)

    def _message(self, message: str, last: Entry | None, context: ChatContext) -> ChatReply:
        guard = check(message)
        if guard.outcome == "crisis":
            return ChatReply(
                kind="crisis", text=self.kb.responses.crisis, kb_version=self.kb.version
            )
        if guard.outcome != "ok":
            return self._rejected(guard.outcome)
        words = plain(guard.text)
        for pattern, text in SMALL_TALK.values():
            if pattern.match(words):
                return ChatReply(kind="smalltalk", text=text, kb_version=self.kb.version)
        if last is not None and MORE.match(words):
            return self._more(last, context)
        return self._search(guard.text, words, last, context)

    def _search(self, text: str, words: str, last: Entry | None, context: ChatContext) -> ChatReply:
        pointing = bool(REFERENCE_WORDS & set(words.split())) or bool(CONNECTIVE.match(words))
        follow_up = last is not None and (pointing or len(tokens(text)) <= SHORT_FOLLOW_UP_WORDS)
        adjust = self._adjustments(last, context) if follow_up and last else None
        result = self.index.search(text, adjust)
        if result.band == "high":
            return self._answer(self.entries[result.ranked[0]])
        if result.band == "medium":
            return self._clarify([self.entries[i] for i in result.ranked])
        if last is not None and pointing:
            return self._related(last)
        return self._typed_term(words) or self.no_answer()

    def _typed_term(self, words: str) -> ChatReply | None:
        """The definition, when the question is only a glossary word or alias.

        Only reached where the search found nothing, so a question with its own entry ("what is
        grace") keeps its full answer.
        """
        match = TERM_QUESTION.match(" ".join(words.split()))
        glossary = self.typed_terms.get(match.group("term")) if match else None
        return self._term(glossary.term) if glossary else None

    def no_answer(self) -> ChatReply:
        return ChatReply(
            kind="no_answer", text=self.kb.responses.no_answer, kb_version=self.kb.version
        )

    def _adjustments(self, last: Entry, context: ChatContext) -> dict[str, float]:
        adjust = {e.id: THEME_BOOST for e in self.kb.entries if e.theme_number == last.theme_number}
        for entry_id in last.related:
            adjust[entry_id] = RELATED_BOOST
        for entry_id in context.seen_entry_ids:
            adjust[entry_id] = adjust.get(entry_id, 0.0) - SEEN_PENALTY
        return adjust

    def _more(self, last: Entry, context: ChatContext) -> ChatReply:
        if last.id in context.explained_entry_ids:
            return self._related(last)
        return self._answer(last, expand=True)

    def _related(self, last: Entry) -> ChatReply:
        return self._clarify([self.entries[i] for i in last.related], RELATED_TEXT)

    def _clarify(self, entries: list[Entry], text: str = DID_YOU_MEAN) -> ChatReply:
        options = [Option(id=e.id, question=e.question) for e in entries]
        return ChatReply(kind="clarify", options=options, text=text, kb_version=self.kb.version)

    def _answer(self, entry: Entry, expand: bool = False) -> ChatReply:
        return ChatReply(
            kind="answer", entry=self._view(entry), expand=expand, kb_version=self.kb.version
        )

    def _term(self, name: str) -> ChatReply:
        glossary = self.terms.get(name.strip().lower())
        if glossary is None:
            return self._rejected("unknown_term")
        return ChatReply(
            kind="term", term=self._term_view(glossary.term), kb_version=self.kb.version
        )

    def _rejected(self, reason: str) -> ChatReply:
        return ChatReply(kind="rejected", reason=reason, kb_version=self.kb.version)

    def _context_is_valid(self, context: ChatContext) -> bool:
        ids = [*context.seen_entry_ids, *context.explained_entry_ids]
        if context.last_entry_id is not None:
            ids.append(context.last_entry_id)
        return all(i in self.entries for i in ids)

    def _term_view(self, term: str) -> TermView:
        glossary = self.terms[term.lower()]
        entries = [Option(id=i, question=self.entries[i].question) for i in glossary.entries]
        return TermView(
            term=glossary.term,
            meaning=glossary.meaning,
            key_verses=glossary.key_verses,
            entries=entries,
        )

    def _view(self, entry: Entry) -> EntryView:
        note = self.kb.responses.contested_suffix if entry.contested else None
        return EntryView(
            id=entry.id,
            question=entry.question,
            short_answer=entry.short_answer,
            explanation=entry.explanation,
            contested=entry.contested,
            contested_note=note,
            key_verses=entry.key_verses,
            related=[Option(id=i, question=self.entries[i].question) for i in entry.related],
            glossary_terms=[self._term_view(t) for t in entry.glossary_terms],
        )
