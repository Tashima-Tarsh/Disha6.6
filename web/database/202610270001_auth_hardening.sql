-- DISHA 6.6 Auth hardening migration
-- Adds password algorithm tracking, failed-attempt lockout, hashed sessions,
-- passkey credentials, TOTP secrets, backup codes, and auth device tracking.

-- Extend users with password hash algorithm + lockout state
alter table users add column if not exists password_algorithm text;
alter table users add column if not exists failed_attempts integer not null default 0;
alter table users add column if not exists locked_until timestamptz;
alter table users add column if not exists password_changed_at timestamptz not null default now();

-- Hashed sessions (server stores SHA-256 of session ID only)
create table if not exists sessions (
  session_id_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  email text not null,
  roles text[] not null default array['analyst'],
  device_id text,
  ip text,
  geo text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);

-- Passkey / WebAuthn credentials
create table if not exists passkey_credentials (
  credential_id text primary key,
  user_id text not null references users(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkey_credentials_user_id_idx on passkey_credentials (user_id);

-- TOTP secrets (hashed at rest)
create table if not exists totp_secrets (
  user_id text primary key references users(id) on delete cascade,
  secret_hash text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hashed backup codes for MFA recovery
create table if not exists backup_codes (
  code_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists backup_codes_user_id_idx on backup_codes (user_id);

-- Auth device fingerprint tracking
create table if not exists auth_devices (
  device_id text primary key,
  user_id text not null references users(id) on delete cascade,
  user_agent text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_ip text,
  trusted boolean not null default false
);
create index if not exists auth_devices_user_id_idx on auth_devices (user_id);

-- Down migration
-- alter table users drop column if exists password_algorithm;
-- alter table users drop column if exists failed_attempts;
-- alter table users drop column if exists locked_until;
-- alter table users drop column if exists password_changed_at;
-- drop table if exists sessions;
-- drop table if exists passkey_credentials;
-- drop table if exists totp_secrets;
-- drop table if exists backup_codes;
-- drop table if exists auth_devices;
