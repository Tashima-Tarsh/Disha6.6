output "host" {
  value = google_redis_instance.redis.host
}

output "port" {
  value = google_redis_instance.redis.port
}

output "auth_string" {
  value     = google_redis_instance.redis.auth_string
  sensitive = true
}
