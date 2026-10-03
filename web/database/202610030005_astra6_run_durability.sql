-- ASTRA 6 durable connector leases and retry scheduling.
-- Existing queued/running rows remain compatible; workers reclaim expired leases.

alter table astra6_connector_runs
  add column if not exists lease_expires_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists max_attempts integer not null default 3 check (max_attempts >= 1 and max_attempts <= 20);

create index if not exists astra6_connector_runs_lease_idx
  on astra6_connector_runs (status, next_attempt_at, lease_expires_at, queued_at);

update astra6_connector_runs
set next_attempt_at = coalesce(next_attempt_at, queued_at, now())
where next_attempt_at is null;
