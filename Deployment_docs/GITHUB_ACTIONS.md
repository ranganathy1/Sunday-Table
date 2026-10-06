# GitHub Actions

## Validation workflow

`.github/workflows/ci.yml` runs backend lint/tests, frontend lint/build, and
Terraform formatting/validation. It does not apply Terraform or change AWS
resources.

## Manual application deployment

`.github/workflows/deploy.yml` is a separate `workflow_dispatch` workflow. It
always runs repository checks on GitHub-hosted `ubuntu-latest`: backend lint
and tests, frontend lint/tests (when a frontend test script is configured) and
build, Terraform formatting and validation, and a Docker image build. No AWS
credentials or AWS infrastructure are needed for these checks.

The ECR/EKS deployment job is optional. When manually dispatching the workflow,
leave **Deploy to AWS** unchecked to run checks only; select it only after the
AWS infrastructure and GitHub OIDC role/trust have been provisioned and the
`aws-learning` environment variables below are configured. Deployment pushes
an immutable commit-SHA image to ECR and runs `ci/deploy.sh` to apply
Kubernetes workloads. It does **not** run Terraform.

The deployment also uses GitHub-hosted `ubuntu-latest`. Its outbound IPs are
not fixed, while the EKS public API is restricted by
`cluster_public_access_cidrs`; as a result, EKS access (including
`kubectl`) may fail unless the runner can reach the cluster endpoint. Do not
open the EKS API to `0.0.0.0/0` to work around this. Configure the GitHub
`aws-learning` environment with branch restrictions and required reviewers
before enabling deployment.

## Terraform and AWS setup

Set `github_repository` in `terraform.tfvars` to the exact `owner/repository`.
Set `github_environment` to `aws-learning`; that name must match the protected
GitHub environment. The Terraform OIDC trust allows this environment subject.
Do not add static AWS access keys to GitHub settings.

After Terraform has been applied by an operator, copy these Terraform outputs
into **Variables** on the `aws-learning` GitHub environment:

| Variable | Source |
| --- | --- |
| `AWS_REGION` | Terraform output `aws_region` |
| `AWS_ROLE_ARN` | Terraform output `github_actions_role_arn` |
| `ECR_REPOSITORY_URI` | Terraform output `ecr_repository_url` |
| `EKS_CLUSTER_NAME` | Terraform output `eks_cluster_name` |
| `APP_CONFIG_PARAMETER` | Terraform output `application_config_parameter_name` |

No GitHub secret is needed for the generated database, Redis, JWT, metrics, or
Grafana credentials. Terraform stores them as an SSM `SecureString`; deployment
fetches it with OIDC credentials and creates namespace-scoped Kubernetes
Secrets. The migration Job alone receives the database admin URL.

Before the first application deployment, an administrator must run
`scripts/bootstrap-kubernetes.ps1` once to create the namespaces and
cluster-scoped monitoring RBAC. The deploy role is intentionally restricted
to the `food-ordering` and `monitoring` namespaces and cannot create
cluster-scoped resources.

## No automatic infrastructure provisioning

The workflow never runs `terraform apply`, `terraform destroy`, or Terraform
plans. Review and run Terraform commands separately as the operator. The
workflow is manually dispatched; repository checks run by default, and only
selecting **Deploy to AWS** publishes an image and changes Kubernetes
workloads in an already-created cluster.
