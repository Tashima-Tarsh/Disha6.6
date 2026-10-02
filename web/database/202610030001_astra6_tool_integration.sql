create table if not exists astra6_tool_manifests (
  tool_id text primary key,
  name text not null,
  version text not null,
  repository text not null,
  license text not null,
  execution_class text not null check (execution_class in ('passive_public', 'credentialed_public_api', 'active_recon', 'identity_enumeration', 'prohibited')),
  target_types text[] not null default array[]::text[],
  capabilities text[] not null default array[]::text[],
  passive_module_allowlist text[] not null default array[]::text[],
  blocked_modules text[] not null default array[]::text[],
  worker_runtime text not null check (worker_runtime in ('python', 'go', 'node')),
  cli_command text not null,
  output_format text not null check (output_format in ('json', 'csv', 'ndjson', 'text')),
  timeout_ms integer not null check (timeout_ms > 0),
  max_retries integer not null default 1 check (max_retries >= 0),
  rate_limit_per_minute integer not null default 10 check (rate_limit_per_minute > 0),
  manifest_hash text not null,
  enabled boolean not null default false,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astra6_tool_manifests_enabled_idx
  on astra6_tool_manifests (enabled, tool_id);

create table if not exists astra6_connector_health (
  tool_id text not null references astra6_tool_manifests(tool_id) on delete cascade,
  status text not null check (status in ('healthy', 'degraded', 'unavailable', 'not_configured')),
  detail text,
  checked_at timestamptz not null default now(),
  primary key (tool_id, checked_at)
);

create index if not exists astra6_connector_health_latest_idx
  on astra6_connector_health (tool_id, checked_at desc);

create table if not exists astra6_connector_runs (
  run_id text primary key,
  tool_id text not null references astra6_tool_manifests(tool_id) on delete cascade,
  mission_id text,
  user_id text not null,
  target text not null,
  target_type text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled', 'timed_out', 'blocked_by_policy')),
  dispatch_input jsonb not null default '{}'::jsonb,
  raw_output text,
  parsed_output jsonb,
  evidence jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error text,
  attempts integer not null default 0 check (attempts >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  worker_id text,
  provenance_hash text not null,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists astra6_connector_runs_tool_idx
  on astra6_connector_runs (tool_id, queued_at desc);
create index if not exists astra6_connector_runs_mission_idx
  on astra6_connector_runs (mission_id, queued_at desc);
create index if not exists astra6_connector_runs_user_idx
  on astra6_connector_runs (user_id, queued_at desc);
create index if not exists astra6_connector_runs_status_idx
  on astra6_connector_runs (status, queued_at desc);

create table if not exists astra6_observations (
  observation_id text primary key,
  run_id text not null references astra6_connector_runs(run_id) on delete cascade,
  tool_id text not null,
  entity_type text not null,
  entity_value text not null,
  confidence numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  source_module text,
  raw_data jsonb,
  provenance_hash text not null,
  observed_at timestamptz not null default now()
);

create index if not exists astra6_observations_run_idx
  on astra6_observations (run_id, observed_at asc);
create index if not exists astra6_observations_entity_idx
  on astra6_observations (entity_type, entity_value);
create index if not exists astra6_observations_tool_idx
  on astra6_observations (tool_id, observed_at desc);

create table if not exists astra6_entities (
  entity_id text primary key,
  entity_type text not null,
  entity_value text not null,
  canonical_value text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source_tool_ids text[] not null default array[]::text[],
  observation_count integer not null default 1 check (observation_count > 0),
  merged_entity_id text,
  entity_hash text not null
);

create unique index if not exists astra6_entities_canonical_idx
  on astra6_entities (entity_type, canonical_value);
create index if not exists astra6_entities_merged_idx
  on astra6_entities (merged_entity_id) where merged_entity_id is not null;
create index if not exists astra6_entities_last_seen_idx
  on astra6_entities (last_seen_at desc);

alter table public.astra6_tool_manifests enable row level security;
alter table public.astra6_connector_health enable row level security;
alter table public.astra6_connector_runs enable row level security;
alter table public.astra6_observations enable row level security;
alter table public.astra6_entities enable row level security;

revoke all privileges on public.astra6_tool_manifests from public;
revoke all privileges on public.astra6_connector_health from public;
revoke all privileges on public.astra6_connector_runs from public;
revoke all privileges on public.astra6_observations from public;
revoke all privileges on public.astra6_entities from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on public.astra6_tool_manifests from anon;
    revoke all privileges on public.astra6_connector_health from anon;
    revoke all privileges on public.astra6_connector_runs from anon;
    revoke all privileges on public.astra6_observations from anon;
    revoke all privileges on public.astra6_entities from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on public.astra6_tool_manifests from authenticated;
    revoke all privileges on public.astra6_connector_health from authenticated;
    revoke all privileges on public.astra6_connector_runs from authenticated;
    revoke all privileges on public.astra6_observations from authenticated;
    revoke all privileges on public.astra6_entities from authenticated;
  end if;
end
$$;
