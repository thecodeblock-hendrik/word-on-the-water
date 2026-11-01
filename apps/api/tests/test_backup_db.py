"""Configuration checks in scripts/backup_db.py. They run before pg_dump is started."""

import os
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "backup_db.py"
PUBLIC_KEY = "age1" + "q" * 58
REMOTE = "postgresql://app_backup:s3cret-pw@ep-x.eu-central-1.aws.neon.tech/neondb"


def run(
    tmp_path: Path, url: str | None = REMOTE, key: str | None = PUBLIC_KEY
) -> subprocess.CompletedProcess[str]:
    env = {
        k: v for k, v in os.environ.items() if k not in ("BACKUP_DATABASE_URL", "AGE_PUBLIC_KEY")
    }
    if url is not None:
        env["BACKUP_DATABASE_URL"] = url
    if key is not None:
        env["AGE_PUBLIC_KEY"] = key
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(tmp_path / "out.dump.age")],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def assert_refused(result: subprocess.CompletedProcess[str], tmp_path: Path, reason: str) -> None:
    assert result.returncode == 2, result.stderr
    assert reason in result.stderr
    assert "s3cret-pw" not in result.stdout + result.stderr
    assert not (tmp_path / "out.dump.age").exists()


def test_refuses_missing_database_url(tmp_path: Path) -> None:
    assert_refused(run(tmp_path, url=None), tmp_path, "BACKUP_DATABASE_URL is not set")


def test_refuses_remote_url_without_verify_full(tmp_path: Path) -> None:
    result = run(tmp_path, url=REMOTE + "?sslmode=require")
    assert_refused(result, tmp_path, "sslmode=verify-full")


def test_refuses_pooled_neon_host(tmp_path: Path) -> None:
    url = "postgresql://app_backup:s3cret-pw@ep-x-pooler.eu-central-1.aws.neon.tech/neondb"
    assert_refused(run(tmp_path, url=url + "?sslmode=verify-full"), tmp_path, "pooled")


def test_refuses_missing_public_key(tmp_path: Path) -> None:
    result = run(tmp_path, url=REMOTE + "?sslmode=verify-full", key=None)
    assert_refused(result, tmp_path, "AGE_PUBLIC_KEY is not set")


def test_refuses_a_private_key_and_never_prints_it(tmp_path: Path) -> None:
    private = "AGE-SECRET-KEY-1" + "Q" * 58
    result = run(tmp_path, url=REMOTE + "?sslmode=verify-full", key=private)
    assert_refused(result, tmp_path, "private key")
    assert private not in result.stdout + result.stderr


def test_refuses_a_malformed_public_key(tmp_path: Path) -> None:
    result = run(tmp_path, url=REMOTE + "?sslmode=verify-full", key="age1short")
    assert_refused(result, tmp_path, "not an age public key")


def test_never_overwrites_an_existing_output(tmp_path: Path) -> None:
    (tmp_path / "out.dump.age").write_text("earlier dump")
    result = run(tmp_path, url=REMOTE + "?sslmode=verify-full")
    assert result.returncode == 2
    assert "already exists" in result.stderr
    assert (tmp_path / "out.dump.age").read_text() == "earlier dump"
