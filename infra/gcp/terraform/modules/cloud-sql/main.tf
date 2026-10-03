resource "google_sql_database_instance" "postgres" {
  name             = "disha-sql-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [var.private_vpc_connection]

  settings {
    tier              = var.database_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 50
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }

    database_flags {
      name  = "shared_preload_libraries"
      value = "pgvector"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_database" "disha_db" {
  name     = "disha_production"
  instance = google_sql_database_instance.postgres.name
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_user" "disha_user" {
  name     = "disha_app"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}
