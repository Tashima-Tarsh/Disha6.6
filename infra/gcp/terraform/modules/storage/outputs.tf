output "bucket_name" {
  value = google_storage_bucket.evidence_vault.name
}

output "bucket_url" {
  value = google_storage_bucket.evidence_vault.url
}
