variable "environment" {
  type        = string
  description = "Environment identifier"
}

variable "web_sa_email" {
  type        = string
  description = "Web Service Account Email"
}

variable "worker_sa_email" {
  type        = string
  description = "Worker Service Account Email"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Cloud SQL application user password to publish as a Secret Manager version."
}

variable "redis_auth_string" {
  type        = string
  sensitive   = true
  description = "Memorystore AUTH string to publish as a Secret Manager version."
}
