import asyncio
import os
import re

import asyncpg

from app.core.config import get_settings


IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def validate_identifier(value: str, name: str) -> str:
    if not IDENTIFIER.fullmatch(value):
        raise ValueError(f"{name} must be a valid PostgreSQL identifier")
    return value


async def main() -> None:
    settings = get_settings()
    dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    username = validate_identifier(os.environ["APP_DB_USERNAME"], "APP_DB_USERNAME")
    password = os.environ["APP_DB_PASSWORD"]
    if not password:
        raise ValueError("APP_DB_PASSWORD must not be empty")

    connection = await asyncpg.connect(dsn)
    try:
        exists = await connection.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", username)
        password_literal = "'" + password.replace("'", "''") + "'"
        if exists:
            await connection.execute(f'ALTER ROLE "{username}" WITH LOGIN PASSWORD {password_literal}')
        else:
            await connection.execute(f'CREATE ROLE "{username}" WITH LOGIN PASSWORD {password_literal}')

        database = validate_identifier(await connection.fetchval("SELECT current_database()"), "database name")
        await connection.execute(f'GRANT CONNECT ON DATABASE "{database}" TO "{username}"')
        await connection.execute(f'GRANT USAGE ON SCHEMA public TO "{username}"')
        await connection.execute(
            f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{username}"'
        )
        await connection.execute(f'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "{username}"')
        owner = validate_identifier(await connection.fetchval("SELECT current_user"), "database owner")
        await connection.execute(
            f'ALTER DEFAULT PRIVILEGES FOR ROLE "{owner}" IN SCHEMA public '
            f'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "{username}"'
        )
        await connection.execute(
            f'ALTER DEFAULT PRIVILEGES FOR ROLE "{owner}" IN SCHEMA public '
            f'GRANT USAGE, SELECT ON SEQUENCES TO "{username}"'
        )
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
