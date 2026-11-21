"""Spelling variants must meet: the knowledge base is British, visitors type both."""

import pytest

from app.services.kb_search import tokens

SAME = [
    ("baptism", "baptised"),
    ("baptism", "baptized"),
    ("baptise", "baptized"),
    ("baptising", "baptizing"),
    ("baptisms", "baptism"),
    ("saviour", "savior"),
    ("honour", "honor"),
    ("honoured", "honored"),
    ("neighbour", "neighbor"),
    ("favour", "favor"),
    ("behaviour", "behavior"),
    ("recognise", "recognize"),
    ("emphasised", "emphasized"),
    ("judgement", "judgment"),
]


@pytest.mark.parametrize(("a", "b"), SAME)
def test_variant_spellings_give_the_same_tokens(a: str, b: str) -> None:
    assert tokens(a) == tokens(b)


@pytest.mark.parametrize("word", ["hour", "four", "your", "pour", "our"])
def test_short_words_ending_in_our_are_left_alone(word: str) -> None:
    assert tokens(word) in ([word], [])


def test_baptist_the_denomination_is_not_baptism() -> None:
    assert tokens("baptist") != tokens("baptism")
