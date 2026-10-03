variable "region" {
  type        = string
  description = "GCP region"
}

variable "environment" {
  type        = string
  description = "Environment identifier"
}

variable "redis_memory_size_gb" {
  type        = number
  description = "Redis memory size in GB"
}

variable "vpc_id" {
  type        = string
  description = "VPC network ID"
}
