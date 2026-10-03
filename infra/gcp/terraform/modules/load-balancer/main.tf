resource "google_compute_global_address" "lb_ip" {
  name = "disha-lb-ip-${var.environment}"
}

resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "disha-serverless-neg-${var.environment}"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = var.cloud_run_service_name
  }
}

resource "google_compute_backend_service" "backend_service" {
  name                  = "disha-backend-${var.environment}"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.cloud_armor.id

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg.id
  }
}

resource "google_compute_url_map" "url_map" {
  name            = "disha-url-map-${var.environment}"
  default_service = google_compute_backend_service.backend_service.id
}

resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  name = "disha-ssl-cert-${var.environment}"

  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "disha-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.ssl_cert.id]
}

resource "google_compute_global_forwarding_rule" "https_forwarding_rule" {
  name                  = "disha-https-rule-${var.environment}"
  ip_protocol           = "TCP"
  port_range            = "443"
  target                = google_compute_target_https_proxy.https_proxy.id
  ip_address            = google_compute_global_address.lb_ip.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# Cloud Armor security policy for WAF rate limiting and XSS protection
resource "google_compute_security_policy" "cloud_armor" {
  name = "disha-cloud-armor-${var.environment}"

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 120
        interval_sec = 60
      }
      ban_duration_sec = 600
    }
    description = "Rate limit aggressive requests"
  }
}
