variable "region" { type = string }
variable "environment" { type = string }
variable "worker_machine_type" { type = string }
variable "worker_min_replicas" { type = number }
variable "worker_max_replicas" { type = number }
variable "vpc_name" { type = string }
variable "subnet_name" { type = string }
variable "worker_sa_email" { type = string }
