variable "project_id" {
  type        = string
  description = "The Google Cloud Project ID for DISHA 6.6."
  default     = "avian-branch-499413-p7"
}

variable "region" {
  type        = string
  description = "Primary GCP region for DISHA 6.6 resources."
  default     = "asia-south1"
}

variable "zone" {
  type        = string
  description = "Primary GCP zone for GCE worker resources."
  default     = "asia-south1-a"
}

variable "environment" {
  type        = string
  description = "Deployment environment name (prod, staging, dev)."
  default     = "prod"
}

variable "domain_name" {
  type        = string
  description = "Primary domain for Cloudflare edge routing to GCP."
  default     = "disha6.6.thenitishkr.in"
}

variable "database_tier" {
  type        = string
  description = "Cloud SQL machine tier for PostgreSQL 16."
  default     = "db-custom-4-16384"
}

variable "redis_memory_size_gb" {
  type        = number
  description = "Memorystore Redis capacity in GB."
  default     = 2
}

variable "worker_machine_type" {
  type        = string
  description = "Machine type for dedicated CLI OSINT and CTI worker nodes."
  default     = "e2-standard-4"
}

variable "worker_min_replicas" {
  type        = number
  description = "Minimum active worker instances in the managed instance group."
  default     = 1
}

variable "worker_max_replicas" {
  type        = number
  description = "Maximum worker instances in the managed instance group during heavy load."
  default     = 5
}
