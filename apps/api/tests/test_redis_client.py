from types import SimpleNamespace

from pydantic import SecretStr

from app.core.rate_limit import get_redis


async def test_the_client_has_both_a_connect_and_a_read_timeout() -> None:
    settings = SimpleNamespace(redis_url=SecretStr("redis://localhost:6379/0"))
    clients = get_redis(settings)  # type: ignore[arg-type]
    redis = await anext(clients)
    kwargs = redis.connection_pool.connection_kwargs
    assert kwargs["socket_connect_timeout"] == 2
    assert kwargs["socket_timeout"] == 2
    assert await anext(clients, None) is None  # runs the dependency's cleanup
