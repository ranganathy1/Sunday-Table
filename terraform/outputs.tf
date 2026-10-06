output "aws_region" {
  description = "AWS region of the deployment."
  value       = var.aws_region
}

output "ecr_repository_url" {
  description = "ECR image repository URL."
  value       = aws_ecr_repository.app.repository_url
}

output "eks_cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.main.name
}

output "github_actions_role_arn" {
  description = "Role assumed by GitHub Actions through OIDC."
  value       = aws_iam_role.github_actions.arn
}

output "application_config_parameter_name" {
  description = "Systems Manager SecureString parameter containing runtime and database-bootstrap settings."
  value       = aws_ssm_parameter.application.name
}

output "rds_endpoint" {
  description = "Private PostgreSQL endpoint; never expose this to the internet."
  value       = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  description = "Private TLS Redis primary endpoint, or null when Redis is disabled."
  value       = var.enable_redis ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : null
}
