CREATE TABLE IF NOT EXISTS authorization_grants (
    grant_id VARCHAR(128) PRIMARY KEY,
    scope VARCHAR(64) NOT NULL,
    tool_id VARCHAR(128),
    target_pattern VARCHAR(512),
    granted_to VARCHAR(128) NOT NULL,
    approved_by VARCHAR(128) NOT NULL,
    approver_role VARCHAR(64) NOT NULL,
    purpose TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    signature VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS idx_auth_grants_granted_to ON authorization_grants (granted_to);
CREATE INDEX IF NOT EXISTS idx_auth_grants_expires_at ON authorization_grants (expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_grants_revoked ON authorization_grants (revoked);

