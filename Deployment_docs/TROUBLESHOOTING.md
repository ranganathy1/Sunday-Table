# Troubleshooting

## Terraform and AWS

- **EKS public API timeout:** the current learning deployment uses
  `cluster_public_access_cidrs = ["0.0.0.0/0"]` so GitHub-hosted runners can
  access the API. Tighten this for production or for a restricted private
  deployment pattern.
- **OIDC assume-role denied:** check the exact GitHub repository and protected
  environment name in Terraform, GitHub environment protection, job
  `id-token: write` permission, and role ARN.
- **ECR push denied:** verify `ECR_REPOSITORY_URI`, AWS region, OIDC role
  policy, and the repository output.
- **Image pull failures:** worker nodes need public-subnet egress through the
  Internet Gateway and the EKS node role needs ECR read permissions. This
  design has no NAT Gateway.
- **RDS/Redis connection failure:** check endpoint DNS, private subnet group,
  EKS cluster security-group ingress, and generated SSM configuration. Redis
  is disabled unless `enable_redis=true`.
- **Terraform destroy blocked:** check for overrides such as
  `rds_deletion_protection=true`. Defaults skip the final snapshot and allow
  direct destroy. See [Terraform](TERRAFORM.md).

## Kubernetes and migration

```powershell
kubectl get pods -A
kubectl describe pod -n food-ordering POD_NAME
kubectl logs -n food-ordering job/food-ordering-migrate
kubectl logs -n food-ordering deployment/food-ordering
kubectl get events -n food-ordering --sort-by=.lastTimestamp
```

- **Migration Job fails:** inspect logs and Events for missing Secrets, bad
  database URL, network/security-group blocks, or migration errors.
- **Pods fail readiness:** `/ready` checks PostgreSQL and checks Redis only
  when configured as required. `/health` only proves the process responds.
- **Deploy workflow cannot reach EKS:** verify the current GitHub-hosted
  runner can reach the EKS API and that initial namespace/RBAC bootstrap was
  performed. In the current learning deployment, the public API allow-list is
  intentionally broad to accommodate runner egress.
- **Browser app is unavailable:** run
  `kubectl port-forward -n food-ordering service/food-ordering 8000:8000`;
  no public LoadBalancer is provisioned.

## Monitoring and local checks

```powershell
.\scripts\check-app-health.ps1 -BaseUrl http://localhost:8000
.\scripts\check-kubernetes-health.ps1
kubectl get pods -n monitoring
kubectl logs -n monitoring deployment/prometheus
kubectl logs -n monitoring deployment/grafana
```

- **No Prometheus target:** verify app Service DNS/port 8000, metrics Secret,
  `/metrics`, Prometheus logs, and the one-time monitoring RBAC bootstrap.
- **Grafana login fails:** retrieve the `grafana-admin` Secret with an
  authorized Kubernetes identity; its password is generated in SSM, not a
  GitHub Actions variable.
- **WebSocket updates are not shared between pods:** Redis is off by default.
  Enable the optional single-node ElastiCache configuration only after
  reviewing its cost and setting `REQUIRE_REDIS` consistently.
