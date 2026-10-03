resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "DISHA 6.6 High Error Rate Alert (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run 5xx error rate > 5%"

    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = []
}

resource "google_monitoring_alert_policy" "cloud_sql_high_cpu" {
  display_name = "DISHA 6.6 Cloud SQL High CPU (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL CPU utilization > 85%"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = []
}
