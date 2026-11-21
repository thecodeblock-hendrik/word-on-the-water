"""vercel.json and the code have to agree: every cron calls a route that exists."""

import json
import re
from pathlib import Path

from fastapi.testclient import TestClient

CONFIG = json.loads((Path(__file__).parent.parent / "vercel.json").read_text())
CRONS = {cron["path"]: cron["schedule"] for cron in CONFIG["crons"]}


def test_every_cron_calls_a_route_that_exists_and_is_protected(client: TestClient) -> None:
    for path in CRONS:
        # 401 without the secret: not 404 (no such route) and not 200 (open to anyone).
        assert client.get(path).status_code == 401, path


def test_retention_is_scheduled_once_a_day() -> None:
    assert "/cron/retention" in CRONS
    # Minute, hour, then every day: the Hobby plan allows no more often than daily.
    assert re.fullmatch(r"\d{1,2} \d{1,2} \* \* \*", CRONS["/cron/retention"])


def test_the_outbox_drain_runs_every_five_minutes() -> None:
    # Needs Pro: Hobby fails the deploy with anything more frequent than daily.
    assert CRONS["/cron/drain-outbox"] == "*/5 * * * *"


def test_kit_is_synced_daily_before_retention_deletes_pending_rows() -> None:
    sync, retention = CRONS["/cron/sync-kit"], CRONS["/cron/retention"]
    assert re.fullmatch(r"\d{1,2} \d{1,2} \* \* \*", sync)
    minute, hour = (int(part) for part in sync.split()[:2])
    retention_minute, retention_hour = (int(part) for part in retention.split()[:2])
    assert (hour, minute) < (retention_hour, retention_minute)
