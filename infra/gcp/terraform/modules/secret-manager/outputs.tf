output "db_password_secret_id" {
  value = google_secret_manager_secret.db_password.secret_id
}

output "jwt_secret_id" {
  value = google_secret_manager_secret.jwt_secret.secret_id
}

output "encryption_key_secret_id" {
  value = google_secret_manager_secret.encryption_key.secret_id
}
