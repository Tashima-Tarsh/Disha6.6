resource "google_secret_manager_secret" "db_password" {
  secret_id = "disha-db-password-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "disha-jwt-secret-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "worker_token" {
  secret_id = "disha-worker-token-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "encryption_key" {
  secret_id = "disha-encryption-key-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "web_db_password_access" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.web_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "web_jwt_secret_access" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.web_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "worker_db_password_access" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.worker_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "web_worker_token_access" {
  secret_id = google_secret_manager_secret.worker_token.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.web_sa_email}"
}
