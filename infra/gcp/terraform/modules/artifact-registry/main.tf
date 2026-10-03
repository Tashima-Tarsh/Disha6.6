resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "disha-images-${var.environment}"
  description   = "Docker container image repository for DISHA 6.6 production services"
  format        = "DOCKER"

  docker_config {
    immutable_tags = true
  }
}
