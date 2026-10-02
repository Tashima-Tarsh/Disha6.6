create table if not exists password_credentials (
  user_id text primary key references users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  disabled_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists refresh_tokens_active_session_idx
  on refresh_tokens (session_id, user_id) where revoked_at is null;
create index if not exists refresh_tokens_user_idx on refresh_tokens (user_id);
