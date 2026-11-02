-- To apply on "go" for the admin Clients page, as Supabase migration "profiles_role_lock".
--
-- Why: the Clients page is admin-only, and the server decides who is an admin from
-- profiles.role. Until now a signed-in staff member could edit their own profile row,
-- including the role column, and so make themselves an admin.
-- After this, people can still edit their own name and photo, but not their role.
-- Roles are changed in the Supabase dashboard (or by the service role) only.

revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Undo:
-- grant update on public.profiles to authenticated;
