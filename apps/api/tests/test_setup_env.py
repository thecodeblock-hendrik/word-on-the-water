import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "setup_env.py"
EXAMPLE = """# comment kept
DATABASE_URL=
REDIS_URL=
SERVICE_TOKEN=
CRON_SECRET=
IP_HASH_SALT=
SMTP_PORT=
POSTMARK_SERVER_TOKEN=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
"""


def run(tmp_path: Path) -> dict[str, str]:
    example, target = tmp_path / ".env.example", tmp_path / ".env"
    example.write_text(EXAMPLE)
    subprocess.run([sys.executable, str(SCRIPT), str(example), str(target)], check=True)
    pairs = (line.split("=", 1) for line in target.read_text().splitlines() if "=" in line)
    return dict(pairs)


def test_fills_local_values_and_generates_distinct_secrets(tmp_path: Path) -> None:
    env = run(tmp_path)
    assert env["DATABASE_URL"].startswith("postgresql+asyncpg://app_runtime:")
    assert env["REDIS_URL"] == "redis://localhost:6379/0"
    assert env["SMTP_PORT"] == "1025"
    secrets = [env["SERVICE_TOKEN"], env["CRON_SECRET"], env["IP_HASH_SALT"]]
    assert all(len(s) >= 32 for s in secrets)
    assert len(set(secrets)) == 3


def test_local_runs_get_cloudflares_always_pass_turnstile_test_keys(tmp_path: Path) -> None:
    env = run(tmp_path)
    assert env["TURNSTILE_SECRET_KEY"] == "1x0000000000000000000000000000000AA"
    assert env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] == "1x00000000000000000000AA"


def test_leaves_unknown_keys_blank_and_keeps_comments(tmp_path: Path) -> None:
    run(tmp_path)
    text = (tmp_path / ".env").read_text()
    assert "POSTMARK_SERVER_TOKEN=\n" in text
    assert text.startswith("# comment kept")


def test_never_overwrites_an_existing_env(tmp_path: Path) -> None:
    (tmp_path / ".env").write_text("SERVICE_TOKEN=mine\n")
    (tmp_path / ".env.example").write_text(EXAMPLE)
    target = tmp_path / ".env"
    subprocess.run(
        [sys.executable, str(SCRIPT), str(tmp_path / ".env.example"), str(target)], check=True
    )
    assert target.read_text() == "SERVICE_TOKEN=mine\n"


def test_two_runs_generate_different_secrets(tmp_path: Path) -> None:
    for name in ("a", "b"):
        (tmp_path / name).mkdir()
    first = run(tmp_path / "a")["SERVICE_TOKEN"]
    second = run(tmp_path / "b")["SERVICE_TOKEN"]
    assert first != second
