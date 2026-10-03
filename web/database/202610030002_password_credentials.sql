alter table users add column if not exists password_hash text;
alter table users add column if not exists disabled_at timestamptz;

create index if not exists users_email_lower_idx on users (lower(email));
create index if not exists users_active_idx on users (disabled_at) where disabled_at is null;
