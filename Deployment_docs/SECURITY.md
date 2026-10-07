# Security model

## Secrets and identity

- AWS access uses GitHub Actions OIDC and short-lived STS credentials; do not
  configure long-lived AWS access keys in CI.
- Terraform generates database, optional Redis, JWT, metrics, and Grafana
  credentials. They are stored in an SSM SecureString parameter and Terraform
  state; restrict access to both.
- The manually dispatched GitHub deployment workflow uses a protected
  `aws-learning` environment and GitHub-hosted `ubuntu-latest` runners. Its IAM
  role can read the parameter and is scoped to the `food-ordering` and
  `monitoring` namespaces.
- The migration Job alone receives the database admin URL. Application pods
  receive only the lower-privilege database URL and runtime credentials.
- Kubernetes Secrets are namespace-scoped. Configure KMS-backed EKS secret
  encryption for environments that require it; this learning stack does not add
  a customer-managed KMS key. Do not print Secrets in CI logs.

## Network and workload controls

RDS and optional ElastiCache are private, encrypted, and security-group
restricted to EKS. Worker nodes have public addresses for egress without NAT;
security groups restrict inbound access. The EKS control-plane public endpoint
is currently allow-listed via `cluster_public_access_cidrs` and is intentionally
set to `0.0.0.0/0` in the temporary learning config; this should be tightened
for production. The application has no public load balancer; operators use
port-forward through the accessible EKS API.

The application image and Kubernetes pods run non-root, drop Linux
capabilities, disallow privilege escalation, use read-only root filesystems,
set CPU/memory requests and limits, and use health probes. Namespace Pod
Security Admission enforces the restricted profile for app and monitoring
workloads. Commit-SHA ECR tags are immutable and the repository retains five
images.

## Production hardening checklist

- Replace demo credentials/seed accounts with controlled production user
  provisioning; demo hashes are not production identities.
- If exposing the app publicly, add a reviewed TLS-protected edge and ingress
  policy; the learning deployment uses port-forward instead.
  - Set GitHub branch protection, Actions environment protection, trusted egress
  CIDRs, and OIDC environment conditions. Review IAM before granting
  production.
- Configure state/Kubernetes secret encryption, log retention, backups and
  restore tests, budgets, and approved alert receivers.
- Rotate SSM-stored credentials with a coordinated application restart.
  Rotate JWT keys with an explicit token invalidation/rollover plan.
- Keep Terraform state, CI artifacts, database URLs, local `.env`, and real
  `.tfvars` out of Git and build artifacts.

The sample stack is a learning/portfolio foundation, not a substitute for a
threat model, load/restore testing, compliance review, or an on-call plan.
