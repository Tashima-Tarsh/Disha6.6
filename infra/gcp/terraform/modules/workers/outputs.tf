output "mig_id" {
  value = google_compute_region_instance_group_manager.worker_mig.id
}

output "instance_group" {
  value = google_compute_region_instance_group_manager.worker_mig.instance_group
}
