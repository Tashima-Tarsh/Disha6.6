output "load_balancer_ip" {
  description = "The external public IP of the DISHA 6.6 HTTPS Load Balancer"
  value       = module.load_balancer.external_ip
}

output "web_service_uri" {
  description = "The internal Cloud Run URI for DISHA Web"
  value       = module.cloud_run.web_service_uri
}

output "cloud_sql_ip" {
  description = "Private IP address for PostgreSQL 16"
  value       = module.cloud_sql.private_ip_address
}

output "redis_host" {
  description = "Private Memorystore Redis host"
  value       = module.redis.host
}

output "evidence_bucket" {
  description = "Cloud Storage bucket name for immutable evidence vault"
  value       = module.storage.bucket_name
}

output "artifact_registry" {
  description = "Container image repository"
  value       = module.artifact_registry.repository_name
}
