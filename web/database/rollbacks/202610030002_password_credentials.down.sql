drop index if exists users_active_idx;
drop index if exists users_email_lower_idx;
alter table users drop column if exists disabled_at;
alter table users drop column if exists password_hash;
