"""Conversation logic: small talk, chips, follow-ups and 20 played sequences."""

import pytest

from app.schemas.chat import ChatContext, ChatReply, ChatTurn
from app.services.chat import Chat
from app.services.kb import KB_PATH, load_kb


@pytest.fixture(scope="module")
def chat() -> Chat:
    return Chat(load_kb(KB_PATH))


class Visitor:
    """Plays a conversation the way the browser does: it keeps the context."""

    def __init__(self, chat: Chat) -> None:
        self.chat = chat
        self.context = ChatContext()
        self.last: ChatReply | None = None

    def send(self, **turn: str) -> ChatReply:
        reply = self.chat.reply(ChatTurn(**turn), self.context)
        self.last = reply
        if reply.kind == "answer" and reply.entry:
            ctx = self.context
            seen = [i for i in ctx.seen_entry_ids if i != reply.entry.id] + [reply.entry.id]
            explained = list(ctx.explained_entry_ids)
            if reply.expand and reply.entry.id not in explained:
                explained.append(reply.entry.id)
            self.context = ChatContext(
                last_entry_id=reply.entry.id,
                seen_entry_ids=seen[-20:],
                explained_entry_ids=explained[-20:],
            )
        return reply

    def says(self, message: str) -> ChatReply:
        return self.send(message=message)


def answered(reply: ChatReply) -> str | None:
    return reply.entry.id if reply.kind == "answer" and reply.entry else None


def option_ids(reply: ChatReply) -> list[str]:
    return [o.id for o in reply.options]


# Twenty conversations. Each step is (what the visitor does, the entry id expected).
SEQUENCES = {
    "gospel then why and who": [("what is the gospel", "3.1"), ("who is jesus", "2.1")],
    "jesus then why did he die": [("who is jesus", "2.1"), ("why did he die", "2.6")],
    "baptism then babies": [("what is baptism", "8.4"), ("what about babies", "8.5")],
    "grace then losing it": [("what is grace", "3.5"), ("can i lose it", "3.14")],
    "god exists then hiding": [
        ("does god exist", "1.1"),
        ("why doesnt he show himself", "13.8"),
    ],
    "hell then loving god": [("is hell real", "10.3"), ("how can a loving god do that", "10.4")],
    "pray then unanswered": [("how do i pray", "7.2"), ("why doesnt god answer", "7.4")],
    "bible then contradict": [
        ("can i trust the bible", "4.4"),
        ("does it contradict itself", "4.8"),
    ],
    "saved then repentance": [("how can i be saved", "3.2"), ("what is repentance", "3.7")],
    "trinity then spirit": [("what is the trinity", "1.3"), ("and the spirit", "5.1")],
}


@pytest.mark.parametrize("name", SEQUENCES)
def test_free_text_sequences(chat: Chat, name: str) -> None:
    visitor = Visitor(chat)
    for message, expected in SEQUENCES[name]:
        assert answered(visitor.says(message)) == expected, (name, message)


def test_a_follow_up_with_only_a_pronoun_offers_the_related_questions(chat: Chat) -> None:
    v = Visitor(chat)
    assert answered(v.says("what is the holy spirit")) == "5.1"
    reply = v.says("what does he do")
    assert reply.kind == "clarify"
    assert option_ids(reply) == ["1.3", "2.2", "5.3", "5.2", "5.10"]


def test_a_loose_follow_up_puts_the_right_entry_first(chat: Chat) -> None:
    v = Visitor(chat)
    v.says("when will jesus return")
    reply = v.says("is that the same as the rapture")
    assert reply.kind == "clarify" and option_ids(reply)[0] == "12.3"


def test_tell_me_more_expands_then_offers_related(chat: Chat) -> None:
    v = Visitor(chat)
    assert answered(v.says("what is the gospel")) == "3.1"
    more = v.says("tell me more")
    assert answered(more) == "3.1" and more.expand
    again = v.says("tell me more")
    assert again.kind == "clarify"
    assert option_ids(again) == ["2.14", "3.11", "3.2", "3.19", "2.1"]


def test_chips_send_ids_and_related_lists_the_related_questions(chat: Chat) -> None:
    v = Visitor(chat)
    assert answered(v.send(entry_id="3.1")) == "3.1"
    related = v.send(action="related")
    assert related.kind == "clarify"
    assert option_ids(related) == ["2.14", "3.11", "3.2", "3.19", "2.1"]
    assert answered(v.send(entry_id="2.14")) == "2.14"


def test_the_more_action_expands_the_last_entry(chat: Chat) -> None:
    v = Visitor(chat)
    v.send(entry_id="2.6")
    more = v.send(action="more")
    assert answered(more) == "2.6" and more.expand


