variable "aws_region" {
  description = "AWS region used for all resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short, lowercase name used to prefix AWS resources."
  type        = string
  default     = "food-ordering"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "learning"
}

variable "vpc_cidr" {
  description = "IPv4 CIDR for the application VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "cluster_public_access_cidrs" {
  description = "CIDRs allowed to reach the public EKS API endpoint."
  type        = list(string)

  validation {
    condition     = length(var.cluster_public_access_cidrs) > 0
    error_message = "Set at least one CIDR for EKS public API access."
  }
}

variable "node_instance_types" {
  description = "EC2 instance types for one learning node. t3.medium leaves room for the app and in-cluster monitoring."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_desired_size" {
  description = "Desired number of EKS worker nodes. Keep the learning environment to a single node."
  type        = number
  default     = 1
}

variable "node_min_size" {
  description = "Minimum number of EKS worker nodes."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of EKS worker nodes."
  type        = number
  default     = 1
}

variable "node_disk_size" {
  description = "Worker-node root EBS volume size in GiB."
  type        = number
  default     = 20
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class. Single-AZ and low-cost for learning use."
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "food_ordering"
}

variable "db_username" {
  description = "RDS master username. The generated password is stored in SSM Parameter Store."
  type        = string
  default     = "foodadmin"
}

variable "application_db_username" {
  description = "Least-privilege database login used by running application pods."
  type        = string
  default     = "foodapp"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type for the replication group."
  type        = string
  default     = "cache.t4g.micro"
}

variable "enable_redis" {
  description = "Create a single-node ElastiCache Redis instance for multi-pod event fan-out. It is disabled by default to reduce cost."
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "Exact GitHub repository allowed to assume the deployment role, in owner/repository format."
  type        = string
}

variable "github_environment" {
  description = "Protected GitHub Actions environment allowed to assume the deployment role."
  type        = string
  default     = "aws-learning"
}

variable "rds_deletion_protection" {
  description = "Protect the learning RDS instance from accidental deletion. Disable by default so terraform destroy is straightforward."
  type        = bool
  default     = false
}