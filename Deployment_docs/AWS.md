# AWS architecture

## Network and compute

Terraform creates a DNS-enabled VPC across two Availability Zones. EKS control
plane interfaces, RDS, and optional ElastiCache reside in private subnets.
Worker nodes use public subnets and outbound access through the Internet
Gateway so they can pull ECR and public monitoring images without a NAT
Gateway. Public IPv4 and data-transfer charges may still apply. Security
groups do not permit unsolicited inbound access to the worker nodes.

The EKS API public endpoint is restricted to `cluster_public_access_cidrs`;
include the fixed-egress deployment runner and trusted operator addresses. Do
not use an unrestricted CIDR. The app uses a ClusterIP Service and
`kubectl port-forward`; no public load balancer is created by default.

## ECR, EKS, RDS, Redis

- **ECR:** private repository, immutable commit-SHA tags, scan-on-push, and a
  lifecycle policy that retains the latest five images.
- **EKS:** managed control plane, one managed worker, VPC CNI/CoreDNS/
  kube-proxy add-ons, and API control-plane logs retained for seven days.
  CloudWatch Observability add-on is disabled by default.
- **RDS:** encrypted PostgreSQL 16, private subnet group, Single-AZ, 20 GiB,
  one-day backup retention, and no final snapshot on destroy. The DB security
  group accepts port 5432 only from the EKS cluster security group.
- **ElastiCache:** disabled by default. If enabled, one private TLS Redis node
  is created without a replica or Multi-AZ failover.
- **Systems Manager Parameter Store:** generated DB, optional Redis, JWT,
  metrics, and Grafana credentials are stored in one SecureString parameter.
  Terraform state also contains these values and must be protected.

Terraform state is an independent security boundary. Use an encrypted,
versioned S3 bucket with restrictive IAM and locking. Terraform plans/state
may contain secrets even when outputs are marked sensitive.

## Operational notes and cost

Use AWS Budgets and billing alerts for EKS, EC2/EBS, RDS, public IPv4,
optional ElastiCache, ECR, CloudWatch logs, S3 state, and data transfer. The
default stack has no NAT Gateway, Elastic IP, or public application load
balancer. It is a learning environment, not a zero-cost or highly available
production service.

Do not scale the default one-node group or enable Redis/logging until the
additional cost and resource headroom have been reviewed. See
[Cost and Free Tier](COST_AND_FREE_TIER.md) for the resource inventory and
cleanup steps.
