-- Bloom — Story Platform: display-name snapshots on interactions.
-- The app has no public user directory, so the story owner would otherwise
-- see "someone reacted" with no face. Clients attach their own current
-- display name (max 48 chars, display-only, visible to the story owner).
-- Additive and optional: old rows simply show a gentle fallback.

alter table public.story_views
  add column if not exists viewer_name text
    check (viewer_name is null or char_length(viewer_name) <= 48);

alter table public.story_reactions
  add column if not exists user_name text
    check (user_name is null or char_length(user_name) <= 48);

alter table public.story_replies
  add column if not exists author_name text
    check (author_name is null or char_length(author_name) <= 48);

alter table public.story_gifts
  add column if not exists sender_name text
    check (sender_name is null or char_length(sender_name) <= 48);
