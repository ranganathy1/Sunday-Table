# Docker

## Image layout

The root `Dockerfile` is the **only production image**:

1. Node 22 installs the lockfile dependencies and builds `frontend/dist`.
2. Python 3.13 installs the FastAPI package in a builder stage.
3. A slim Python runtime copies the backend, Alembic migrations, seed scripts,
   and compiled frontend. It runs as a non-root user and exposes port 8000.

The backend and frontend Dockerfiles are component images for focused local
development only. Production and the local full-stack Compose stack build the
root Dockerfile. There is no separate production Compose deployment.

## Build and run the application image

Build from the repository root so both source trees are in the Docker context:

```powershell
docker build --pull -t sunday-table:local .
```

The combined image expects PostgreSQL and a private JWT secret; Redis can be
disabled when running one app replica. For a complete local container stack,
run:

```powershell
$env:JWT_SECRET = "replace-with-a-private-32-character-local-secret"
docker compose up --build
```

Compose starts local Postgres/Redis, applies migrations and idempotent seed
data, then starts the combined image. Browse `http://localhost:8080`.

The image disables SQLite fallback so a missing production database cannot
silently create a local demo database. `/health` is the liveness check;
`/ready` checks PostgreSQL and checks Redis only when configured as required.
The UI is served by FastAPI, so API, WebSocket, and frontend use the same
origin. `/metrics` requires the configured Prometheus bearer token when one
is set.

## Image publishing

The manually dispatched deployment workflow tags each image with the
immutable Git commit SHA. ECR scans images on push and a lifecycle policy
keeps the newest five. Terraform is configured to delete remaining images
when it destroys the repository. Do not use a mutable `latest` tag for a
rollout.

The `.dockerignore` prevents local virtual environments, dependency folders,
environment files, Terraform state, and generated frontend bundles from
entering the build context.
