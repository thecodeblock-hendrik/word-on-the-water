import pytest

from app.core.config import Settings
from app.integrations.email.console import ConsoleEmailProvider
from app.integrations.email.factory import get_email_provider
from app.integrations.email.postmark import PostmarkEmailProvider
from app.integrations.email.smtp import SmtpEmailProvider


def test_defaults_to_smtp_for_local_mailpit() -> None:
    assert isinstance(get_email_provider(Settings(_env_file=None)), SmtpEmailProvider)


def test_console_allowed_locally(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_PROVIDER", "console")
    assert isinstance(get_email_provider(Settings(_env_file=None)), ConsoleEmailProvider)


def test_console_refused_outside_local(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_PROVIDER", "console")
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(RuntimeError):
        get_email_provider(Settings(_env_file=None))


def test_postmark_needs_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_PROVIDER", "postmark")
    with pytest.raises(RuntimeError):
        get_email_provider(Settings(_env_file=None))
    monkeypatch.setenv("POSTMARK_SERVER_TOKEN", "tok")
    assert isinstance(get_email_provider(Settings(_env_file=None)), PostmarkEmailProvider)
