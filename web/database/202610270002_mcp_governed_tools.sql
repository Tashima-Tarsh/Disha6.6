-- DISHA 6.6 — MCP governed tool registry & call log
-- Mounts external MCP servers (nuclei, hexstrike, pentagi, projectdiscovery, ...)
-- and records every governed call in the hash-chained Evidence Ledger.
-- R9: Mount, do not merge — upstream tools stay in their own processes.

-- Registry of mounted MCP servers.
create table if not exists mcp_servers (
  server_id text primary key,
  name text not null,
  transport text not null check (transport in ('stdio', 'sse', 'streamable-http')),
  command text,
  url text,
  side_effect_class text not null check (side_effect_class in ('read', 'write', 'execute', 'exploit')),
  trust_level text not null check (trust_level in ('untrusted', 'restricted', 'trusted')),
  timeout_ms integer not null default 30000,
  concurrency_cap integer not null default 5,
  budget_per_mission integer,
  enabled boolean not null default true,
  registered_at timestamptz not null default now(),
  notes text
);
create index if not exists mcp_servers_enabled_idx on mcp_servers (enabled);

-- Discovered, namespaced tools per server.
create table if not exists mcp_tools (
  namespaced_tool text primary key,      -- e.g. "nuclei.scan"
  server_id text not null references mcp_servers(server_id) on delete cascade,
  tool_name text not null,
  input_schema jsonb,
  output_schema jsonb,
  description text,
  side_effect_class text not null check (side_effect_class in ('read', 'write', 'execute', 'exploit')),
  cost_estimate integer not null default 1,
  timeout_ms integer not null default 30000,
  concurrency_cap integer not null default 5,
  discovered_at timestamptz not null default now()
);
create index if not exists mcp_tools_server_id_idx on mcp_tools (server_id);

-- Governed call log (mirrors the hash-chained Evidence Ledger entries).
create table if not exists mcp_calls (
  call_id text primary key,
  mission_id text not null,
  actor text not null,
  namespaced_tool text not null,
  server_id text not null,
  decision text not null check (decision in ('ALLOW', 'DENY', 'ASK_CONFIRMATION', 'ESCALATE')),
  denial_reason text,
  target text,
  inferred boolean not null default false,
  risk_score numeric not null default 0 check (risk_score >= 0 and risk_score <= 1),
  duration_ms integer not null,
  evidence_event_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists mcp_calls_mission_idx on mcp_calls (mission_id, created_at desc);
create index if not exists mcp_calls_tool_idx on mcp_calls (namespaced_tool, created_at desc);
create index if not exists mcp_calls_decision_idx on mcp_calls (decision);

-- Down migration
-- drop table if exists mcp_calls;
-- drop table if exists mcp_tools;
-- drop table if exists mcp_servers;
