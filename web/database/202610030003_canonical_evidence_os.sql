create table if not exists disha_canonical_observations (
  observation_id text primary key,
  source_id text not null,
  source_type text not null,
  source_authority text not null,
  source_tier text not null check (source_tier in ('tier_1_primary_official', 'tier_2_authoritative_secondary', 'tier_3_reputable_reporting', 'tier_4_community_osint', 'tier_5_unverified_assertion')),
  original_url text,
  retrieved_at timestamptz not null default now(),
  published_at timestamptz,
  observed_at timestamptz not null default now(),
  changed_at timestamptz,
  content_hash text not null,
  snapshot_hash text,
  mime_type text not null default 'text/plain',
  language text not null default 'en',
  jurisdiction text not null default 'IN',
  entities jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  indicators jsonb not null default '[]'::jsonb,
  claims jsonb not null default '[]'::jsonb,
  legal_references jsonb not null default '[]'::jsonb,
  related_observations jsonb not null default '[]'::jsonb,
  source_confidence numeric not null default 0.7 check (source_confidence >= 0 and source_confidence <= 1),
  corroboration_count integer not null default 0 check (corroboration_count >= 0),
  contradiction_count integer not null default 0 check (contradiction_count >= 0),
  admission_status text not null default 'pending' check (admission_status in ('pending', 'admitted', 'rejected', 'quarantined')),
  policy_decision jsonb,
  human_review_status text not null default 'not_reviewed' check (human_review_status in ('not_reviewed', 'in_review', 'approved', 'rejected')),
  evidence_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disha_canonical_observations_source_idx
  on disha_canonical_observations (source_id, source_tier);

create index if not exists disha_canonical_observations_hash_idx
  on disha_canonical_observations (content_hash);

create table if not exists disha_canonical_claims (
  claim_id text primary key,
  claim_text text not null,
  claim_type text not null default 'factual_assertion',
  subject text not null,
  predicate text not null,
  value jsonb not null,
  supporting_evidence jsonb not null default '[]'::jsonb,
  contradicting_evidence jsonb not null default '[]'::jsonb,
  source_authority text not null,
  source_family_id text not null,
  corroboration_count integer not null default 0 check (corroboration_count >= 0),
  confidence numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  created_by text not null,
  created_at timestamptz not null default now(),
  review_state text not null default 'unreviewed' check (review_state in ('unreviewed', 'review_required', 'analyst_approved', 'disputed', 'verified')),
  evidence_chain_ref text,
  updated_at timestamptz not null default now()
);

create index if not exists disha_canonical_claims_subject_predicate_idx
  on disha_canonical_claims (subject, predicate);

create index if not exists disha_canonical_claims_review_idx
  on disha_canonical_claims (review_state, confidence desc);

create table if not exists disha_constitutional_entities (
  entity_id text primary key,
  entity_type text not null,
  name text not null,
  canonical_identifier text not null,
  aliases jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0.8 check (confidence >= 0 and confidence <= 1),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  provenance_hash text not null
);

create index if not exists disha_constitutional_entities_type_idx
  on disha_constitutional_entities (entity_type, name);

create table if not exists disha_constitutional_relationships (
  relationship_id text primary key,
  source_entity_id text not null references disha_constitutional_entities(entity_id) on delete cascade,
  target_entity_id text not null references disha_constitutional_entities(entity_id) on delete cascade,
  relation_type text not null,
  source_ref text not null,
  retrieval_timestamp timestamptz not null default now(),
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  evidence_ref text not null,
  content_hash text not null,
  admission_status text not null default 'admitted' check (admission_status in ('pending', 'admitted', 'rejected')),
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed', 'reviewed', 'contested')),
  actor text not null,
  policy_decision_ref text,
  created_at timestamptz not null default now()
);

create index if not exists disha_constitutional_relationships_src_tgt_idx
  on disha_constitutional_relationships (source_entity_id, target_entity_id, relation_type);

create table if not exists disha_evidence_vault_artifacts (
  artifact_id text primary key,
  source_uri text not null,
  content text not null,
  content_hash text not null,
  source_authority text not null,
  mime_type text not null default 'text/plain',
  retrieval_method text not null check (retrieval_method in ('http_get', 'api', 'cli_worker', 'osint_stream', 'manual_upload')),
  collector_version text not null default '6.6.0',
  mission_id text,
  policy_decision_ref text,
  access_classification text not null default 'public' check (access_classification in ('public', 'internal', 'controlled', 'classified')),
  version_index integer not null default 1 check (version_index >= 1),
  previous_artifact_id text references disha_evidence_vault_artifacts(artifact_id),
  created_at timestamptz not null default now()
);

create index if not exists disha_evidence_vault_uri_version_idx
  on disha_evidence_vault_artifacts (source_uri, version_index desc);

create table if not exists disha_evidence_vault_diffs (
  diff_id text primary key,
  previous_artifact_id text not null references disha_evidence_vault_artifacts(artifact_id) on delete cascade,
  new_artifact_id text not null references disha_evidence_vault_artifacts(artifact_id) on delete cascade,
  source_uri text not null,
  change_type text not null check (change_type in ('content_modified', 'metadata_updated', 'superseded')),
  added_lines_count integer not null default 0 check (added_lines_count >= 0),
  removed_lines_count integer not null default 0 check (removed_lines_count >= 0),
  patch_summary text not null,
  change_timestamp timestamptz not null default now()
);

create index if not exists disha_evidence_vault_diffs_uri_idx
  on disha_evidence_vault_diffs (source_uri, change_timestamp desc);

create table if not exists disha_state_transitions (
  transition_id text primary key,
  target_type text not null check (target_type in ('evidence', 'claim', 'observation')),
  target_id text not null,
  previous_state text not null check (previous_state in ('RAW', 'OBSERVED', 'EXTRACTED', 'NORMALIZED', 'ADMITTED', 'CORROBORATED', 'REVIEW_REQUIRED', 'VERIFIED', 'DISPUTED', 'REJECTED', 'SUPERSEDED')),
  new_state text not null check (new_state in ('RAW', 'OBSERVED', 'EXTRACTED', 'NORMALIZED', 'ADMITTED', 'CORROBORATED', 'REVIEW_REQUIRED', 'VERIFIED', 'DISPUTED', 'REJECTED', 'SUPERSEDED')),
  actor text not null,
  is_ai_actor boolean not null default false,
  reason text not null,
  policy_version text not null default '6.6.0',
  evidence_refs jsonb not null default '[]'::jsonb,
  mission_id text,
  execution_id text,
  transition_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists disha_state_transitions_target_idx
  on disha_state_transitions (target_id, created_at asc);

create table if not exists disha_canonical_contradictions (
  contradiction_id text primary key,
  claim_a text not null,
  claim_b text not null,
  evidence_a text not null,
  evidence_b text not null,
  conflict_type text not null,
  explanation text not null,
  confidence numeric not null default 0.75 check (confidence >= 0 and confidence <= 1),
  source_independence boolean not null default true,
  review_required boolean not null default true,
  resolution_state text not null default 'investigating' check (resolution_state in ('investigating', 'sub judice', 'resolved_temporal', 'confirmed_contradiction', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists disha_canonical_contradictions_conflict_type_idx
  on disha_canonical_contradictions (conflict_type, resolution_state);

create table if not exists disha_canonical_corroborations (
  corroboration_id text primary key,
  target_claim_id text not null,
  source_family_ids jsonb not null default '[]'::jsonb,
  independent_source_count integer not null check (independent_source_count >= 0),
  raw_link_count integer not null check (raw_link_count >= 0),
  independence_ratio numeric not null check (independence_ratio >= 0 and independence_ratio <= 1),
  corroboration_score numeric not null check (corroboration_score >= 0 and corroboration_score <= 1),
  confidence_summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists disha_canonical_corroborations_claim_idx
  on disha_canonical_corroborations (target_claim_id);

alter table disha_canonical_observations enable row level security;
alter table disha_canonical_claims enable row level security;
alter table disha_constitutional_entities enable row level security;
alter table disha_constitutional_relationships enable row level security;
alter table disha_evidence_vault_artifacts enable row level security;
alter table disha_evidence_vault_diffs enable row level security;
alter table disha_state_transitions enable row level security;
alter table disha_canonical_contradictions enable row level security;
alter table disha_canonical_corroborations enable row level security;

drop policy if exists disha_canonical_observations_service_policy on disha_canonical_observations;
create policy disha_canonical_observations_service_policy
  on disha_canonical_observations
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_canonical_claims_service_policy on disha_canonical_claims;
create policy disha_canonical_claims_service_policy
  on disha_canonical_claims
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_constitutional_entities_service_policy on disha_constitutional_entities;
create policy disha_constitutional_entities_service_policy
  on disha_constitutional_entities
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_constitutional_relationships_service_policy on disha_constitutional_relationships;
create policy disha_constitutional_relationships_service_policy
  on disha_constitutional_relationships
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_evidence_vault_artifacts_service_policy on disha_evidence_vault_artifacts;
create policy disha_evidence_vault_artifacts_service_policy
  on disha_evidence_vault_artifacts
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_evidence_vault_diffs_service_policy on disha_evidence_vault_diffs;
create policy disha_evidence_vault_diffs_service_policy
  on disha_evidence_vault_diffs
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_state_transitions_service_policy on disha_state_transitions;
create policy disha_state_transitions_service_policy
  on disha_state_transitions
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_canonical_contradictions_service_policy on disha_canonical_contradictions;
create policy disha_canonical_contradictions_service_policy
  on disha_canonical_contradictions
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists disha_canonical_corroborations_service_policy on disha_canonical_corroborations;
create policy disha_canonical_corroborations_service_policy
  on disha_canonical_corroborations
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));
