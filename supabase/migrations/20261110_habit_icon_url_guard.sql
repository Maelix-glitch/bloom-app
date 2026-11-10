-- 20261110: habit icon_url egress guard.
--
-- Incident (2026-11-10): one habit row carried a whole photo as a base64
-- `data:` URI in icon_url — about 1.5 MB of text inside the row — and every
-- habits fetch re-downloaded it (the client reads habits with select *),
-- burning ~47 GB of Supabase egress in one billing cycle and getting the
-- project restricted for quota overuse. The blob has been removed from the
-- live row; this constraint makes the class impossible at the database:
-- icon_url holds a real remote URL or it holds nothing. The client enforces
-- the same rule on read and on write (safeIconUrl in
-- src/lib/home/habits.ts); this is the backstop for every other client.
--
-- Idempotent: safe to re-run. Note the ADD validates existing rows, so it
-- will refuse while a violating row remains — clean legacy blobs first.

alter table public.habits drop constraint if exists habits_icon_url_guard;
alter table public.habits add constraint habits_icon_url_guard
  check (icon_url is null or (icon_url not like 'data:%' and length(icon_url) <= 2048));
