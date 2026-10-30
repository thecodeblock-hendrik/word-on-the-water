"""FastAPI application factory."""

from fastapi import Depends, FastAPI

from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import register_middleware
from app.core.security import require_service_token
from app.routers import cron, health, v1


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    app = FastAPI(
        title="Word on the Water API",
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )
    register_middleware(app)
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(cron.router)
    app.include_router(v1.router, prefix="/v1", dependencies=[Depends(require_service_token)])
    return app


app = create_app()
