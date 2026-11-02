-- Applied 2026-11-02 as Supabase migration "oca_clients_admin_page".
-- Used by the staff hub's Clients page through /api/admin-clients (repository root).
--
-- One row per Online Colour Analysis client, keyed by the email they sign in with.
-- Holds what Latisha sets by hand: paid, tier and the season from her drape.
-- (The questionnaire itself stays in szn_submissions; dashboard access stays in
-- colour_clients.)
--
-- Service role only: RLS on, no policies. Staff never read or write it directly;
-- the API checks the person is an admin first.

create table if not exists public.oca_clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),  -- the email they sign in with
  name text not null default '',
  paid boolean not null default false,
  paid_at timestamptz,
  paid_email text check (paid_email is null or paid_email = lower(paid_email)),  -- only if they paid with a different email
  tier text not null default 'standard' check (tier in ('standard','premium')),
  drape_season text,             -- Latisha's result from the drape (not the client's guess)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text                -- staff email of the last change
);

alter table public.oca_clients enable row level security;
revoke all on public.oca_clients from anon, authenticated;

comment on table public.oca_clients is 'Online Colour Analysis clients: paid, tier, drape season. Service role only, via /api/admin-clients.';

-- Undo:
-- drop table if exists public.oca_clients;
