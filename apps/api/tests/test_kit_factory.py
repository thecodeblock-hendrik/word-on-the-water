import pytest

from app.core.config import Settings
from app.integrations.kit.factory import get_kit_job
from app.services.kit_jobs import KitSubscribeJob


def settings(monkeypatch: pytest.MonkeyPatch, **env: str) -> Settings:
    for name in ("KIT_API_KEY", "KIT_FORM_ID"):
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return Settings(_env_file=None)


def test_with_a_key_and_a_form_there_is_a_job(monkeypatch: pytest.MonkeyPatch) -> None:
    assert isinstance(
        get_kit_job(settings(monkeypatch, KIT_API_KEY="k", KIT_FORM_ID="99")), KitSubscribeJob
    )


@pytest.mark.parametrize("env", [{}, {"KIT_API_KEY": "k"}, {"KIT_FORM_ID": "99"}])
def test_without_both_there_is_no_job_so_the_drain_waits(
    monkeypatch: pytest.MonkeyPatch, env: dict[str, str]
) -> None:
    assert get_kit_job(settings(monkeypatch, **env)) is None
