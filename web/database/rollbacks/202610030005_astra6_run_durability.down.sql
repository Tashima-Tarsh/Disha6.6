drop index if exists astra6_connector_runs_lease_idx;

alter table astra6_connector_runs
  drop column if exists max_attempts,
  drop column if exists next_attempt_at,
  drop column if exists lease_expires_at;
