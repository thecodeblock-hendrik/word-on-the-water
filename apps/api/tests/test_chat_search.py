"""Retrieval quality, measured on the evaluation set in tests/chat_eval."""

import time

import pytest

from app.schemas.kb import KnowledgeBase
from app.services.kb import KB_PATH, load_kb
from app.services.kb_search import SearchIndex
from tests.chat_eval.off_topic import OFF_TOPIC
from tests.chat_eval.real_world import REAL_WORLD


@pytest.fixture(scope="module")
def kb() -> KnowledgeBase:
    return load_kb(KB_PATH)


@pytest.fixture(scope="module")
def index(kb: KnowledgeBase) -> SearchIndex:
    return SearchIndex(kb)


def own_questions(kb: KnowledgeBase) -> list[tuple[str, str]]:
    return [(q, e.id) for e in kb.entries for q in (e.question, *e.also_asked)]


def test_the_knowledge_bases_own_questions_are_found(kb: KnowledgeBase, index: SearchIndex) -> None:
    cases = own_questions(kb)
    assert len(cases) == 532
    first = sum(index.search(q).ranked[:1] == (i,) for q, i in cases)
    top3 = sum(i in index.search(q).ranked[:3] for q, i in cases)
    print(f"own questions: first {first / len(cases):.3f}, top three {top3 / len(cases):.3f}")
    assert first / len(cases) >= 0.95
    assert top3 / len(cases) >= 0.99


def test_real_world_wordings_are_found(index: SearchIndex) -> None:
    first = sum(bool(set(index.search(q).ranked[:1]) & ok) for q, ok in REAL_WORLD)
    top3 = sum(bool(set(index.search(q).ranked[:3]) & ok) for q, ok in REAL_WORLD)
    print(f"real world: first {first}/{len(REAL_WORLD)}, top three {top3}/{len(REAL_WORLD)}")
    assert first / len(REAL_WORLD) >= 0.9
    assert top3 / len(REAL_WORLD) >= 0.95


@pytest.mark.parametrize("query", OFF_TOPIC)
def test_off_topic_questions_get_no_answer(index: SearchIndex, query: str) -> None:
    assert index.search(query).band == "low"


def test_who_is_jesus_is_a_confident_answer(index: SearchIndex) -> None:
    result = index.search("who is jesus")
    assert result.ranked[0] == "2.1"
    assert result.band == "high"


def test_a_search_is_fast(index: SearchIndex) -> None:
    start = time.perf_counter()
    for _ in range(50):
        index.search("why does god allow suffering in the world")
    assert (time.perf_counter() - start) / 50 < 0.05
