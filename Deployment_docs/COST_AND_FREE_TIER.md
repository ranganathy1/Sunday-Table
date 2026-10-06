# AWS costs and cleanup

This is a **cost-conscious learning stack, not a free stack**. AWS Free Tier
eligibility depends on your account age, region, current offers, and usage.
EKS and its supporting services can produce charges even when the app has no
traffic. Check the AWS Pricing Calculator and Billing console for your account
before applying Terraform. No price or Free Tier coverage is guaranteed here.

## Resources in this configuration and cost exposure

| Resource | Default configuration | Cost exposure |
| --- | --- | --- |
| Amazon EKS | One cluster; one `t3.medium` worker by default | The EKS control plane is billed while the cluster exists. |
| EC2 worker / EBS | One managed worker; 20 GiB root disk | Instance-hours and EBS storage. A `t3.medium` is deliberately used because the app plus Prometheus/Grafana need more memory than a `t3.small` reliably provides. |
| Public IPv4 | Worker nodes use public subnets for outbound access without NAT | Public IPv4 address charges may apply. Security groups still restrict inbound access; the app itself is not exposed through a public Service. |
| Amazon RDS PostgreSQL | `db.t3.micro`, Single-AZ, 20 GiB, one-day automated backup retention | Database instance-hours, storage, backups beyond included allowances, and data transfer. `terraform destroy` skips the final snapshot, so database data is deleted. |
| Amazon ECR | One private repository; lifecycle retains five most recent images | Image storage and transfer. The repository is configured for deletion with its images during Terraform destroy. |
| Systems Manager Parameter Store | One standard-tier `SecureString` with generated credentials | Standard parameters generally avoid a per-parameter storage fee, but verify current regional pricing and API/KMS usage. Its value also exists in Terraform state. |
| CloudWatch Logs | EKS API control-plane log group, seven-day retention; CloudWatch Observability add-on disabled | Log ingestion, archived bytes during retention, and metrics. Retention does not prevent ingestion charges. |
| VPC networking | VPC, subnets, route tables, Internet Gateway, security groups | These primitives generally have no hourly charge; public IPv4 and data transfer can cost money. No NAT Gateway, VPC endpoints, Elastic IP, or load balancer is created by default. |
| Optional ElastiCache Redis | Disabled by default; one `cache.t4g.micro` node if enabled | Cache instance-hours, data transfer, and related storage. Enabling Redis adds an ongoing charge; no replica or Multi-AZ failover is configured. |
| S3 Terraform state bucket | Must be created separately; it is not managed by this stack | S3 storage, requests, and any chosen encryption/versioning features. Old state versions remain billable until expired/deleted. |
| GitHub Actions runner | A self-hosted Linux runner with fixed egress is required for the deploy workflow | No AWS EC2 runner is created by Terraform. If you host the runner on paid compute, that compute is an additional charge. |

IAM roles, policies, OIDC providers, and SSM parameter metadata do not usually
have a direct hourly charge. EKS add-ons and Kubernetes monitoring consume
worker CPU/memory, which is paid through the worker instance. This stack does
not deploy paid third-party monitoring services.

## Low-cost design choices and trade-offs

- No NAT Gateway: worker nodes are placed in public subnets so they can pull
  ECR and public monitoring images through the Internet Gateway. RDS and
  optional Redis stay in private subnets. Public worker addresses and outbound
  data transfer can still cost money.
- No public application LoadBalancer: the app Service is `ClusterIP`. Use
  `kubectl port-forward` for learning/demo access. A public edge can be added
  later, but a load balancer, DNS, TLS, and data transfer can add charges.
- One worker and one app replica: this is a learning setup with no workload
  redundancy. HPA is not installed by default.
- Redis and CloudWatch Observability add-on are disabled by default. Enable
  Redis only when testing multi-pod event fan-out; enable other AWS logging
  deliberately after checking its cost.
- The ECR repository keeps five images. Terraform destroy deletes repository
  images (`force_delete = true`).

## Before provisioning

1. Check the pricing calculator and your AWS Billing/Free Tier pages for the
   selected region and account.
2. Set an AWS budget and billing alerts in the AWS console. Those are
   account-level services and are not created by this stack.
3. Review `terraform plan` and confirm the instance classes, public worker
   subnet choice, RDS storage/backups, log retention, and optional Redis.
4. Keep `terraform.tfstate`, `terraform.tfvars`, plans, and generated
   credentials private. Terraform state contains database passwords and
   application secrets even though outputs avoid printing them.
5. Do not apply if you cannot accept charges. Running `terraform destroy`
   removes the managed services but does not refund prior usage charges.

## Destroy and cleanup

The default learning variables disable RDS deletion protection and skip the
final snapshot to make teardown direct. **Destroy deletes the database without
creating a final snapshot.** Back up anything you need before continuing.

From the repository root, review the destroy plan first:

```powershell
terraform -chdir=terraform plan -destroy -var-file=terraform.tfvars
```

When you have reviewed and decided to proceed, destroy only the resources
managed by this Terraform state:

```powershell
terraform -chdir=terraform destroy -var-file=terraform.tfvars
```

Afterward, inspect the AWS console for leftover resources and charges,
including ECR images/repositories, RDS automated backups, CloudWatch log groups,
EBS volumes, public IPv4 addresses, and any Kubernetes-created resources. The
Terraform ECR repository is configured for deletion, but verify cleanup in
your account.

The S3 state bucket is external to this Terraform stack and is intentionally
not deleted by `terraform destroy`. First confirm the AWS resources are gone
and retain/export state if required. Then delete the bucket's object versions
and the bucket manually if you no longer need it. Do not delete the state
bucket while Terraform resources still exist.

Terraform does not manage the GitHub self-hosted runner. Stop or unregister it
separately; if it runs on AWS compute, terminate that instance after cleanup.

## Verify and monitor billing

Use the AWS Billing console and Cost Explorer for current charges. Example
inventory commands (read-only):

```powershell
aws eks list-clusters
aws rds describe-db-instances
aws elasticache describe-replication-groups
aws ecr describe-repositories
aws ec2 describe-addresses
aws elbv2 describe-load-balancers
aws logs describe-log-groups
```

There should be no NAT Gateway, allocated Elastic IP, or load balancer from
this default configuration. Investigate unexpected resources before deleting
them.
