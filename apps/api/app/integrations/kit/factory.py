"""Build the Kit sign-up job from settings, or None when Kit is not configured."""

from app.core.config import Settings
from app.integrations.kit.client import KitClient
from app.services.kit_jobs import KitSubscribeJob


def get_kit_client(settings: Settings) -> KitClient | None:
    if settings.kit_api_key is None or settings.kit_form_id is None:
        return None
    return KitClient(settings.kit_api_key.get_secret_value(), settings.kit_form_id)


def get_kit_job(settings: Settings) -> KitSubscribeJob | None:
    client = get_kit_client(settings)
    return None if client is None else KitSubscribeJob(client, settings.site_url)
