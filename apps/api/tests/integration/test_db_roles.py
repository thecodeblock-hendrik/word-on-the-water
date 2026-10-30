import pytest
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import create_async_engine

from tests.integration.conftest import RUNTIME_URL


async def test_runtime_role_can_dml_but_not_ddl() -> None:
    engine = create_async_engine(RUNTIME_URL)
    async with engine.begin() as conn:
        await conn.execute(text("SELECT count(*) FROM subscribers"))
        await conn.execute(text("DELETE FROM email_outbox WHERE false"))
    for ddl in ("CREATE TABLE evil (id int)", "DROP TABLE subscribers"):
        with pytest.raises(ProgrammingError):
            async with engine.begin() as conn:
                await conn.execute(text(ddl))
    await engine.dispose()
