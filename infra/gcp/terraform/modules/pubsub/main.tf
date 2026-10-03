# Dead-letter topics
resource "google_pubsub_topic" "osint_dead_letter" {
  name = "disha-osint-dead-letter-${var.environment}"
}

resource "google_pubsub_topic" "cyber_dead_letter" {
  name = "disha-cyber-dead-letter-${var.environment}"
}

# Primary topics
resource "google_pubsub_topic" "missions" {
  name = "disha-missions-${var.environment}"
}

resource "google_pubsub_topic" "osint_jobs" {
  name = "disha-osint-jobs-${var.environment}"
}

resource "google_pubsub_topic" "cyber_jobs" {
  name = "disha-cyber-jobs-${var.environment}"
}

# Subscriptions with dead-letter and retry backoff
resource "google_pubsub_subscription" "osint_worker_sub" {
  name  = "disha-osint-worker-sub-${var.environment}"
  topic = google_pubsub_topic.osint_jobs.name

  ack_deadline_seconds = 180

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.osint_dead_letter.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }
}

resource "google_pubsub_subscription" "cyber_worker_sub" {
  name  = "disha-cyber-worker-sub-${var.environment}"
  topic = google_pubsub_topic.cyber_jobs.name

  ack_deadline_seconds = 180

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.cyber_dead_letter.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }
}
