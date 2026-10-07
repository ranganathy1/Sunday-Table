# Terraform

  `terraform/` prepares the current cost-conscious AWS learning stack: VPC/subnets,
  Internet Gateway, EKS cluster `food-ordering-learning-eks`, one managed worker,
  ECR repository `food-ordering/app`, Single-AZ RDS PostgreSQL, seven-day EKS
  control-plane logs, optional single-node ElastiCache Redis, Systems Manager
  SecureString credentials, and GitHub Actions OIDC access. There is no Terraform
  Cloud/HCP Terraform backend.

  Terraform does not provision AWS automatically in CI. No Terraform apply is
  part of either GitHub workflow. Review
  [Cost and Free Tier](COST_AND_FREE_TIER.md) before running any AWS operation.

  ## Prerequisites and state

  - Terraform 1.11+, AWS CLI, Docker, and an AWS identity with the permissions
    needed to plan/apply the selected resources.
  - The current learning deployment uses `cluster_public_access_cidrs =
    ["0.0.0.0/0"]` so GitHub-hosted runners can reach the EKS API. This is a
    temporary learning configuration; tighten it for production or for a stable
    private deployment pattern.
  - An S3 bucket for remote state, created and secured separately. Terraform
    requires bucket name/backend settings at `init`; the stack does not create
  the bucket. Enable versioning and block public access. State contains
  generated credentials, so restrict access.

  Copy the example and replace the placeholder repository, CIDR, and region:

```powershell
Copy-Item terraform\terraform.tfvars.example terraform\terraform.tfvars
```

`terraform.tfvars` and state/plan files are ignored by Git. `enable_redis`
defaults to `false`; enabling it creates a chargeable cache node. The current
learning deployment deliberately leaves Redis disabled.

## Initialize and validate without applying

From the repository root:

```powershell
terraform -chdir=terraform init `
  -backend-config="bucket=YOUR-STATE-BUCKET" `
  -backend-config="key=sunday-table/learning/terraform.tfstate" `
  -backend-config="region=eu-north-1" `
  -backend-config="encrypt=true"

terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform plan -var-file=terraform.tfvars -out=tfplan
```

`plan` queries AWS and may require AWS credentials, but does not create
resources. Review every change and cost before separately deciding whether to
run `terraform apply tfplan`. **This repository does not run apply for you.**
Do not upload or commit `tfplan`, state, or generated values.

For offline/backend-free syntax validation, the CI workflow uses
`terraform init -backend=false` followed by `terraform validate`; it does not
need to authenticate to your AWS account.

## Resources and outputs

Outputs provide the region, ECR URL, EKS cluster name, GitHub Actions role ARN,
SSM configuration parameter name, and private RDS/optional Redis endpoints.
RDS has no final snapshot on destroy by default. The ECR repository deletes
remaining images on destroy. Review [Cost and Free Tier](COST_AND_FREE_TIER.md)
for all possible charges and teardown steps.

## Destroy

Back up required database data first. With the checked-in defaults, deletion
protection is disabled and final snapshots are skipped. Review then run:

```powershell
terraform -chdir=terraform plan -destroy -var-file=terraform.tfvars
terraform -chdir=terraform destroy -var-file=terraform.tfvars
```

This permanently deletes managed application resources and database data. The
external S3 state bucket remains; delete its object versions and bucket only
after verifying the infrastructure is gone and state is no longer needed.
