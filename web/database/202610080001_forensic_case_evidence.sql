create table if not exists forensic_cases (
  case_id text primary key,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'restricted', 'closed', 'sealed')),
  authorization_scope text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forensic_cases_status_idx
  on forensic_cases (status, updated_at desc);

create table if not exists forensic_evidence_packages (
  evidence_id text primary key,
  case_id text not null references forensic_cases(case_id) on delete restrict,
  original_filename text not null,
  mime_type text not null default 'application/octet-stream',
  byte_size bigint not null check (byte_size >= 0),
  sha256 text not null,
  original_bytes_base64 text not null,
  acquisition_method text not null,
  source_description text not null,
  authorization_scope text not null,
  acquiring_actor text not null,
  acquired_at timestamptz not null,
  immutable_storage text not null default 'postgres_base64_v1',
  sensitive_personal_data_detected boolean not null default false,
  status text not null default 'preserved' check (status in ('preserved', 'parsed', 'quarantined', 'superseded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, sha256)
);

create index if not exists forensic_evidence_case_idx
  on forensic_evidence_packages (case_id, created_at desc);

create index if not exists forensic_evidence_hash_idx
  on forensic_evidence_packages (sha256);

create table if not exists forensic_evidence_transformations (
  transformation_id text primary key,
  evidence_id text not null references forensic_evidence_packages(evidence_id) on delete cascade,
  case_id text not null references forensic_cases(case_id) on delete restrict,
  transformation_type text not null,
  tool_name text not null,
  tool_version text not null,
  input_hash text not null,
  output_hash text not null,
  field_mappings jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  actor text not null,
  created_at timestamptz not null default now()
);

create index if not exists forensic_transformations_evidence_idx
  on forensic_evidence_transformations (evidence_id, created_at asc);

alter table forensic_cases enable row level security;
alter table forensic_evidence_packages enable row level security;
alter table forensic_evidence_transformations enable row level security;

drop policy if exists forensic_cases_service_policy on forensic_cases;
create policy forensic_cases_service_policy
  on forensic_cases
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists forensic_evidence_packages_service_policy on forensic_evidence_packages;
create policy forensic_evidence_packages_service_policy
  on forensic_evidence_packages
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));

drop policy if exists forensic_evidence_transformations_service_policy on forensic_evidence_transformations;
create policy forensic_evidence_transformations_service_policy
  on forensic_evidence_transformations
  for all
  using (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'))
  with check (current_user in ('disha_app', 'disha', 'postgres', 'disha_owner'));
