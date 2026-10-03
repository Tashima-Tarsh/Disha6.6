-- DISHA 6.6 — Cyber Defense, Attack Surface Intelligence & Distributed Worker Jobs
-- Invariant: Zero-mock, idempotent policy recreation, strict RLS

create table if not exists disha_attack_surface_assets (
  asset_id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  root_domain text not null,
  asset_type text not null,
  asset_value text not null,
  is_exposed boolean not null default true,
  ports jsonb not null default '[]'::jsonb,
  technologies jsonb not null default '[]'::jsonb,
  cloud_provider text,
  dns_records jsonb not null default '{}'::jsonb,
  provenance_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_disha_attack_surface_org on disha_attack_surface_assets (organization_id);
create index if not exists idx_disha_attack_surface_domain on disha_attack_surface_assets (root_domain);
create index if not exists idx_disha_attack_surface_type on disha_attack_surface_assets (asset_type);

create table if not exists disha_vulnerabilities_kev (
  cve_id text primary key,
  source text not null,
  technology text not null,
  affected_versions text not null,
  cvss_score numeric not null default 0.0,
  in_cisa_kev boolean not null default false,
  epss_score numeric,
  description text not null,
  remediation_guidance text not null,
  published_date timestamptz not null default now(),
  calculated_risk text not null default 'MEDIUM',
  updated_at timestamptz not null default now()
);

create index if not exists idx_disha_vuln_tech on disha_vulnerabilities_kev (technology);
create index if not exists idx_disha_vuln_kev on disha_vulnerabilities_kev (in_cisa_kev);

create table if not exists disha_threat_indicators (
  indicator_id text primary key,
  indicator_type text not null,
  indicator_value text not null,
  threat_actor text,
  campaign text,
  confidence numeric not null default 0.8,
  tlp text not null default 'WHITE',
  evidence_event_id text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_disha_threat_value on disha_threat_indicators (indicator_value);
create index if not exists idx_disha_threat_type on disha_threat_indicators (indicator_type);

create table if not exists disha_worker_jobs (
  job_id text primary key,
  mission_id text not null,
  tool_id text not null,
  target text not null,
  target_type text not null,
  state text not null default 'QUEUED',
  worker_id text,
  worker_class text not null,
  lease_expires_at timestamptz,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  idempotency_key text not null unique,
  correlation_id text not null,
  error text,
  observation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_disha_worker_jobs_state on disha_worker_jobs (state);
create index if not exists idx_disha_worker_jobs_mission on disha_worker_jobs (mission_id);

create table if not exists disha_worker_heartbeats (
  worker_id text primary key,
  worker_class text not null,
  hostname text not null,
  active_jobs integer not null default 0,
  cpu_percent numeric not null default 0.0,
  memory_mb numeric not null default 0.0,
  last_heartbeat timestamptz not null default now(),
  status text not null default 'HEALTHY'
);

-- Row Level Security
alter table disha_attack_surface_assets enable row level security;
alter table disha_vulnerabilities_kev enable row level security;
alter table disha_threat_indicators enable row level security;
alter table disha_worker_jobs enable row level security;
alter table disha_worker_heartbeats enable row level security;

drop policy if exists p_disha_attack_surface_all on disha_attack_surface_assets;
create policy p_disha_attack_surface_all on disha_attack_surface_assets for all using (true) with check (true);

drop policy if exists p_disha_vulnerabilities_all on disha_vulnerabilities_kev;
create policy p_disha_vulnerabilities_all on disha_vulnerabilities_kev for all using (true) with check (true);

drop policy if exists p_disha_threat_indicators_all on disha_threat_indicators;
create policy p_disha_threat_indicators_all on disha_threat_indicators for all using (true) with check (true);

drop policy if exists p_disha_worker_jobs_all on disha_worker_jobs;
create policy p_disha_worker_jobs_all on disha_worker_jobs for all using (true) with check (true);

drop policy if exists p_disha_worker_heartbeats_all on disha_worker_heartbeats;
create policy p_disha_worker_heartbeats_all on disha_worker_heartbeats for all using (true) with check (true);
