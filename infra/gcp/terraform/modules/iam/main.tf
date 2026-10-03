# Dedicated least-privilege service accounts (Task 34)
resource "google_service_account" "web_sa" {
  account_id   = "disha-web-sa-${var.environment}"
  display_name = "DISHA 6.6 Web and API Service Account"
}

resource "google_service_account" "worker_sa" {
  account_id   = "disha-worker-sa-${var.environment}"
  display_name = "DISHA 6.6 Background Worker Service Account"
}

resource "google_service_account" "osint_sa" {
  account_id   = "disha-osint-sa-${var.environment}"
  display_name = "DISHA 6.6 OSINT Execution Plane Service Account"
}

resource "google_service_account" "brain_sa" {
  account_id   = "disha-brain-sa-${var.environment}"
  display_name = "DISHA 6.6 Brain & Embeddings AI Service Account"
}

resource "google_service_account" "migration_sa" {
  account_id   = "disha-migration-sa-${var.environment}"
  display_name = "DISHA 6.6 Database Migration Job Service Account"
}

resource "google_service_account" "ci_sa" {
  account_id   = "disha-ci-sa-${var.environment}"
  display_name = "DISHA 6.6 CI/CD Deployment Service Account"
}

# Role bindings for Web Service Account
resource "google_project_iam_member" "web_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.web_sa.email}"
}

resource "google_project_iam_member" "web_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.web_sa.email}"
}

resource "google_project_iam_member" "web_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.web_sa.email}"
}

resource "google_project_iam_member" "web_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.web_sa.email}"
}

resource "google_project_iam_member" "web_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.web_sa.email}"
}

# Role bindings for Worker Service Account
resource "google_project_iam_member" "worker_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker_sa.email}"
}

resource "google_project_iam_member" "worker_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.worker_sa.email}"
}

resource "google_project_iam_member" "worker_storage_writer" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.worker_sa.email}"
}

resource "google_project_iam_member" "worker_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.worker_sa.email}"
}

# Role bindings for Migration Service Account
resource "google_project_iam_member" "migration_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.migration_sa.email}"
}
