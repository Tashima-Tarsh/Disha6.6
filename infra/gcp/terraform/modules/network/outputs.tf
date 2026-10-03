output "vpc_id" {
  value = google_compute_network.vpc.id
}

output "vpc_name" {
  value = google_compute_network.vpc.name
}

output "app_subnet_id" {
  value = google_compute_subnetwork.app_subnet.id
}

output "app_subnet_name" {
  value = google_compute_subnetwork.app_subnet.name
}

output "serverless_connector_id" {
  value = google_vpc_access_connector.serverless_connector.id
}

output "private_vpc_connection" {
  value = google_service_networking_connection.private_vpc_connection.id
}
