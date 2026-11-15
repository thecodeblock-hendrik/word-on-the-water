"""Loading and validating the Got Questions knowledge base."""

import copy
import json
from pathlib import Path
from typing import Any

import pytest
import structlog
from structlog.testing import capture_logs

from app.services import kb as kb_module
from app.services.kb import KnowledgeBaseError, get_kb, load_kb

DATA = Path(__file__).resolve().parent.parent / "app" / "data" / "faith_kb.json"


@pytest.fixture(scope="module")
def raw() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(DATA.read_text("utf-8"))
    return data


def write(tmp_path: Path, data: dict[str, Any]) -> Path:
    path = tmp_path / "kb.json"
    path.write_text(json.dumps(data), "utf-8")
    return path


def broken(raw: dict[str, Any], change: Any) -> dict[str, Any]:
    data = copy.deepcopy(raw)
    change(data)
    return data


def test_the_committed_knowledge_base_loads() -> None:
    kb = load_kb(DATA)
    assert kb.version == kb.meta.version
    assert len(kb.entries_by_id) == 228


def test_counts_match_the_meta_counts() -> None:
    kb = load_kb(DATA)
    assert len(kb.entries) == kb.meta.counts.entries == 228
    assert sum(e.contested for e in kb.entries) == kb.meta.counts.contested == 16
    assert len(kb.glossary) == kb.meta.counts.glossary_terms == 39
    assert len(kb.themes) == kb.meta.counts.themes == 15


def test_every_cross_reference_resolves() -> None:
    kb = load_kb(DATA)
    terms = {g.term for g in kb.glossary}
    for entry in kb.entries:
        assert set(entry.related) <= kb.entries_by_id.keys()
        assert entry.id not in entry.related
        assert set(entry.glossary_terms) <= terms
    for term in kb.glossary:
        assert set(term.entries) <= kb.entries_by_id.keys()


def test_every_entry_has_an_answer_and_contested_entries_have_guidance() -> None:
    for entry in load_kb(DATA).entries:
        assert entry.short_answer.strip()
        assert entry.explanation.strip()
        assert bool(entry.answer_guidance) == entry.contested


def test_no_field_contains_html_or_a_script_url() -> None:
    text = DATA.read_text("utf-8").lower()
    assert "javascript:" not in text
    for entry in load_kb(DATA).entries:
        for value in (entry.question, entry.short_answer, entry.explanation, *entry.also_asked):
            assert "<" not in value
            assert ">" not in value


def test_the_fixed_replies_are_present() -> None:
    responses = load_kb(DATA).responses
    assert "0800 567 567" in responses.crisis
    assert responses.no_answer
    assert responses.contested_suffix


@pytest.mark.parametrize(
    ("name", "change", "message"),
    [
        ("missing field", lambda d: d["entries"][0].pop("short_answer"), "short_answer"),
        ("wrong type", lambda d: d["entries"][0].update(contested="yes"), "contested"),
        ("unknown field", lambda d: d["entries"][0].update(surprise=1), "surprise"),
        ("unknown related id", lambda d: d["entries"][0].update(related=["99.99"]), "99.99"),
        (
            "duplicate id",
            lambda d: d["entries"][1].update(id=d["entries"][0]["id"]),
            "duplicate",
        ),
        (
            "unknown glossary entry",
            lambda d: d["glossary"][0].update(entries=["99.99"]),
            "99.99",
        ),
        (
            "unknown glossary term on an entry",
            lambda d: d["entries"][0].update(glossary_terms=["No Such Term"]),
            "No Such Term",
        ),
        (
            "html in an answer",
            lambda d: d["entries"][0].update(short_answer="<b>bold</b>"),
            "html",
        ),
        (
            "blank explanation",
            lambda d: d["entries"][0].update(explanation="  "),
            "explanation",
        ),
        (
            "counts do not match",
            lambda d: d["meta"]["counts"].update(entries=5),
            "counts",
        ),
    ],
)
def test_a_corrupt_file_raises_a_clear_error(
    raw: dict[str, Any], tmp_path: Path, name: str, change: Any, message: str
) -> None:
    with pytest.raises(KnowledgeBaseError) as caught:
        load_kb(write(tmp_path, broken(raw, change)))
    assert message.lower() in str(caught.value).lower(), name


def test_a_missing_file_raises_a_clear_error(tmp_path: Path) -> None:
    with pytest.raises(KnowledgeBaseError):
        load_kb(tmp_path / "nope.json")


def test_get_kb_loads_once() -> None:
    get_kb.cache_clear()
    assert get_kb() is get_kb()


def test_get_kb_returns_none_and_logs_only_the_error_class(
    raw: dict[str, Any], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = write(tmp_path, broken(raw, lambda d: d["entries"][0].pop("short_answer")))
    monkeypatch.setattr(kb_module, "KB_PATH", path)
    get_kb.cache_clear()
    structlog.reset_defaults()
    with capture_logs() as logs:
        assert get_kb() is None
    get_kb.cache_clear()
    assert logs == [
        {"event": "kb_load_failed", "log_level": "error", "error": "KnowledgeBaseError"}
    ]
