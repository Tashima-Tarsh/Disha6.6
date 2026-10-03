-- Rollback restores the prior permissive policies for migration reversibility.
-- Do not use this rollback in production unless the data-access implications are understood.

create policy p_disha_attack_surface_all on disha_attack_surface_assets for all using (true) with check (true);
create policy p_disha_vulnerabilities_all on disha_vulnerabilities_kev for all using (true) with check (true);
create policy p_disha_threat_indicators_all on disha_threat_indicators for all using (true) with check (true);
create policy p_disha_worker_jobs_all on disha_worker_jobs for all using (true) with check (true);
create policy p_disha_worker_heartbeats_all on disha_worker_heartbeats for all using (true) with check (true);
