# Application runbook

## Demo accounts

All demo accounts use the password `portfolio123`.

| Role | Email accounts |
| --- | --- |
| Customer | `customer@example.com`, `customer2@example.com`, `customer3@example.com`, `customer4@example.com` |
| Restaurant | `restaurant@example.com`, `restaurant2@example.com`, `restaurant3@example.com`, `restaurant4@example.com`, `restaurant5@example.com` |
| Delivery partner | `delivery@example.com`, `delivery2@example.com`, `delivery3@example.com`, `delivery4@example.com`, `delivery5@example.com` |

The seed adds four restaurants beyond Copper Kadhai, twelve dishes, and four
additional delivery partners. Re-running the bootstrap is safe and preserves
existing orders and users. These demo identities are not for production use.

## Local run without Docker (Windows)

Install PostgreSQL and Redis as local services. Create the `food_ordering`
database and configure `backend\.env` with local `DATABASE_URL`,
`REDIS_URL`, and a private `JWT_SECRET` of at least 32 characters. Do not
commit the file.

```powershell
Set-Location backend
.\.venv313\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv313\Scripts\alembic.exe upgrade head
.\.venv313\Scripts\python.exe scripts\bootstrap_db.py
.\.venv313\Scripts\python.exe -m uvicorn app.main:app --reload
```

In another terminal, run the Vite frontend:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Vite proxies the API and WebSocket endpoints to `http://localhost:8000`.

## Containerized local stack

The local Compose setup builds the same combined image used in production,
with developer-only local PostgreSQL and Redis containers:

```powershell
$env:JWT_SECRET = "replace-with-a-private-32-character-local-secret"
docker compose up --build
```

Browse `http://localhost:8080`. The app performs Alembic migration and
idempotent demo seeding at startup. Health endpoints are `/health` (process
liveness) and `/ready` (PostgreSQL and required Redis readiness). In production,
`/metrics` requires the Prometheus bearer token.
The frontend Vite development proxy is only used when running `npm run dev`.

See the [deployment guide](../Deployment_docs/README.md) for the single EKS
production architecture, Terraform setup, GitHub Actions variables, operations, and
monitoring.
