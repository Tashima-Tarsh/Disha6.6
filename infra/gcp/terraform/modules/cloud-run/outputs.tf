output "web_service_uri" {
  value = google_cloud_run_v2_service.web.uri
}

output "web_service_name" {
  value = google_cloud_run_v2_service.web.name
}
