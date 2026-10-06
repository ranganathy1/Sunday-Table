from types import SimpleNamespace

from app import db


def test_postgres_url_is_preserved_when_sqlite_fallback_is_disabled(monkeypatch) -> None:
    monkeypatch.setattr(db, "settings", SimpleNamespace(
        database_url="postgresql+asyncpg://user:password@database.example:5432/food_ordering",
        allow_sqlite_fallback=False,
    ))
    monkeypatch.setattr(db, "_is_port_open", lambda host, port: False)

    assert db._resolve_database_url() == (
        "postgresql+asyncpg://user:password@database.example:5432/food_ordering",
        False,
    )


def test_sqlite_fallback_remains_available_for_local_demo(monkeypatch) -> None:
    monkeypatch.setattr(db, "settings", SimpleNamespace(
        database_url="postgresql+asyncpg://user:password@database.example:5432/food_ordering",
        allow_sqlite_fallback=True,
    ))
    monkeypatch.setattr(db, "_is_port_open", lambda host, port: False)

    assert db._resolve_database_url() == ("sqlite+aiosqlite:///./food_ordering_demo.db", True)
