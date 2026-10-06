import time

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.types import ASGIApp, Message, Receive, Scope, Send


HTTP_REQUESTS = Counter(
    "food_ordering_http_requests_total",
    "Total HTTP requests.",
    ("method", "route", "status"),
)
HTTP_REQUEST_DURATION = Histogram(
    "food_ordering_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ("method", "route"),
)


class MetricsMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") == "/metrics":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "UNKNOWN")
        route = "unmatched"
        status_code = "500"
        start_time = time.perf_counter()

        async def instrumented_send(message: Message) -> None:
            nonlocal route, status_code, start_time
            if message["type"] == "http.response.start":
                endpoint = scope.get("route")
                route = getattr(endpoint, "path", "unmatched")
                status_code = str(message["status"])
            elif message["type"] == "http.response.body" and not message.get("more_body", False):
                HTTP_REQUESTS.labels(method, route, status_code).inc()
                HTTP_REQUEST_DURATION.labels(method, route).observe(time.perf_counter() - start_time)
            await send(message)

        await self.app(scope, receive, instrumented_send)


def metrics_response():
    from starlette.responses import Response

    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
