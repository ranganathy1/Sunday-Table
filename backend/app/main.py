import contextlib
from collections.abc import AsyncIterator
import hmac
import logging
from pathlib import Path
import uuid

import jwt
from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.staticfiles import StaticFiles

from app.api import auth, delivery, orders, restaurants
from app.core.config import get_settings
from app.core.security import decode_token
from app.db import SessionLocal, engine, init_sqlite_demo_data
from app.models import Order
from app.observability import MetricsMiddleware, metrics_response
from app.schemas.auth import TokenPayload
from app.services.order_events import build_broadcaster
from app.services.orders import ensure_order_access
from app.websocket.manager import OrderConnectionManager


logger = logging.getLogger(__name__)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    redis: Redis | None = None
    candidate: Redis | None = None
    try:
        candidate = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        await candidate.ping()
        redis = candidate
    except (RedisError, OSError, ValueError):
        if settings.require_redis:
            logger.error("Required Redis is unavailable; readiness checks will fail", exc_info=True)
        else:
            logger.warning("Redis is unavailable; cross-instance live updates are disabled", exc_info=True)
        if candidate is not None:
            await candidate.aclose()
        redis = None

    connection_manager = OrderConnectionManager()
    app.state.redis = redis
    app.state.connection_manager = connection_manager
    app.state.order_broadcaster = build_broadcaster(connection_manager, redis)
    await init_sqlite_demo_data()
    yield
    await app.state.order_broadcaster.shutdown()
    if redis is not None:
        await redis.close()
    await engine.dispose()


def decode_ws_token(token: str) -> TokenPayload:
    try:
        return decode_token(token)
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc


app = FastAPI(title=get_settings().app_name, lifespan=lifespan)
app.add_middleware(MetricsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix=get_settings().api_prefix)
app.include_router(delivery.router, prefix=get_settings().api_prefix)
app.include_router(restaurants.router, prefix=get_settings().api_prefix)
app.include_router(orders.router, prefix=get_settings().api_prefix)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
async def readiness_check(request: Request) -> dict[str, str]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database is not ready") from exc
    if get_settings().require_redis:
        try:
            await request.app.state.redis.ping()
        except (RedisError, OSError, AttributeError) as exc:
            raise HTTPException(status_code=503, detail="Redis is not ready") from exc
    return {"status": "ready"}


@app.get("/metrics", include_in_schema=False)
async def metrics(request: Request) -> Response:
    expected_token = get_settings().metrics_auth_token
    if expected_token and not hmac.compare_digest(
        request.headers.get("authorization", ""),
        f"Bearer {expected_token}",
    ):
        raise HTTPException(status_code=401, detail="Metrics authentication required")
    return metrics_response()


@app.websocket("/ws/orders/{order_id}")
async def order_updates(
    websocket: WebSocket,
    order_id: uuid.UUID,
    token: str = Query(...),
) -> None:
    user = decode_ws_token(token)
    async with SessionLocal() as session:
        order = await session.get(Order, order_id)
        if order is None:
            await websocket.close(code=4404)
            return
        try:
            await ensure_order_access(session, user, order)
        except HTTPException:
            await websocket.close(code=4403)
            return

    manager = websocket.app.state.connection_manager
    await manager.connect(order_id, websocket)
    await websocket.send_json(
        {
            "type": "connection_ready",
            "order_id": str(order_id),
            "viewer_role": user.role.value,
        }
    )
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(order_id, websocket)


FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend_dist"
FRONTEND_ASSETS = FRONTEND_DIST / "assets"
if FRONTEND_ASSETS.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="frontend-assets")


@app.get("/{path:path}", include_in_schema=False)
async def frontend_app(path: str) -> Response:
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.is_file() or path.startswith(("api/", "ws/")):
        raise HTTPException(status_code=404, detail="Not found")
    requested_file = (FRONTEND_DIST / path).resolve()
    try:
        requested_file.relative_to(FRONTEND_DIST.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found") from None
    if requested_file.is_file():
        return FileResponse(requested_file)
    return FileResponse(index_file)
