from __future__ import annotations

SCHEMA_SQL = """
create table if not exists memory (
  id integer primary key autoincrement,
  user_id text not null,
  kind text not null,
  content text not null,
  metadata_json text not null default '{}',
  created_at text not null default current_timestamp
);

create table if not exists events (
  id integer primary key autoincrement,
  event_type text not null,
  source text not null,
  payload_json text not null,
  created_at text not null default current_timestamp
);

create table if not exists risk_logs (
  id integer primary key autoincrement,
  user_id text not null,
  device_id text not null,
  risk_level text not null,
  score real not null,
  action text not null,
  reasons_json text not null,
  created_at text not null default current_timestamp
);

create table if not exists telemetry (
  id integer primary key autoincrement,
  device_id text not null,
  user_id text not null,
  cpu_percent real not null,
  memory_percent real not null,
  process_count integer not null,
  network_sent_kb real not null,
  network_recv_kb real not null,
  active_app text,
  created_at text not null default current_timestamp
);

create table if not exists web_audit_events (
  id integer primary key autoincrement,
  request_id text not null,
  user_id text,
  action text not null,
  resource text,
  outcome text not null,
  metadata_json text not null default '{}',
  created_at text not null default current_timestamp
);

create table if not exists ai_cache (
  cache_key text primary key,
  content_type text not null,
  body_text text not null,
  created_at integer not null
);

create table if not exists memory_graph_nodes (
  user_id text not null,
  node_id text not null,
  label text not null,
  kind text not null,
  weight real not null,
  primary key (user_id, node_id)
);

create table if not exists memory_graph_edges (
  user_id text not null,
  edge_id text not null,
  from_id text not null,
  to_id text not null,
  kind text not null,
  weight real not null,
  primary key (user_id, edge_id)
);

create index if not exists idx_memory_user on memory(user_id, id desc);
create index if not exists idx_events_created on events(created_at desc);
create index if not exists idx_events_type on events(event_type);
create index if not exists idx_telemetry_user on telemetry(user_id, id desc);
create index if not exists idx_web_audit_req on web_audit_events(request_id);
"""
