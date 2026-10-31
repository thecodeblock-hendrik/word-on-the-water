"""Consistent error responses: {"error": {"code", "message"}} with no stack traces."""

import traceback
from pathlib import Path

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = structlog.get_logger()


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code, content={"error": {"code": code, "message": message}}
    )


async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = {401: "unauthorized", 404: "not_found", 405: "method_not_allowed"}.get(
        exc.status_code, "http_error"
    )
    return error_response(exc.status_code, code, "Request failed.")


async def _validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
    return error_response(422, "validation_error", "Invalid request.")


async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    # Type and location only: exception messages can contain hosts, credentials or user data.
    frame = traceback.extract_tb(exc.__traceback__)[-1]
    where = f"{Path(frame.filename).name}:{frame.lineno}"
    log.error("unhandled_error", error=type(exc).__name__, path=request.url.path, where=where)
    return error_response(500, "internal_error", "Something went wrong.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_error)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_error)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled)
