"""A typed glossary word gets its definition when the search finds nothing better."""

import pytest

from app.schemas.chat import ChatContext, ChatReply, ChatTurn
from app.services.chat import Chat
from app.services.kb import KB_PATH, load_kb

FORMS = ["{}", "what is {}", "what does {} mean", "whats {}", "define {}", "meaning of {}"]

# The bare words that got no answer on 2026-11-21, although the glossary defines them. A bare
# "amen" is small talk on purpose (someone agreeing), so it is tested in a longer question below.
NO_ANSWER_BEFORE = [
    "Arminian",
    "Calvinist",
    "Covenant",
    "Disciple",
    "Dispensationalism",
    "Evangelical",
    "Gentile",
    "Hallelujah",
    "Incarnation",
    "Mediator",
    "Messiah",
    "Pharisees",
    "Redemption",
    "Sacrament",
]


@pytest.fixture(scope="module")
def chat() -> Chat:
    return Chat(load_kb(KB_PATH))


def say(chat: Chat, message: str) -> ChatReply:
    return chat.reply(ChatTurn(message=message), ChatContext())


def glossary_names(chat: Chat) -> list[str]:
    return [name for g in chat.kb.glossary for name in (g.term, *g.aliases)]


@pytest.mark.parametrize("term", NO_ANSWER_BEFORE)
def test_a_bare_glossary_word_gets_its_definition(chat: Chat, term: str) -> None:
    reply = say(chat, term.lower())
    assert reply.kind == "term"
    assert reply.term is not None
    assert reply.term.term == term


@pytest.mark.parametrize("form", FORMS)
def test_no_glossary_word_is_left_without_an_answer(chat: Chat, form: str) -> None:
    missed = [n for n in glossary_names(chat) if say(chat, form.format(n)).kind == "no_answer"]
    assert missed == []


def test_amen_alone_is_small_talk_but_asking_what_it_means_gets_the_definition(chat: Chat) -> None:
    assert say(chat, "amen").kind == "smalltalk"
    reply = say(chat, "what does amen mean")
    assert reply.kind == "term"
    assert reply.term is not None
    assert reply.term.term == "Amen"


def test_an_alias_gets_the_definition_of_its_term(chat: Chat) -> None:
    reply = say(chat, "what does Reformed mean")
    assert reply.kind in ("term", "answer", "clarify")


def test_a_question_with_its_own_entry_still_gets_the_full_answer(chat: Chat) -> None:
    reply = say(chat, "what is grace")
    assert reply.kind == "answer"
    assert reply.entry is not None
    assert reply.entry.id == "3.5"


@pytest.mark.parametrize(
    "message", ["what is a plumber", "what does bitcoin mean", "define surfing", "what is the"]
)
def test_words_that_are_not_glossary_terms_still_get_no_answer(chat: Chat, message: str) -> None:
    assert say(chat, message).kind == "no_answer"
