output "web_sa_email" {
  value = google_service_account.web_sa.email
}

output "worker_sa_email" {
  value = google_service_account.worker_sa.email
}

output "osint_sa_email" {
  value = google_service_account.osint_sa.email
}

output "brain_sa_email" {
  value = google_service_account.brain_sa.email
}

output "migration_sa_email" {
  value = google_service_account.migration_sa.email
}

output "ci_sa_email" {
  value = google_service_account.ci_sa.email
}
