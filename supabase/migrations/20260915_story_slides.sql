-- Bloom — Story Slides: a story can now hold more than one composition.
--
-- Additive to 20260914_story_canvas.sql. Nothing here changes existing rows:
-- `slides` is nullable, and a story with no `slides` is read as exactly one
-- slide built from its own top-level columns (media_path, elements, canvas,
-- filter_id, adjustments, background_id, alt_text, duration_ms).
--
-- That read path lives in one place — `storySlides()` in
-- src/lib/stories/slides.ts — so the legacy shape has a single implementation
-- instead of being re-derived at every call site. No backfill is needed, and
-- none is wanted: rewriting a working row to gain nothing is the only way this
-- migration could damage data.
--
-- Shape (mirrors the StorySlide interface):
--   [
--     {
--       "id": "slide-m3k2-1",
--       "mediaType": "none" | "image" | "video",
--       "mediaPath": "profile-media/…" | null,
--       "mediaWidth": 1080 | null,
--       "mediaHeight": 1920 | null,
--       "durationMs": 4000 | null,
--       "elements": [ … ],
--       "filterId": "warm" | null,
--       "adjustments": { … } | null,
--       "backgroundId": "first-light" | null,
--       "canvas": { … } | null,
--       "altText": "…" | null
--     },
--     …
--   ]
--
-- Music is deliberately *not* per-slide: a track is attached to the whole story
-- and keeps playing across slides, which is also how single-slide stories
-- already behave. `music` therefore stays on the row, not in this array.
--
-- Bounded on the way in: like `canvas` and `elements`, an in-flight slide can
-- carry an inlined data URL while the author is still editing, so the row
-- needs a hard ceiling rather than a client-side promise. Ten slides at the
-- same budget as one canvas column.

-- ---------------------------------------------------------------------------
-- 1. The column
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists slides jsonb
    check (
      slides is null
      or (
        jsonb_typeof(slides) = 'array'
        and jsonb_array_length(slides) between 1 and 10
        and octet_length(slides::text) <= 20971520
      )
    );

comment on column public.stories.slides is
  'Extra compositions for multi-slide stories, in order. Null = single slide, read from the top-level columns.';

-- Index only the multi-slide rows; single-slide stories are the common case
-- and gain nothing from being indexed here.
create index if not exists stories_multi_slide_idx
  on public.stories ((jsonb_array_length(slides)))
  where slides is not null and jsonb_array_length(slides) > 1;

-- ---------------------------------------------------------------------------
-- 2. Carry `slides` through the public profile payload
-- ---------------------------------------------------------------------------
-- get_public_bloom_profile builds the story payload inline in two places
-- (the profile's active stories, and each highlight). Both gain `slides` in
-- the same position, directly after `canvas`. The rest of the body is
-- unchanged from 20260914_story_canvas.sql, so this is a pure redefinition.

create or replace function public.get_public_bloom_profile(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  result jsonb;
begin
  select * into v_profile
  from public.profiles
  where username = lower(trim(p_username));

  if v_profile.id is null then
    return null;
  end if;

  if not public.is_profile_bloom_public(v_profile.id) then
    return jsonb_build_object('private', true, 'username', v_profile.username);
  end if;

  result := jsonb_build_object(
    'display_name', coalesce(nullif(trim(v_profile.display_name), ''), 'Bloom User'),
    'username', v_profile.username,
    'bio', nullif(trim(coalesce(v_profile.bio, '')), ''),
    'avatar_url', case
      when v_profile.avatar_path is null then null
      else 'profile-media/' || v_profile.avatar_path
    end,
    'accent', v_profile.accent,
    'featured', v_profile.featured,
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'kind', s.kind,
        'title', s.title,
        'body', s.body,
        'media_url', case when s.media_path is null then null
                          else 'profile-media/' || s.media_path end,
        'media_type', s.media_type,
        'duration_ms', s.duration_ms,
        'elements', s.elements,
        'filter_id', s.filter_id,
        'adjustments', s.adjustments,
        'background_id', s.background_id,
        'canvas', s.canvas,
        'slides', s.slides,
        'music', s.music,
        'alt_text', s.alt_text,
        'audience', s.audience,
        'accent', s.accent,
        'created_at', s.created_at,
        'expires_at', s.expires_at
      ) order by s.created_at desc)
      from public.stories s
      where s.author_id = v_profile.id
        and s.deleted_at is null
        and s.visibility = 'public'
        and s.expires_at > now()
        and (
          s.audience = 'all'
          or (
            s.audience = 'close'
            and exists (
              select 1 from public.close_friends cf
              where cf.owner_id = v_profile.id and cf.friend_id = auth.uid()
            )
          )
        )
    ), '[]'::jsonb),
    'highlights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'name', h.name,
        'accent', h.accent,
        'stories', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id,
            'kind', s.kind,
            'title', s.title,
            'body', s.body,
            'media_url', case when s.media_path is null then null
                              else 'profile-media/' || s.media_path end,
            'media_type', s.media_type,
            'duration_ms', s.duration_ms,
            'elements', s.elements,
            'filter_id', s.filter_id,
            'adjustments', s.adjustments,
            'background_id', s.background_id,
            'canvas', s.canvas,
            'slides', s.slides,
            'music', s.music,
            'alt_text', s.alt_text,
            'audience', s.audience,
            'accent', s.accent,
            'created_at', s.created_at,
            'expires_at', s.expires_at
          ) order by i.position)
          from public.story_highlight_items i
          join public.stories s on s.id = i.story_id
          where i.highlight_id = h.id
            and s.deleted_at is null
            and s.visibility = 'public'
        ), '[]'::jsonb)
      ) order by h.created_at)
      from public.story_highlights h
      where h.owner_id = v_profile.id
    ), '[]'::jsonb)
  );

  return result;
end;
$$;

revoke all on function public.get_public_bloom_profile(text) from anon;
grant execute on function public.get_public_bloom_profile(text) to anon, authenticated;
