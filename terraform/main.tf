data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = "${var.project_name}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)

  public_subnets  = [for index in range(2) : cidrsubnet(var.vpc_cidr, 8, index)]
  private_subnets = [for index in range(2) : cidrsubnet(var.vpc_cidr, 8, index + 16)]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  availability_zone       = local.azs[count.index]
  cidr_block              = local.public_subnets[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                      = "${local.name}-public-${count.index + 1}"
    "kubernetes.io/cluster/${local.name}-eks" = "shared"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  availability_zone = local.azs[count.index]
  cidr_block        = local.private_subnets[count.index]

  tags = {
    Name                                      = "${local.name}-private-${count.index + 1}"
    "kubernetes.io/cluster/${local.name}-eks" = "shared"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name}-public"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database"
  description = "PostgreSQL ingress only from the EKS cluster."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EKS"
    protocol        = "tcp"
    from_port       = 5432
    to_port         = 5432
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-database"
  }
}

resource "aws_security_group" "redis" {
  count       = var.enable_redis ? 1 : 0
  name        = "${local.name}-redis"
  description = "Redis TLS ingress only from the EKS cluster."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis TLS from EKS"
    protocol        = "tcp"
    from_port       = 6379
    to_port         = 6379
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-redis"
  }
}

resource "aws_iam_role" "eks_cluster" {
  name = "${local.name}-eks-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "eks_nodes" {
  name = "${local.name}-eks-nodes"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_worker" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "node_cni" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "node_ecr" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_cluster" "main" {
  name     = "${local.name}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.34"

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.cluster_public_access_cidrs
  }

  enabled_cluster_log_types = ["api"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster,
    aws_cloudwatch_log_group.eks
  ]

  tags = {
    Name = "${local.name}-eks"
  }
}

resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${local.name}-eks/cluster"
  retention_in_days = 7
}

resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
}

resource "aws_eks_addon" "coredns" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "coredns"
  resolve_conflicts_on_create = "OVERWRITE"
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.name}-workers"
  node_role_arn   = aws_iam_role.eks_nodes.arn

  # Public subnets provide outbound access through the Internet Gateway
  # without requiring a NAT Gateway.
  # RDS and optional Redis remain in private subnets.
  subnet_ids     = aws_subnet.public[*].id
  instance_types = var.node_instance_types
  disk_size      = var.node_disk_size

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  update_config {
    max_unavailable = 1
  }

  # The node group must be available before EKS add-ons that
  # require schedulable worker nodes can become healthy.
  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_ecr,
  ]

  tags = {
    Name = "${local.name}-workers"
  }
}

resource "aws_eks_access_entry" "github_actions" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.github_actions.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "github_actions_admin" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.github_actions.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy"

  access_scope {
    type       = "namespace"
    namespaces = ["food-ordering", "monitoring"]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-rds"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${local.name}-rds"
  }
}

resource "random_password" "database" {
  length  = 32
  special = false
}

resource "random_password" "redis" {
  count   = var.enable_redis ? 1 : 0
  length  = 32
  special = false
}

resource "random_password" "application_database" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "random_password" "metrics" {
  length  = 48
  special = false
}

resource "random_password" "grafana" {
  length  = 32
  special = false
}

resource "aws_db_instance" "postgres" {
  identifier                 = "${local.name}-postgres"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = var.db_instance_class
  allocated_storage          = 20
  storage_type               = "gp3"
  storage_encrypted          = true
  db_name                    = var.db_name
  username                   = var.db_username
  password                   = random_password.database.result
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.database.id]
  publicly_accessible        = false
  multi_az                   = false
  backup_retention_period    = 1
  deletion_protection        = var.rds_deletion_protection
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true
  skip_final_snapshot        = true

  tags = {
    Name = "${local.name}-postgres"
  }
}

resource "aws_elasticache_subnet_group" "main" {
  count      = var.enable_redis ? 1 : 0
  name       = "${local.name}-redis"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  count                      = var.enable_redis ? 1 : 0
  replication_group_id       = "${var.project_name}-${var.environment}"
  description                = "Private TLS Redis for real-time order events."
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.redis_node_type
  port                       = 6379
  num_cache_clusters         = 1
  automatic_failover_enabled = false
  multi_az_enabled           = false
  subnet_group_name          = aws_elasticache_subnet_group.main[0].name
  security_group_ids         = [aws_security_group.redis[0].id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis[0].result

  tags = {
    Name = "${local.name}-redis"
  }
}

resource "aws_ssm_parameter" "application" {
  name        = "/${local.name}/application"
  description = "Runtime and migration credentials for Sunday Table."
  type        = "SecureString"
  tier        = "Standard"

  value = jsonencode({
    DATABASE_URL           = "postgresql+asyncpg://${var.application_db_username}:${random_password.application_database.result}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
    DB_ADMIN_URL           = "postgresql+asyncpg://${var.db_username}:${random_password.database.result}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
    APP_DB_USERNAME        = var.application_db_username
    APP_DB_PASSWORD        = random_password.application_database.result
    REDIS_URL              = var.enable_redis ? "rediss://:${random_password.redis[0].result}@${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:6379/0" : ""
    JWT_SECRET             = random_password.jwt.result
    METRICS_AUTH_TOKEN     = random_password.metrics.result
    GRAFANA_ADMIN_PASSWORD = random_password.grafana.result
  })
}

resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}/app"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 5 most recent images."

      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }

      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "github_actions" {
  name = "${local.name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github_actions.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"

      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:${var.github_environment}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "${local.name}-github-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = [
          aws_ecr_repository.app.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster"
        ]
        Resource = [
          aws_eks_cluster.main.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          aws_ssm_parameter.application.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"

        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }

          StringLike = {
            "kms:EncryptionContext:PARAMETER_ARN" = aws_ssm_parameter.application.arn
          }
        }
      }
    ]
  })
}