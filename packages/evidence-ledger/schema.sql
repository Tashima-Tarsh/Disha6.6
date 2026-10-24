-- Evidence Ledger v3 — Postgres schema
-- Governing documents: CONSTITUTION.md, docs/EVIDENCE_LEDGER_V3.md

CREATE TABLE IF NOT EXISTS evidence_events (
  id                  TEXT PRIMARY KEY,
  previous_hash       TEXT NOT NULL,
  hash                TEXT NOT NULL,
  timestamp           TIMESTAMPTZ NOT NULL,
  actor_type          TEXT NOT NULL,
  actor_id            TEXT NOT NULL,
  actor_display_name  TEXT,
  event_type          TEXT NOT NULL,
  payload             JSONB NOT NULL,
  sources             JSONB NOT NULL DEFAULT '[]',
  verification        TEXT NOT NULL,
  policy_id           TEXT NOT NULL,
  policy_decision     TEXT NOT NULL,
  policy_reasons      JSONB NOT NULL DEFAULT '[]',
  mission_id          TEXT,
  case_id             TEXT,
  signature           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_mission
  ON evidence_events (mission_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_evidence_verification
  ON evidence_events (verification);

CREATE INDEX IF NOT EXISTS idx_evidence_actor
  ON evidence_events (actor_id);

CREATE INDEX IF NOT EXISTS idx_evidence_timestamp
  ON evidence_events (timestamp);

-- Optional: missions table (can be expanded later)
CREATE TABLE IF NOT EXISTS missions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  state       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  created_by  JSONB NOT NULL,
  tags        JSONB NOT NULL DEFAULT '[]',
  evidence_ids JSONB NOT NULL DEFAULT '[]'
);
