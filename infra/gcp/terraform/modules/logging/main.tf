resource "google_logging_project_sink" "audit_sink" {
  name        = "disha-audit-sink-${var.environment}"
  destination = "storage.googleapis.com/${var.audit_bucket_name}"
  filter      = "logName:\"logs/cloudaudit.googleapis.com\" OR jsonPayload.eventType:\"EVIDENCE_MUTATION\""

  unique_writer_identity = true
}
