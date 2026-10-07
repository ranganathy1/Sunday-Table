# Sunday Table — Real-Time Food Ordering

Sunday Table is a full-stack food-ordering and delivery demo with role-based
customer, restaurant, and courier workflows. It includes live order events,
inventory-safe checkout, PostgreSQL persistence, and an AWS EKS learning deployment
path on Amazon EKS.

## Features and stack

- **Frontend:** React 18, Vite, responsive customer and staff workspaces.
- **Backend:** FastAPI, SQLAlchemy async, Alembic migrations, JWT authentication,
  role-checked REST APIs, WebSockets, and Prometheus metrics.
- **Data and events:** PostgreSQL, Redis for cross-pod order events.
- **Production path:** one multi-stage root Docker image, Amazon ECR, Amazon EKS,
  private RDS PostgreSQL, and optional private ElastiCache Redis. GitHub
  Actions runs checks and a separate manually dispatched workflow builds and
  deploys to EKS using GitHub OIDC and short-lived AWS STS credentials.
- **Observability:** Prometheus, Grafana, Alertmanager rules, and EKS
  metrics-server. CloudWatch Observability add-on is disabled in the default
  learning deployment.

## Architecture

### Application

The root [Dockerfile](./Dockerfile) builds the Vite frontend and packages its
static output with the FastAPI application. Uvicorn serves both the website and
API from one container. PostgreSQL stores users, restaurants, menu inventory,
orders, and status events. Redis distributes order events between application
replicas.

### Production delivery

```text
GitHub Actions (lint, tests, builds, Terraform validation)
  -> manually dispatched protected deployment workflow
  -> single application image -> Amazon ECR
  -> schema/seed migration Job -> Amazon EKS rolling deployment
  -> EKS Service (ClusterIP; access through kubectl port-forward)
  -> private RDS PostgreSQL + optional private TLS ElastiCache Redis
```

Terraform provisions the VPC, subnets, routing, EKS, ECR, RDS, Redis, IAM
roles, and an SSM SecureString parameter. Redis is optional and disabled by
default. Prometheus/Grafana run in the EKS cluster; EKS control-plane API logs
are retained in CloudWatch for seven days. CloudWatch Observability is not
enabled by default.

## Repository map

```text
.
├── Dockerfile                  # Single production application image
├── backend/                    # FastAPI app, migrations, seed, tests
├── frontend/                   # React app and development Dockerfile
├── k8s/                        # Application namespace and EKS workloads
├── terraform/                  # AWS network, EKS, ECR, RDS, Redis, IAM
├── monitoring/k8s/             # Prometheus, Grafana, alerts, metrics-server
├── ci/                         # OIDC and deployment scripts
├── scripts/                    # Local and Kubernetes health checks
├── testcases/                  # Deployment acceptance cases
├── Deployment_docs/            # Deployment and operations documentation
└── docs/                       # Application runbook and data model
```

The frontend and backend Dockerfiles are component development images only.
Production builds and deploys **only** the root Dockerfile.

## Run locally

### Fastest start: Docker Compose

Install Docker Desktop with Docker Compose, open a terminal at the repository
root, copy the Compose environment template, replace its sample secret, and
run:

```powershell
Copy-Item .env.example .env
# Edit .env and replace JWT_SECRET with a private random value.
docker compose up --build
```

Open the app at <http://localhost:8080> and the API docs at
<http://localhost:8080/docs>. Compose starts PostgreSQL, Redis, and the
combined app image. Its default JWT secret and demo accounts are for local
development only; do not reuse them in a deployed environment.

### Run the app processes directly

Install Python 3.13+, Node.js 22+, npm, and PostgreSQL. Start PostgreSQL,
create the `food_ordering` database, and start Redis if you want to test live
updates between app instances. The backend has a SQLite demo fallback when
PostgreSQL is unavailable, but Alembic migrations and the full seed data below
require PostgreSQL; Docker Compose is the simplest option if you do not
already have PostgreSQL installed.

In PowerShell, copy the example backend settings and replace the sample
`JWT_SECRET` with a private random value:

```powershell
Copy-Item backend\.env.example backend\.env
```

Then install the backend and start it:

```powershell
Set-Location backend
.\.venv313\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv313\Scripts\alembic.exe upgrade head
.\.venv313\Scripts\python.exe scripts\bootstrap_db.py
.\.venv313\Scripts\python.exe -m uvicorn app.main:app --reload
```

If you do not already have a virtual environment at `backend\.venv313`, create
one with `py -3.13 -m venv .venv313` before the install command. In another
terminal, start the frontend:

