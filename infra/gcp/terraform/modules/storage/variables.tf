variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
}

variable "environment" {
  type        = string
  description = "Environment identifier"
}

variable "retention_period_seconds" {
  type        = number
  description = "Minimum evidence retention period enforced by Cloud Storage."
  default     = 31536000

  validation {
    condition     = var.retention_period_seconds >= 86400
    error_message = "Evidence retention must be at least 24 hours."
  }
}

variable "lock_retention_policy" {
  type        = bool
  description = "Irreversibly lock the Cloud Storage retention policy. Enable only for the production evidence vault after review."
  default     = false
}
