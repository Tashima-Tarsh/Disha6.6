variable "region" {
  type        = string
  description = "GCP region"
}

variable "environment" {
  type        = string
  description = "Environment identifier"
}

variable "database_tier" {
  type        = string
  description = "Machine tier for Cloud SQL"
}

variable "vpc_id" {
  type        = string
  description = "VPC network ID"
}

variable "private_vpc_connection" {
  type        = any
  description = "Private VPC connection resource dependency"
}
