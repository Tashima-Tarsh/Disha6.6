resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "worker_token" {
  length  = 64
  special = false
}

resource "random_password" "encryption_key" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "disha-db-password-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "disha-jwt-secret-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "google_secret_manager_secret" "worker_token" {
  secret_id = "disha-worker-token-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "worker_token" {
  secret      = google_secret_manager_secret.worker_token.id
  secret_data = random_password.worker_token.result
}

resource "google_secret_manager_secret" "redis_auth" {
  secret_id = "disha-redis-auth-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_auth" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = var.redis_auth_string
}

resource "google_secret_manager_secret" "encryption_key" {
  secret_id = "disha-encryption-key-${var.environment}"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "encryption_key" {
  secret      = google_secret_manager_secret.encryption_key.id
  secret_data = random_password.encryption_key.result
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

resource "google_secret_manager_secret_iam_member" "web_worker_token_access" {
  secret_id = google_secret_manager_secret.worker_token.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.web_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "web_redis_auth_access" {
  secret_id = google_secret_manager_secret.redis_auth.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.web_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "worker_db_password_access" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.worker_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "worker_redis_auth_access" {
  secret_id = google_secret_manager_secret.redis_auth.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.worker_sa_email}"
}
