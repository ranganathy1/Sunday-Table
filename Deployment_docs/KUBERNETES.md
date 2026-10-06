# Kubernetes and EKS

## Manifests

`k8s/` contains the application Namespace, ConfigMap, single-replica
Deployment, ClusterIP Service, and migration Job. There is no default HPA or
public LoadBalancer Service. The application has CPU/memory requests/limits,
startup/liveness/readiness probes, non-root execution, a read-only root
filesystem, and dropped Linux capabilities.

The migration Job uses the database admin secret to run Alembic, seed the
demo data, and create/update the lower-privilege application PostgreSQL role.
Application pods receive only the app database URL, optional Redis URL, and
JWT/metrics credentials. The admin URL is not mounted into application pods.

`monitoring/k8s/monitoring.yaml` deploys Prometheus, Grafana, Alertmanager,
and kube-state-metrics. They use ClusterIP services and are accessed with
port-forward. Cluster-scoped RBAC is separated into
`monitoring/k8s/rbac.yaml` and needs administrator access only for initial
bootstrap.

## Configure kubectl and bootstrap

After Terraform has been applied by an operator, get the cluster name from
Terraform output and configure access:

```powershell
$ClusterName = terraform -chdir=terraform output -raw eks_cluster_name
aws eks update-kubeconfig --region us-east-1 --name $ClusterName
kubectl get nodes
```

On the first setup, use an administrator context once to create both
namespaces and cluster-scoped monitoring RBAC:

```powershell
.\scripts\bootstrap-kubernetes.ps1
```

## Deploy and access

Configure the protected GitHub `aws-learning` environment and fixed-egress
self-hosted runner as described in [GitHub Actions](GITHUB_ACTIONS.md). Then
manually dispatch `.github/workflows/deploy.yml`. It builds/pushes the image,
reads generated settings from Systems Manager Parameter Store, runs the
migration Job, and waits for app and monitoring rollouts. It does not run
Terraform.

The app has no public LoadBalancer. From an operator machine allowed to access
the EKS API:

```powershell
kubectl port-forward -n food-ordering service/food-ordering 8080:8000
```

Open `http://localhost:8080`. In separate terminals, port-forward Grafana and
Prometheus:

```powershell
kubectl port-forward -n monitoring service/grafana 3000:3000
kubectl port-forward -n monitoring service/prometheus 9090:9090
```

Grafana uses username `admin`; retrieve its generated password from the
`grafana-admin` Kubernetes Secret with an authorized cluster context.

For health and diagnostics:

```powershell
.\scripts\check-kubernetes-health.ps1
kubectl describe deployment food-ordering -n food-ordering
kubectl logs -n food-ordering deployment/food-ordering --all-containers
```

The EKS control-plane endpoint is public only for the fixed CIDR allow-list
and also enables private endpoint access. Worker nodes use public subnets for
outbound access without NAT; security groups restrict inbound traffic. RDS
and optional Redis remain private. The single node/app replica is not highly
available.
