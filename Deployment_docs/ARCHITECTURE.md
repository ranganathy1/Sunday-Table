# Architecture

## Existing application

The application is a React/Vite single-page ordering site backed by FastAPI.
Customers browse restaurants and order food; restaurant users advance order
state and dispatch; delivery partners see assigned work and record delivery.
PostgreSQL is the system of record. Alembic manages schema changes. Redis is
optional and disabled in the default learning deployment; it can be enabled
later for multi-replica event fan-out.

The root multi-stage `Dockerfile` compiles the Vite site and installs the
backend in one runtime image. FastAPI serves the static frontend, `/api/v1`,
WebSockets, health endpoints, and Prometheus metrics on port 8000. The
application listens on port 8000 in the runtime container.

## Learning deployment traffic and data

```text
Browser --kubectl port-forward--> EKS ClusterIP Service -> API/frontend pod
                                                       |-> private RDS PostgreSQL
                                                       `-> optional private TLS Redis (disabled by default)

GitHub Actions -> lint/tests/build/Terraform validation
Manual workflow -> GitHub OIDC -> ECR -> EKS
Terraform -------------------------------------> AWS infrastructure
Prometheus -> API metrics + Kubernetes state
Grafana -> Prometheus; Alertmanager handles alert grouping
CloudWatch -> seven-day EKS API control-plane logs
```

RDS and optional ElastiCache run in private subnets. The database security
group permits PostgreSQL only from the EKS cluster security group. Redis uses
TLS and an auth token with the same source restriction when enabled. Worker
nodes use public subnets for outbound image pulls through the Internet
Gateway; this avoids NAT Gateway charges but public IPv4/data-transfer charges
may apply. App access stays private through `kubectl port-forward`; no
LoadBalancer Service or Ingress is created.

## Deployment order

An administrator bootstraps namespaces and cluster-scoped monitoring RBAC
once. A manually dispatched GitHub Actions workflow then builds and pushes the
image, fetches credentials from SSM, runs the migration Job, and applies the
app/monitoring workloads. Terraform infrastructure is reviewed and applied
separately by the operator; neither workflow runs Terraform apply.
