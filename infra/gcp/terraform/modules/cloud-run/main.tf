resource "google_cloud_run_v2_service" "web" {
  name     = "disha-web-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.web_sa_email

    vpc_access {
      connector = var.serverless_connector_id
      egress    = "ALL_TRAFFIC"
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repo_id}/disha-web:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "DISHA_AUTH_MODE"
        value = "password"
      }
      env {
        name  = "DISHA_EVIDENCE_LEDGER_MODE"
        value = "postgres"
      }
      env {
        name  = "DISHA_ALLOW_STATELESS_AUTH"
        value = "false"
      }
      env {
        name  = "DISHA_COOKIE_SECURE"
        value = "true"
      }
      env {
        name  = "DISHA_ASTRA6_ALL_TOOLS_ENABLED"
        value = "true"
      }
      env {
        name  = "DISHA_DATABASE_HOST"
        value = var.db_host
      }
      env {
        name  = "DISHA_DATABASE_NAME"
        value = var.db_name
      }
      env {
        name  = "DISHA_DATABASE_USER"
        value = var.db_user
      }
      env {
        name  = "REDIS_HOST"
        value = var.redis_host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(var.redis_port)
      }
      env {
        name = "REDIS_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = var.redis_auth_secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "DISHA_PUBSUB_OSINT_TOPIC"
        value = var.osint_topic_id
      }
      env {
        name  = "DISHA_EVIDENCE_BUCKET"
        value = var.evidence_bucket_name
      }

      env {
        name = "DISHA_DATABASE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = var.db_password_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DISHA_JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.jwt_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DISHA_WORKER_TOKEN"
        value_source {
          secret_key_ref {
            secret  = var.worker_token_secret_id
            version = "latest"
          }
        }
      }
    }
  }
}
