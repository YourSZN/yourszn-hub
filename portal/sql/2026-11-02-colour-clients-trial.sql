-- Applied 2026-11-02 as Supabase migration "colour_clients_trial".
-- Trial clients try a finished season's dashboard (True Spring) before their own season
-- is built. The dashboard shows them a banner saying so. Giving dashboard access from the
-- staff hub's Clients page (a real result) switches it off.

alter table public.colour_clients add column if not exists trial boolean not null default false;
comment on column public.colour_clients.trial is 'Trying another season''s dashboard before their own is built; shows a banner.';

-- Undo:
-- alter table public.colour_clients drop column if exists trial;
