resource "google_compute_instance_template" "worker_template" {
  name_prefix  = "disha-worker-tpl-${var.environment}-"
  machine_type = var.worker_machine_type
  region       = var.region

  tags = ["disha-node", "disha-worker"]

  disk {
    source_image = "cos-cloud/cos-stable"
    auto_delete  = true
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = var.vpc_name
    subnetwork = var.subnet_name
    # No external IP: egress routed through Cloud NAT
  }

  service_account {
    email  = var.worker_sa_email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
    startup-script = <<-EOF
      #!/bin/bash
      set -euo pipefail
      echo "Starting DISHA 6.6 OSINT Worker Pool Node..."
    EOF
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_region_instance_group_manager" "worker_mig" {
  name               = "disha-worker-mig-${var.environment}"
  base_instance_name = "disha-worker-${var.environment}"
  region             = var.region

  version {
    instance_template = google_compute_instance_template.worker_template.id
  }

  target_size = var.worker_min_replicas

  auto_healing_policies {
    health_check      = google_compute_health_check.worker_health.id
    initial_delay_sec = 180
  }
}

resource "google_compute_region_autoscaler" "worker_autoscaler" {
  name   = "disha-worker-as-${var.environment}"
  region = var.region
  target = google_compute_region_instance_group_manager.worker_mig.id

  autoscaling_policy {
    max_replicas    = var.worker_max_replicas
    min_replicas    = var.worker_min_replicas
    cooldown_period = 60

    cpu_utilization {
      target = 0.75
    }
  }
}

resource "google_compute_health_check" "worker_health" {
  name               = "disha-worker-hc-${var.environment}"
  check_interval_sec = 15
  timeout_sec        = 5

  tcp_health_check {
    port = 8080
  }
}
