# Monitoring and observability

## In-cluster monitoring

The deployment workflow applies `monitoring/k8s/monitoring.yaml` after the
initial namespace and RBAC bootstrap. Prometheus and Grafana remain
ClusterIP-only; access them with `kubectl port-forward`:

```powershell
kubectl port-forward -n monitoring service/grafana 3000:3000
kubectl port-forward -n monitoring service/prometheus 9090:9090
```

Open Grafana at `http://localhost:3000` and Prometheus at
`http://localhost:9090`. Grafana's username is `admin`; retrieve its generated
password from the `grafana-admin` Kubernetes Secret using an authorized
cluster context.

The manifests deploy:

- **Prometheus:** scrapes the application `/metrics` endpoint and
  kube-state-metrics. Retention is seven days on ephemeral storage; metrics
  are lost when its pod is replaced.
- **Grafana:** provisions Prometheus as a datasource and a dashboard for
  request rate, p95 latency, 5xx responses, container CPU/memory, and ready
  replicas. Its data storage is ephemeral.
- **Alertmanager:** groups/routs alert rules. Configure a receiver before
  relying on notifications; the sample receiver is intentionally a no-op.
- **kube-state-metrics:** exports Kubernetes object state.

The FastAPI middleware exports `food_ordering_http_requests_total` with method,
route-template, and status labels, plus
`food_ordering_http_request_duration_seconds`. In production `/metrics`
requires a generated bearer token mounted only into the runtime app and
Prometheus.

`monitoring/k8s/rbac.yaml` includes cluster-scoped permissions and must be
applied once by an administrator using `scripts/bootstrap-kubernetes.ps1`.
The regular deploy role is namespace-scoped and cannot manage these roles.
The standalone `metrics-server.yaml` is not installed by default because the
learning setup does not enable an HPA.

## CloudWatch

Terraform creates the EKS control-plane API log group with seven-day
retention. Log ingestion and storage may still incur charges. The CloudWatch
Observability add-on and RDS log exports are disabled; enabling additional
logging should be a deliberate cost decision.

This stack uses only in-cluster Prometheus/Grafana and AWS CloudWatch; it does
not configure a paid third-party monitoring service.