```powershell
Set-Location frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

The Vite site is at <http://localhost:5173>; it proxies API and WebSocket
requests to `http://localhost:8000`. The API docs are at
<http://localhost:8000/docs>.

## Where to add code and links

- **Page layout and current role-based screens:** `frontend/src/App.jsx`.
  Reusable UI belongs in `frontend/src/components/`; shared styling belongs in
  `frontend/src/styles/global.css`.
- **Frontend API calls:** add or update `frontend/src/api/client.js`. The
  frontend API prefix is set by `VITE_API_BASE_URL` in
  `frontend/.env.local` (copy `frontend/.env.example`); the Vite dev-server
  backend target is `API_PROXY_TARGET` in that same file.
- **Live order updates:** the WebSocket connection is in
  `frontend/src/hooks/useOrderSocket.js`; the backend endpoint is
  `/ws/orders/{order_id}`.
- **Backend endpoints:** add a router under `backend/app/api/`, request and
  response types under `backend/app/schemas/`, and business logic under
  `backend/app/services/`. Include any new router in
  `backend/app/main.py`. The API prefix defaults to `/api/v1`, so the router
  path `/restaurants` is available at `/api/v1/restaurants`.
- **Database changes:** update `backend/app/models.py`, then add an Alembic
  migration under `backend/migrations/versions/`. Keep demo/bootstrap data in
  `backend/scripts/` and SQL seed changes in `backend/seed.sql`.
- **Environment settings:** backend values belong in `backend/.env` for local
  development; frontend-exposed values must use the `VITE_` prefix and belong
  in `frontend/.env.local`. Add only safe placeholders to the corresponding
  `.env.example` files. Never put secrets in frontend variables.
- **Browser title and description:** `frontend/index.html`. For the combined
  production image, rebuild the root Docker image after frontend changes.
- **Deployment:** infrastructure is in `terraform/`, application manifests
  are in `k8s/`, monitoring manifests are in `monitoring/k8s/`, and deployment
  instructions start at `Deployment_docs/README.md`.

Useful local links: the frontend dev server is
<http://localhost:5173>, the backend OpenAPI page is
<http://localhost:8000/docs>, and the health/readiness checks are
<http://localhost:8000/health> and <http://localhost:8000/ready>. In Docker
Compose, use port `8080` instead of `8000`.

## Suggested next steps

1. Start the app with Docker Compose and verify that login, browsing
   restaurants, ordering, and order-status updates work.
2. Replace the demo login data with real registration/password-reset flows;
   remove demo credentials before exposing the application publicly.
3. Split the growing `frontend/src/App.jsx` into role-based screens and add
   frontend unit/component tests as those features are introduced.
4. Add tests for each new backend endpoint and any database migrations.
5. Configure production secrets and domains using the deployment guides; do
   not expose the development `.env` files or local demo credentials.

## AWS learning deployment

The implemented learning deployment is **GitHub Actions → ECR → EKS → private
RDS** in AWS region `eu-north-1` for account `680476617223`, using cluster
`food-ordering-learning-eks`. Redis is optional and currently disabled by
default. It creates no public application load balancer. Start with
[Deployment_docs/README.md](./Deployment_docs/README.md), then follow:

- [Architecture](./Deployment_docs/ARCHITECTURE.md)
- [Docker](./Deployment_docs/DOCKER.md)
- [Kubernetes and EKS](./Deployment_docs/KUBERNETES.md)
- [Terraform](./Deployment_docs/TERRAFORM.md)
- [AWS](./Deployment_docs/AWS.md)
- [GitHub Actions](./Deployment_docs/GITHUB_ACTIONS.md)
- [Monitoring](./Deployment_docs/MONITORING.md)
- [Security](./Deployment_docs/SECURITY.md)
- [Troubleshooting](./Deployment_docs/TROUBLESHOOTING.md)

The current temporary learning deployment uses
`cluster_public_access_cidrs = ["0.0.0.0/0"]` so GitHub-hosted `ubuntu-latest`
runners can reach the EKS API. This is a temporary learning configuration, not a
recommended production pattern. The app is reached with `kubectl port-forward`;
the database and optional Redis endpoints remain private. No AWS keys or
application credentials belong in source control. AWS services may incur
charges; see
[Deployment_docs/COST_AND_FREE_TIER.md](./Deployment_docs/COST_AND_FREE_TIER.md).

## Checks

```powershell
Set-Location backend
.\.venv313\Scripts\python.exe -m pytest
.\.venv313\Scripts\ruff.exe check app scripts tests

Set-Location ..\frontend
npm ci
npm run lint
npm run build
```

See [testcases/README.md](./testcases/README.md) for deployment acceptance
scenarios and health-check commands.
