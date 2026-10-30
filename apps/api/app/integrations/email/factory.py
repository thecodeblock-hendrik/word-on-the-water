from app.core.config import Settings
from app.integrations.email.base import EmailProvider
from app.integrations.email.console import ConsoleEmailProvider
from app.integrations.email.postmark import PostmarkEmailProvider
from app.integrations.email.smtp import SmtpEmailProvider


def get_email_provider(settings: Settings) -> EmailProvider:
    match settings.email_provider:
        case "console":
            if settings.environment != "local":
                raise RuntimeError("The console email provider is only allowed locally")
            return ConsoleEmailProvider()
        case "postmark":
            if settings.postmark_server_token is None:
                raise RuntimeError("POSTMARK_SERVER_TOKEN is required for the postmark provider")
            token = settings.postmark_server_token.get_secret_value()
            return PostmarkEmailProvider(token, settings.email_from)
        case "smtp":
            return SmtpEmailProvider(settings.smtp_host, settings.smtp_port, settings.email_from)
