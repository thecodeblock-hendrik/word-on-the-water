"""The committed knowledge base JSON must match what the markdown builds."""

import json
import subprocess
import sys
from pathlib import Path

API = Path(__file__).resolve().parent.parent
SOURCE = API / "kb" / "faith_kb.md"
BUILDER = API / "kb" / "build_kb.py"
COMMITTED = API / "app" / "data" / "faith_kb.json"


def test_committed_json_matches_markdown(tmp_path: Path) -> None:
    out = tmp_path / "faith_kb.json"
    subprocess.run([sys.executable, str(BUILDER), str(SOURCE), str(out)], check=True)
    assert json.loads(out.read_text("utf-8")) == json.loads(COMMITTED.read_text("utf-8"))


def test_build_is_reproducible(tmp_path: Path) -> None:
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    for out in (a, b):
        subprocess.run([sys.executable, str(BUILDER), str(SOURCE), str(out)], check=True)
    assert a.read_bytes() == b.read_bytes()
