"""scripts/backup_db.py against the local Postgres: the dump is encrypted and restorable.

Needs `make up`, `make migrate`, and pg_dump, pg_restore, age and age-keygen on the PATH
(scripts/install_backup_tools.sh installs them in CI).
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[4] / "scripts" / "backup_db.py"
LOCAL_URL = "postgresql://app_migrator:migrator_local@localhost:5432/wotw"


def tool(name: str) -> str:
    path = shutil.which(name)
    assert path, f"{name} is not installed (scripts/install_backup_tools.sh)"
    return path


def keypair(tmp_path: Path) -> tuple[Path, str]:
    identity = tmp_path / "test.key"
    subprocess.run([tool("age-keygen"), "-o", str(identity)], check=True, capture_output=True)
    public = next(
        line.split(": ", 1)[1]
        for line in identity.read_text().splitlines()
        if line.startswith("# public key: ")
    )
    return identity, public


def backup(url: str, public_key: str, output: Path) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "BACKUP_DATABASE_URL": url, "AGE_PUBLIC_KEY": public_key}
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(output)],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_dump_is_encrypted_and_restorable(tmp_path: Path) -> None:
    identity, public = keypair(tmp_path)
    output = tmp_path / "wotw.dump.age"

    result = backup(LOCAL_URL, public, output)

    assert result.returncode == 0, result.stderr
    encrypted = output.read_bytes()
    assert encrypted.startswith(b"age-encryption.org/v1\n")
    assert b"PGDMP" not in encrypted[:4096]
    plain = subprocess.run(
        [tool("age"), "--decrypt", "-i", str(identity)],
        input=encrypted,
        capture_output=True,
        check=True,
    ).stdout
    assert plain.startswith(b"PGDMP")
    listing = subprocess.run(
        [tool("pg_restore"), "--list"], input=plain, capture_output=True, check=True
    ).stdout.decode()
    assert "TABLE public email_outbox" in listing
    assert "TABLE public alembic_version" in listing


def test_failed_dump_leaves_no_file_and_hides_the_password(tmp_path: Path) -> None:
    _, public = keypair(tmp_path)
    output = tmp_path / "wotw.dump.age"
    url = "postgresql://app_migrator:wrong-password-xyz@localhost:5432/wotw"

    result = backup(url, public, output)

    assert result.returncode == 1
    assert not output.exists()
    assert "wrong-password-xyz" not in result.stdout + result.stderr
