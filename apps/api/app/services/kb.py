"""Loads the Got Questions knowledge base once per process.

A bad file never stops the app: `get_kb()` returns None and logs the error
class only, so the chat can report itself unavailable while health stays up.
"""

import json
from functools import cache
from pathlib import Path

import structlog
from pydantic import ValidationError

from app.schemas.kb import KnowledgeBase

KB_PATH = Path(__file__).resolve().parent.parent / "data" / "faith_kb.json"

log = structlog.get_logger()


class KnowledgeBaseError(Exception):
    """The knowledge base file is missing or invalid."""


def load_kb(path: Path) -> KnowledgeBase:
    """Read and validate the file at `path`."""
    try:
        return KnowledgeBase.model_validate(json.loads(path.read_text("utf-8")))
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(map(str, e['loc']))}: {e['msg']}".strip(": ") for e in exc.errors()
        )
        raise KnowledgeBaseError(f"{path.name} is invalid: {problems}") from exc
    except (OSError, ValueError) as exc:
        raise KnowledgeBaseError(f"cannot read {path.name}: {type(exc).__name__}") from exc


@cache
def get_kb() -> KnowledgeBase | None:
    """The shared knowledge base, or None if it cannot be loaded."""
    try:
        return load_kb(KB_PATH)
    except KnowledgeBaseError as exc:
        log.error("kb_load_failed", error=type(exc).__name__)
        return None
