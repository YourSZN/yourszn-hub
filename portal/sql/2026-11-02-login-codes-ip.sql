-- Applied 2026-11-02 as Supabase migration "login_codes_ip_rate_limit".
-- Kept here so the change is visible next to the code that uses it (portal/api/_login-codes.js).
--
-- Sign-in codes can now be requested by anyone on the client portal front page,
-- so limit them per IP address as well as per email.
alter table public.colour_login_codes add column if not exists ip text;
create index if not exists colour_login_codes_email_created_idx on public.colour_login_codes (email, created_at desc);
create index if not exists colour_login_codes_ip_created_idx on public.colour_login_codes (ip, created_at desc);
comment on column public.colour_login_codes.ip is 'IP that requested the code, for rate limiting only. Rows older than 7 days are deleted.';
delete from public.colour_login_codes where created_at < now() - interval '7 days';

-- Undo:
-- drop index if exists public.colour_login_codes_ip_created_idx;
-- drop index if exists public.colour_login_codes_email_created_idx;
-- alter table public.colour_login_codes drop column if exists ip;
