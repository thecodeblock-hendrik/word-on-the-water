import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "check_bundle_secrets.py"
VALUE = "s3cr3t-value-" + "9f8e7d"


def scan(directory: Path, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(directory)],
        capture_output=True,
        text=True,
        env=env or {},
    )


def bundle(tmp_path: Path, content: str) -> Path:
    directory = tmp_path / "static"
    directory.mkdir()
    (directory / "app.js").write_text(content)
    return directory


def test_clean_bundle_passes(tmp_path: Path) -> None:
    result = scan(bundle(tmp_path, 'console.log("hello", process.env.NEXT_PUBLIC_X)'))
    assert result.returncode == 0


def test_secret_variable_name_fails(tmp_path: Path) -> None:
    result = scan(bundle(tmp_path, "const t = process.env.SERVICE_TOKEN"))
    assert result.returncode == 1
    assert "SERVICE_TOKEN" in result.stdout


def test_secret_value_from_the_build_environment_fails_without_printing_it(
    tmp_path: Path,
) -> None:
    result = scan(bundle(tmp_path, f'const t = "{VALUE}"'), env={"CRON_SECRET": VALUE})
    assert result.returncode == 1
    assert VALUE not in result.stdout + result.stderr


def test_sentry_dsn_pattern_fails(tmp_path: Path) -> None:
    dsn = "https://abc123@o1.ingest.de.sentry.io/42"
    assert scan(bundle(tmp_path, f'init("{dsn}")')).returncode == 1


def test_database_url_with_password_fails(tmp_path: Path) -> None:
    url = "postgresql://user:hunter2@host.example/db"
    assert scan(bundle(tmp_path, f'"{url}"')).returncode == 1


def test_missing_or_empty_directory_fails_instead_of_passing_vacuously(tmp_path: Path) -> None:
    assert scan(tmp_path / "nope").returncode == 2
    empty = tmp_path / "empty"
    empty.mkdir()
    assert scan(empty).returncode == 2
