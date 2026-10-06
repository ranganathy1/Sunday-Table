import base64
import json
import sys
from pathlib import Path


def encode(data: dict[str, str]) -> dict[str, str]:
    return {key: base64.b64encode(value.encode()).decode() for key, value in data.items()}


def main() -> None:
    secret = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    resources = [
        {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": "food-ordering-runtime", "namespace": "food-ordering"},
            "type": "Opaque",
            "data": encode(
                {
                    key: secret[key]
                    for key in ("DATABASE_URL", "REDIS_URL", "JWT_SECRET", "METRICS_AUTH_TOKEN")
                }
            ),
        },
        {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": "food-ordering-migration", "namespace": "food-ordering"},
            "type": "Opaque",
            "data": encode(
                {
                    key: secret[key]
                    for key in ("DB_ADMIN_URL", "APP_DB_USERNAME", "APP_DB_PASSWORD")
                }
            ),
        },
        {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": "prometheus-metrics", "namespace": "monitoring"},
            "type": "Opaque",
            "data": encode({"token": secret["METRICS_AUTH_TOKEN"]}),
        },
        {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": "grafana-admin", "namespace": "monitoring"},
            "type": "Opaque",
            "data": encode({"password": secret["GRAFANA_ADMIN_PASSWORD"]}),
        },
    ]
    for resource in resources:
        print("---")
        print(json.dumps(resource))


if __name__ == "__main__":
    main()
