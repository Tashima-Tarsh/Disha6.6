-- Remove permissive catch-all policies from cyber/worker tables.
-- Application access uses the trusted server database role; public/Data API roles receive no direct access.

drop policy if exists p_disha_attack_surface_all on disha_attack_surface_assets;
drop policy if exists p_disha_vulnerabilities_all on disha_vulnerabilities_kev;
drop policy if exists p_disha_threat_indicators_all on disha_threat_indicators;
drop policy if exists p_disha_worker_jobs_all on disha_worker_jobs;
drop policy if exists p_disha_worker_heartbeats_all on disha_worker_heartbeats;

revoke all privileges on table disha_attack_surface_assets from public;
revoke all privileges on table disha_vulnerabilities_kev from public;
revoke all privileges on table disha_threat_indicators from public;
revoke all privileges on table disha_worker_jobs from public;
revoke all privileges on table disha_worker_heartbeats from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on table disha_attack_surface_assets from anon;
    revoke all privileges on table disha_vulnerabilities_kev from anon;
    revoke all privileges on table disha_threat_indicators from anon;
    revoke all privileges on table disha_worker_jobs from anon;
    revoke all privileges on table disha_worker_heartbeats from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on table disha_attack_surface_assets from authenticated;
    revoke all privileges on table disha_vulnerabilities_kev from authenticated;
    revoke all privileges on table disha_threat_indicators from authenticated;
    revoke all privileges on table disha_worker_jobs from authenticated;
    revoke all privileges on table disha_worker_heartbeats from authenticated;
  end if;
end
$$;
