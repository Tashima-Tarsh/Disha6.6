-- Rollback for 202610030004_cyber_defense_attack_surface.sql

drop table if exists disha_worker_heartbeats cascade;
drop table if exists disha_worker_jobs cascade;
drop table if exists disha_threat_indicators cascade;
drop table if exists disha_vulnerabilities_kev cascade;
drop table if exists disha_attack_surface_assets cascade;
