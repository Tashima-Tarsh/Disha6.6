begin;

-- Remove only the deterministic records created by the retired
-- web/scripts/seed-production-data.mjs script. Do not delete user accounts:
-- those may have been converted into legitimate production principals.

delete from geospatial_feature_links
where feature_id like 'geo-point-ent-%'
  and ref_id in (
    'ent-cert-in','ent-mumbai-subsea','ent-blr-cloud','ent-hyd-threatlab',
    'ent-chn-fiber','ent-kol-eastern','ent-pune-vault','ent-ahd-grid',
    'ent-kch-fiber','ent-sin-bridge','ent-fra-interconnect','ent-tok-station',
    'ent-sat-link','ent-vyuha-engine'
  );

delete from geospatial_datasets
where dataset_id = 'ds-strategic-cyber-infrastructure'
  and source_id = 'src-strategic-defense-grid';

delete from geospatial_import_jobs
where import_job_id = 'job-strategic-cyber-20261002'
  and source_id = 'src-strategic-defense-grid';

delete from analyst_review_queue
where change_id = 'chg-2026-vyuha-01';

delete from intelligence_change_events
where change_id = 'chg-2026-vyuha-01'
  and source_id = 'src-policy-gate';

delete from evidence_lineage_nodes
where node_id = 'node-lineage-certin-01'
  and source_id = 'src-cert-in';

delete from evidence_events
where event_id in (
  'EV-2026-GENESIS-001',
  'EV-2026-VYUHA-002',
  'EV-2026-MUMBAI-003'
)
and mission_id = 'MIS-2026-CHAKRA-09-admin';

delete from mission_results
where mission_id in (
  'MIS-2026-CHAKRA-09-admin',
  'MIS-2026-CHAKRA-09-nitish',
  'MIS-2026-CRIT-GRID-LOCK-admin',
  'MIS-2026-CRIT-GRID-LOCK-nitish',
  'MIS-2026-ORBIT-SAT-TRACK-admin',
  'MIS-2026-ORBIT-SAT-TRACK-nitish'
);

delete from missions
where mission_id in (
  'MIS-2026-CHAKRA-09-admin',
  'MIS-2026-CHAKRA-09-nitish',
  'MIS-2026-CRIT-GRID-LOCK-admin',
  'MIS-2026-CRIT-GRID-LOCK-nitish',
  'MIS-2026-ORBIT-SAT-TRACK-admin',
  'MIS-2026-ORBIT-SAT-TRACK-nitish'
);

delete from intelligence_edges
where edge_id in (
  'edge-01','edge-02','edge-03','edge-04','edge-05',
  'edge-06','edge-07','edge-08','edge-09','edge-10'
);

delete from intelligence_entities
where entity_id in (
  'ent-cert-in','ent-mumbai-subsea','ent-blr-cloud','ent-hyd-threatlab',
  'ent-chn-fiber','ent-kol-eastern','ent-pune-vault','ent-ahd-grid',
  'ent-kch-fiber','ent-sin-bridge','ent-fra-interconnect','ent-tok-station',
  'ent-sat-link','ent-vyuha-engine'
);

commit;
