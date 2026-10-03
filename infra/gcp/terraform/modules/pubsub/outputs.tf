output "missions_topic_id" {
  value = google_pubsub_topic.missions.id
}

output "osint_jobs_topic_id" {
  value = google_pubsub_topic.osint_jobs.id
}

output "cyber_jobs_topic_id" {
  value = google_pubsub_topic.cyber_jobs.id
}

output "osint_subscription_id" {
  value = google_pubsub_subscription.osint_worker_sub.id
}

output "cyber_subscription_id" {
  value = google_pubsub_subscription.cyber_worker_sub.id
}
