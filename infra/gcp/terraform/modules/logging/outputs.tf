output "sink_name" {
  value = google_logging_project_sink.audit_sink.name
}

output "writer_identity" {
  value = google_logging_project_sink.audit_sink.writer_identity
}
