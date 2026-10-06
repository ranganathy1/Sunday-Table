import asyncio
from types import SimpleNamespace

from app.observability import MetricsMiddleware, metrics_response


def test_http_metrics_use_route_template_and_response_status() -> None:
    async def run_request() -> None:
        async def app(scope, receive, send) -> None:
            scope["route"] = SimpleNamespace(path="/health")
            await send({"type": "http.response.start", "status": 204, "headers": []})
            await send({"type": "http.response.body", "body": b"", "more_body": False})

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        sent_messages = []

        async def send(message) -> None:
            sent_messages.append(message)

        scope = {"type": "http", "method": "GET", "path": "/health"}
        await MetricsMiddleware(app)(scope, receive, send)
        assert sent_messages[0]["status"] == 204

    asyncio.run(run_request())
    output = metrics_response().body.decode()
    assert 'food_ordering_http_requests_total{method="GET",route="/health",status="204"} 1.0' in output
    assert 'food_ordering_http_request_duration_seconds_count{method="GET",route="/health"} 1.0' in output
