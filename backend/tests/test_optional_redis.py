import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi import FastAPI

from app import main


def test_lifespan_skips_redis_when_no_url_is_configured(monkeypatch) -> None:
    broadcaster = SimpleNamespace(shutdown=AsyncMock())
    broadcaster_factory = Mock(return_value=broadcaster)
    redis_factory = Mock()
    monkeypatch.setattr(main, "get_settings", lambda: SimpleNamespace(redis_url="", require_redis=False))
    monkeypatch.setattr(main, "Redis", SimpleNamespace(from_url=redis_factory))
    monkeypatch.setattr(main, "build_broadcaster", broadcaster_factory)
    monkeypatch.setattr(main, "init_sqlite_demo_data", AsyncMock())
    monkeypatch.setattr(main, "engine", SimpleNamespace(dispose=AsyncMock()))

    async def run_lifespan() -> None:
        app = FastAPI()
        async with main.lifespan(app):
            assert app.state.redis is None

    asyncio.run(run_lifespan())

    redis_factory.assert_not_called()
    assert broadcaster_factory.call_args.args[1] is None
    broadcaster.shutdown.assert_awaited_once()
