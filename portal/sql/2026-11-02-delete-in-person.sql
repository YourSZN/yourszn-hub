-- To apply on "go" for the admin Clients page, as Supabase migration "delete_in_person_data".
-- Latisha decided (2 Nov 2026) to stop in-person work and delete its data, with no export.
-- THIS CANNOT BE UNDONE (Supabase daily backups are the only way back, for 7 days).
--
-- Removes:
--   in_person_bookings  (in-person bookings)
--   in_person_persons   (people attached to each booking)
--   client_slots        (the hidden "Appointment Slots" grid on the old Clients page)
--   notifications about in-person bookings and their photos
--
-- The 71 photos in the storage bucket "in-person-photos" can't be deleted with SQL.
-- Empty and delete that bucket in the Supabase dashboard: Storage > in-person-photos >
-- select all > Delete, then the bucket's menu > Delete bucket.

delete from public.notifications where type in ('new_booking', 'booking_photos');
drop table if exists public.in_person_persons;
drop table if exists public.in_person_bookings;
drop table if exists public.client_slots;
