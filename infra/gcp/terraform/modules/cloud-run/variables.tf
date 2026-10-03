variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "web_sa_email" { type = string }
variable "serverless_connector_id" { type = string }
variable "artifact_repo_id" { type = string }
variable "db_host" { type = string }
variable "db_name" { type = string }
variable "db_user" { type = string }
variable "db_password_secret_id" { type = string }
variable "jwt_secret_id" { type = string }
variable "redis_host" { type = string }
variable "redis_port" { type = number }
variable "osint_topic_id" { type = string }
variable "evidence_bucket_name" { type = string }

variable "worker_token_secret_id" { type = string }
