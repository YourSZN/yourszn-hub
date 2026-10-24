-- Lock down client data (applied 24 Oct 2026)
-- Before: anyone with the public (anon) key could read, edit and delete online
-- colour analysis submissions/results/photos, in-person bookings, inspiration
-- boards, and the client photo buckets were public.
-- After:
--   * Client forms can still SUBMIT (insert / upload only), but can't read anything back.
--   * Staff (signed-in hub users) keep full access.
--   * Client pages read through the server APIs (service role), as they already do.
--   * Photo buckets are private; staff pages show them via ysz-private-media.js signed links.

-- Online colour analysis: keep anon INSERT on szn_submissions + szn_photos (the form), remove the rest
drop policy if exists anon_select_submissions on public.szn_submissions;
drop policy if exists anon_update_submissions on public.szn_submissions;
drop policy if exists anon_delete_submissions on public.szn_submissions;
drop policy if exists "Allow anon select on szn_photos" on public.szn_photos;
drop policy if exists "Allow anon update on szn_photos" on public.szn_photos;
drop policy if exists "Allow anon delete on szn_photos" on public.szn_photos;
drop policy if exists anon_all_results on public.szn_results;
drop policy if exists anon_all_notes on public.szn_notes;
create policy staff_all_szn_photos on public.szn_photos for all to authenticated using (true) with check (true);
create policy staff_insert_submissions on public.szn_submissions for insert to authenticated with check (true);

-- In-person bookings: clients go through /api/client-booking, so no public access at all
drop policy if exists "Allow anon select on in_person_bookings" on public.in_person_bookings;
drop policy if exists "Allow anon insert on in_person_bookings" on public.in_person_bookings;
drop policy if exists "Allow anon update on in_person_bookings" on public.in_person_bookings;
drop policy if exists "Allow anon delete on in_person_bookings" on public.in_person_bookings;
drop policy if exists "Allow anon select on in_person_persons" on public.in_person_persons;
drop policy if exists "Allow anon insert on in_person_persons" on public.in_person_persons;
drop policy if exists "Allow anon update on in_person_persons" on public.in_person_persons;
drop policy if exists "Allow anon delete on in_person_persons" on public.in_person_persons;
create policy staff_only_in_person_bookings on public.in_person_bookings for all to authenticated using (true) with check (true);
create policy staff_only_in_person_persons on public.in_person_persons for all to authenticated using (true) with check (true);

-- Inspiration boards: clients go through /api/vietnam-board
drop policy if exists anon_all_inspiration_admin_notes on public.inspiration_admin_notes;
drop policy if exists anon_all_inspiration_clients on public.inspiration_clients;
drop policy if exists anon_all_inspiration_items on public.inspiration_items;
drop policy if exists anon_all_inspiration_measurements on public.inspiration_measurements;
drop policy if exists anon_all_inspiration_photos on public.inspiration_photos;
drop policy if exists "Allow anon select on inspiration_item_colours" on public.inspiration_item_colours;
drop policy if exists "Allow anon insert on inspiration_item_colours" on public.inspiration_item_colours;
drop policy if exists "Allow anon update on inspiration_item_colours" on public.inspiration_item_colours;
drop policy if exists "Allow anon delete on inspiration_item_colours" on public.inspiration_item_colours;
create policy staff_only_inspiration_admin_notes on public.inspiration_admin_notes for all to authenticated using (true) with check (true);
create policy staff_only_inspiration_clients on public.inspiration_clients for all to authenticated using (true) with check (true);
create policy staff_only_inspiration_items on public.inspiration_items for all to authenticated using (true) with check (true);
create policy staff_only_inspiration_measurements on public.inspiration_measurements for all to authenticated using (true) with check (true);
create policy staff_only_inspiration_photos on public.inspiration_photos for all to authenticated using (true) with check (true);
create policy staff_only_inspiration_item_colours on public.inspiration_item_colours for all to authenticated using (true) with check (true);

-- Photo buckets: private. Public keeps UPLOAD only where client pages upload directly.
update storage.buckets set public = false
 where id in ('in-person-photos','online-clients-photos','inspiration-photos','online-clients-submissions','yszn-clients');
drop policy if exists "Allow anon read from online-clients-photos" on storage.objects;
drop policy if exists "Allow anon delete from online-clients-photos" on storage.objects;
drop policy if exists "Allow anon read in-person-photos" on storage.objects;
drop policy if exists "Allow anon delete in-person-photos" on storage.objects;
drop policy if exists public_read_inspiration on storage.objects;
drop policy if exists public_update_inspiration on storage.objects;
drop policy if exists public_delete_inspiration on storage.objects;
-- kept: "Allow anon upload in-person-photos", "Allow anon upload to online-clients-photos", public_insert_inspiration
create policy staff_read_client_photos on storage.objects for select to authenticated
  using (bucket_id in ('in-person-photos','online-clients-photos','inspiration-photos','yszn-clients'));
create policy staff_update_client_photos on storage.objects for update to authenticated
  using (bucket_id in ('in-person-photos','online-clients-photos','inspiration-photos','yszn-clients'));
create policy staff_delete_client_photos on storage.objects for delete to authenticated
  using (bucket_id in ('in-person-photos','online-clients-photos','inspiration-photos','yszn-clients'));
create policy staff_insert_client_photos on storage.objects for insert to authenticated
  with check (bucket_id in ('online-clients-photos','yszn-clients'));
