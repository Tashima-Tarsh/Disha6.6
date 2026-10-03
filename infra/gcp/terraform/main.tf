module "network" {
  source      = "./modules/network"
  environment = var.environment
  region      = var.region
}

module "iam" {
  source      = "./modules/iam"
  project_id  = var.project_id
  environment = var.environment
}

module "secret_manager" {
  source          = "./modules/secret-manager"
  environment     = var.environment
  web_sa_email    = module.iam.web_sa_email
  worker_sa_email = module.iam.worker_sa_email
}

module "artifact_registry" {
  source      = "./modules/artifact-registry"
  environment = var.environment
  region      = var.region
}

module "cloud_sql" {
  source                 = "./modules/cloud-sql"
  region                 = var.region
  environment            = var.environment
  database_tier          = var.database_tier
  vpc_id                 = module.network.vpc_id
  private_vpc_connection = module.network.private_vpc_connection
}

module "redis" {
  source               = "./modules/redis"
  region               = var.region
  environment          = var.environment
  redis_memory_size_gb = var.redis_memory_size_gb
  vpc_id               = module.network.vpc_id
}

module "storage" {
  source      = "./modules/storage"
  project_id  = var.project_id
  region      = var.region
  environment = var.environment
}

module "pubsub" {
  source      = "./modules/pubsub"
  environment = var.environment
}

module "cloud_run" {
  source                  = "./modules/cloud-run"
  project_id              = var.project_id
  region                  = var.region
  environment             = var.environment
  web_sa_email            = module.iam.web_sa_email
  serverless_connector_id = module.network.serverless_connector_id
  artifact_repo_id        = module.artifact_registry.repository_id
  db_host                 = module.cloud_sql.private_ip_address
  db_name                 = module.cloud_sql.database_name
  db_user                 = module.cloud_sql.db_user
  db_password_secret_id   = module.secret_manager.db_password_secret_id
  jwt_secret_id           = module.secret_manager.jwt_secret_id
  redis_host              = module.redis.host
  redis_port              = module.redis.port
  osint_topic_id          = module.pubsub.osint_jobs_topic_id
  evidence_bucket_name    = module.storage.bucket_name
}

module "workers" {
  source              = "./modules/workers"
  region              = var.region
  environment         = var.environment
  worker_machine_type = var.worker_machine_type
  worker_min_replicas = var.worker_min_replicas
  worker_max_replicas = var.worker_max_replicas
  vpc_name            = module.network.vpc_name
  subnet_name         = module.network.app_subnet_name
  worker_sa_email     = module.iam.worker_sa_email
}

module "load_balancer" {
  source                 = "./modules/load-balancer"
  region                 = var.region
  environment            = var.environment
  domain_name            = var.domain_name
  cloud_run_service_name = module.cloud_run.web_service_name
}

module "monitoring" {
  source      = "./modules/monitoring"
  environment = var.environment
}

module "logging" {
  source            = "./modules/logging"
  environment       = var.environment
  audit_bucket_name = module.storage.bucket_name
}
