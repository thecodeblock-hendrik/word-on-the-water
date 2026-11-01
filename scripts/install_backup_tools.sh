#!/usr/bin/env bash
# Install pg_dump/pg_restore 18 (from the PostgreSQL apt repository; Ubuntu's own client is
# older than the Neon server, and pg_dump refuses newer servers) and age, on a GitHub runner.
# Used by backup.yml and by the API job in ci.yml (tests/integration/test_backup_db.py).
set -euo pipefail

PG_MAJOR=18

sudo apt-get update -qq
sudo apt-get install -y -qq --no-install-recommends postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt-get install -y -qq --no-install-recommends "postgresql-client-${PG_MAJOR}" age

bin="/usr/lib/postgresql/${PG_MAJOR}/bin"
# Put version 18 first for later steps; the runner image also ships an older client.
if [ -n "${GITHUB_PATH:-}" ]; then
  echo "$bin" >> "$GITHUB_PATH"
fi
"$bin/pg_dump" --version
age --version
