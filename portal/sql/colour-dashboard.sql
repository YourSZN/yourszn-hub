-- Online Colour Analysis client dashboard
-- All tables are service-role only: RLS on, no policies. The browser never
-- touches them directly; everything goes through /api/colour-auth and
-- /api/colour-dashboard, which check the client's signed session first.

create table if not exists public.colour_clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  season text not null,                 -- e.g. 'Light Summer'
  tier text not null default 'standard' check (tier in ('standard','premium')),
  analysis jsonb not null default '{}',   -- optional per-client results, e.g. {"Contrast": "Low (3)"}
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.colour_login_codes (
  id bigserial primary key,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists colour_login_codes_email_idx on public.colour_login_codes (email, created_at desc);

create table if not exists public.colour_client_state (
  client_id uuid primary key references public.colour_clients(id) on delete cascade,
  favourites jsonb not null default '[]',
  quiz jsonb not null default '{}',
  closet jsonb not null default '{}',
  checklist jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.colour_access_log (
  id bigserial primary key,
  client_id uuid references public.colour_clients(id) on delete cascade,
  event text not null,                  -- login | open | logout
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists colour_access_log_client_idx on public.colour_access_log (client_id, created_at desc);

alter table public.colour_clients enable row level security;
alter table public.colour_login_codes enable row level security;
alter table public.colour_client_state enable row level security;
alter table public.colour_access_log enable row level security;
revoke all on public.colour_clients, public.colour_login_codes, public.colour_client_state, public.colour_access_log from anon, authenticated;

-- Private bucket for season guide pages: <season-slug>/pNNN.webp
insert into storage.buckets (id, name, public)
values ('season-guides', 'season-guides', false)
on conflict (id) do update set public = false;

-- Staff view: how many devices / places each client has opened from (spot shared logins)
create or replace view public.colour_access_summary with (security_invoker = true) as
select c.name, c.email, c.season,
       count(*) filter (where l.event = 'login') as logins,
       count(distinct l.user_agent) as devices,
       count(distinct l.ip) as ip_addresses,
       max(l.created_at) as last_seen
from public.colour_clients c
left join public.colour_access_log l on l.client_id = c.id
group by c.id;
revoke all on public.colour_access_summary from anon, authenticated;

-- Optional client passwords + "sign out of all devices" (applied 25 Oct 2026)
alter table public.colour_clients
  add column if not exists password_hash text,              -- scrypt hash, never plain text
  add column if not exists password_set_at timestamptz,
  add column if not exists failed_logins int not null default 0,
  add column if not exists locked_until timestamptz,        -- 15-minute lock after 10 wrong tries
  add column if not exists sessions_valid_after timestamptz not null default now(); -- sessions issued before this are signed out
