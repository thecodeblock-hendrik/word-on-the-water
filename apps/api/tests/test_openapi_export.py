import json
from pathlib import Path

import pytest

from app.openapi_export import OUTPUT_PATH, render_schema


def test_schema_describes_the_public_routes() -> None:
    schema = json.loads(render_schema())
    assert schema["info"]["title"] == "Word on the Water API"
    assert "/health/live" in schema["paths"]
    assert "/v1/ping" in schema["paths"]


def test_output_is_deterministic_and_ends_with_newline() -> None:
    assert render_schema() == render_schema()
    assert render_schema().endswith("\n")


def test_export_works_in_production_where_docs_are_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert "/health/live" in json.loads(render_schema())["paths"]


def test_committed_schema_is_not_stale() -> None:
    """Fails when an endpoint changed but `make types` was not run."""
    assert Path(OUTPUT_PATH).read_text() == render_schema()
