# Deployment test cases

These checks cover the application and the single-node EKS learning
deployment. Automated application cases live in `backend/tests`; the GitHub
Actions validation workflow runs them on pushes and pull requests.

| ID | Scenario | Expected result |
| --- | --- | --- |
| APP-01 | Build the root `Dockerfile` and start it with PostgreSQL and Redis | The React site, `/api/v1` API, WebSocket endpoint, `/health`, `/ready`, and `/metrics` are served from one image. |
| APP-02 | Stop PostgreSQL while the application is running | `/health` remains live and `/ready` returns HTTP 503; the app does not silently fall back to SQLite. |
| APP-03 | Make API requests and scrape `/metrics` with the bearer token | Request count, status and route-template labels, and duration histogram are present; unauthenticated production scrapes return 401. |
| EKS-01 | Manually dispatch a new immutable commit image deployment | Migration succeeds, then the single application replica becomes ready. |
| EKS-02 | Apply a migration that fails | The migration Job fails; the deploy script stops before updating the application Deployment. |
| EKS-03 | Attempt to reach RDS from outside the VPC | The connection is blocked; the RDS instance has no public address. |
| EKS-04 | Query Prometheus and Grafana through port-forward | API request rate, 5xx rate, p95 latency, pod readiness, CPU, and memory panels load. |
| CI-01 | Run the GitHub Actions workflow on a push or pull request | Backend lint/tests, frontend lint/build, and Terraform validation complete successfully without AWS provisioning. |

Run the local application checks:

```powershell
docker compose up --build
Invoke-WebRequest http://localhost:8080/health
Invoke-WebRequest http://localhost:8080/ready
Invoke-WebRequest http://localhost:8080/metrics
```

Run the backend automated cases:

```powershell
Set-Location backend
.\.venv313\Scripts\python.exe -m pytest
```
