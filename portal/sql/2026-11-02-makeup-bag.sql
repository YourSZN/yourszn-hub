-- Applied 2026-11-02 as Supabase migration "colour_state_makeup_bag".
-- The season-driven Colour Dashboard lets clients save makeup products to "My bag".
-- Saved with their other progress (favourites, quizzes, closet) so it follows them across devices.
alter table public.colour_client_state add column if not exists makeup_bag jsonb not null default '[]';

-- Undo:
-- alter table public.colour_client_state drop column if exists makeup_bag;
