# Deployment and operations guide

This directory documents a low-cost AWS learning deployment for Sunday Table:
a combined frontend/API image from the root `Dockerfile`, deployed to EKS with
private managed PostgreSQL and optional Redis provisioned by Terraform. GitHub
Actions validation is separate from a manually dispatched, protected deploy
workflow. Prometheus and Grafana provide in-cluster metrics; limited-retention
CloudWatch EKS control-plane logs are optional operational telemetry.

## Start here

1. Read [Architecture](ARCHITECTURE.md) and [Security](SECURITY.md).
2. Build the app locally with [Docker](DOCKER.md).
3. Provision AWS with [Terraform](TERRAFORM.md) and understand networking in
   [AWS](AWS.md).
4. Review the current workflow and optional AWS OIDC setup in
   [GitHub Actions](GITHUB_ACTIONS.md).
5. Deploy and operate workloads using [Kubernetes](KUBERNETES.md).
6. Install and query monitoring using [Monitoring](MONITORING.md).
7. Troubleshoot common failures in [Troubleshooting](TROUBLESHOOTING.md).

## Deployment sequence

1. Read [Cost and Free Tier](COST_AND_FREE_TIER.md) and decide whether the
   possible charges are acceptable.
2. Create a versioned, access-restricted S3 bucket for Terraform state; this
   stack does not create its own state bucket.
3. Copy `terraform/terraform.tfvars.example`, replace its placeholders, then
   run Terraform init, validate, and plan. Review the plan. `terraform apply`
   is always a separate manual action; this repository does not run it.
4. Follow [GitHub Actions](GITHUB_ACTIONS.md) to configure the protected
   environment and fixed-egress runner. Deployment only runs when manually
   dispatched.
5. Access the app and internal monitoring with `kubectl port-forward`; there
   is no public application load balancer by default.

Do not put generated credentials, Terraform state, or real `.tfvars` files in
Git. See [Terraform](TERRAFORM.md) and [Security](SECURITY.md) before making
the first AWS deployment.