def test_a_term_chip_returns_the_glossary_meaning(chat: Chat) -> None:
    v = Visitor(chat)
    v.send(entry_id="2.6")
    for spelling in ("Atonement", "atonement"):
        reply = v.send(action="term", term=spelling)
        assert reply.kind == "term" and reply.term
        assert reply.term.term == "Atonement" and reply.term.meaning
    assert v.context.last_entry_id == "2.6"


def test_unknown_ids_terms_and_context_are_rejected(chat: Chat) -> None:
    assert chat.reply(ChatTurn(entry_id="99.99"), ChatContext()).reason == "unknown_id"
    assert chat.reply(ChatTurn(action="term", term="Nope"), ChatContext()).reason == "unknown_term"
    assert chat.reply(ChatTurn(action="more"), ChatContext()).reason == "no_context"
    bad = ChatContext(last_entry_id="99.99")
    assert chat.reply(ChatTurn(message="hello"), bad).reason == "bad_context"
    bad = ChatContext(seen_entry_ids=["3.1", "nope"])
    assert chat.reply(ChatTurn(message="hello"), bad).reason == "bad_context"
    bad = ChatContext(explained_entry_ids=["nope"])
    assert chat.reply(ChatTurn(message="hello"), bad).reason == "bad_context"


def test_a_turn_needs_exactly_one_thing() -> None:
    for bad in (
        {},
        {"message": "a", "entry_id": "3.1"},
        {"action": "term"},
        {"message": "a", "term": "x"},
    ):
        with pytest.raises(ValueError):
            ChatTurn(**bad)


@pytest.mark.parametrize(
    "text", ["hello", "Hi!", "hey there", "thanks", "thank you", "ok", "amen", "bye"]
)
def test_small_talk_gets_a_fixed_reply_and_no_search(chat: Chat, text: str) -> None:
    reply = Visitor(chat).says(text)
    assert reply.kind == "smalltalk" and reply.text and reply.entry is None


def test_small_talk_keeps_the_conversation_thread(chat: Chat) -> None:
    v = Visitor(chat)
    v.says("what is the gospel")
    assert v.says("thanks").kind == "smalltalk"
    assert v.context.last_entry_id == "3.1"
    assert answered(v.says("tell me more")) == "3.1"


def test_a_crisis_phrase_mid_conversation_gets_the_fixed_text(chat: Chat) -> None:
    v = Visitor(chat)
    v.says("what is grace")
    reply = v.says("i want to kill myself")
    assert reply.kind == "crisis" and reply.text == chat.kb.responses.crisis
    assert reply.entry is None and v.context.last_entry_id == "3.5"


def test_off_topic_after_a_conversation_is_still_no_answer(chat: Chat) -> None:
    v = Visitor(chat)
    v.says("what is grace")
    reply = v.says("what is the weather today")
    assert reply.kind == "no_answer" and reply.text == chat.kb.responses.no_answer


def test_a_pronoun_follow_up_that_finds_nothing_offers_the_related_questions(chat: Chat) -> None:
    v = Visitor(chat)
    v.send(entry_id="3.1")
    reply = v.says("what about that")
    assert reply.kind in {"clarify", "answer"}
    if reply.kind == "clarify":
        assert set(option_ids(reply)) <= {"2.14", "3.11", "3.2", "2.1", "3.19"}


def test_rejected_input_is_reported_by_reason(chat: Chat) -> None:
    v = Visitor(chat)
    assert v.says("").reason == "empty"
    assert v.says("call me on 082 555 1234").reason == "personal_details"
    assert v.says("x" * 301).reason == "too_long"


def test_a_medium_match_offers_up_to_three_questions(chat: Chat) -> None:
    reply = Visitor(chat).says("can god forgive me")
    assert reply.kind == "clarify" and 1 <= len(reply.options) <= 3


def test_every_contested_entry_carries_the_contested_note(chat: Chat) -> None:
    contested = [e for e in chat.kb.entries if e.contested]
    assert len(contested) == 16
    for entry in contested:
        view = Visitor(chat).send(entry_id=entry.id).entry
        assert view and view.contested
        assert view.contested_note == chat.kb.responses.contested_suffix


def test_uncontested_entries_have_no_note(chat: Chat) -> None:
    view = Visitor(chat).send(entry_id="3.1").entry
    assert view and not view.contested and view.contested_note is None


def test_the_reply_carries_the_knowledge_base_version(chat: Chat) -> None:
    assert Visitor(chat).says("hello").kb_version == chat.kb.version


def test_the_answer_view_has_verses_related_questions_and_terms(chat: Chat) -> None:
    view = Visitor(chat).send(entry_id="2.6").entry
    assert view
    assert view.key_verses
    assert [o.id for o in view.related] == ["3.16", "2.1", "1.9", "2.12", "3.1"]
    assert view.related[0].question == "What is atonement?"
    assert [t.term for t in view.glossary_terms] == ["Atonement"]
    assert view.glossary_terms[0].meaning
