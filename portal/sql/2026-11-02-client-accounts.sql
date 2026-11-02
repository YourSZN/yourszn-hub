-- Applied 2026-11-02 as Supabase migration "client_accounts".
-- One optional password per client email for the whole client site (portal front page
-- and colour dashboard). Used by portal/api/_accounts.js.
--
-- Service role only: RLS on, no policies. The browser never touches it.
-- Existing colour dashboard passwords are copied in, so nobody has to set theirs again.
-- colour_clients.password_hash / password_set_at / failed_logins / locked_until are no
-- longer used by the code; drop them in the accounts-and-roles pass.

create table if not exists public.client_accounts (
  email text primary key check (email = lower(email)),
  password_hash text,
  password_set_at timestamptz,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  sessions_valid_after timestamptz,   -- sessions issued before this are signed out
  created_at timestamptz not null default now()
);

alter table public.client_accounts enable row level security;
revoke all on public.client_accounts from anon, authenticated;

insert into public.client_accounts (email, password_hash, password_set_at, sessions_valid_after)
select email, password_hash, password_set_at, sessions_valid_after
from public.colour_clients
where password_hash is not null
on conflict (email) do nothing;

comment on table public.client_accounts is 'Client site passwords (one per email). Service role only, via portal/api/_accounts.js.';

-- Undo:
-- drop table if exists public.client_accounts;
