-- Bloom — Story Canvas: one column that holds a whole composition.
--
-- Additive to 20260910_story_platform.sql. Nothing here changes existing rows:
-- `canvas` is nullable, so a story published before it renders exactly as it
-- always did, from `background_id`.
--
-- Why a new column instead of overloading background_id:
--   background_id can only *name* a preset. A story built from a template — or
--   from a photo background with blur, a paper texture and a warm overlay —
--   describes a paint, not a preset. Those live here as structured jsonb:
--     {
--       "v": 1,
--       "mode": "preset" | "solid" | "gradient" | "photo",
--       "presetId": "first-light" | null,
--       "color": "#221D33",
--       "paint": { "type": "linear", "angle": 180, "stops": [[0,"#…"], …] },
--       "angle": 180,
--       "photo": { "src","fit","blur","zoom","panX","panY","opacity" } | null,
--       "overlay": { "color", "opacity" } | null,
--       "texture": "none"|"paper"|"grain"|"linen"|"dots"|"canvas-cloth",
--       "textureOpacity": 0.25,
--       "ink": "#F7F1E3"
--     }
--   Clients sanitize on read, so a value that does not match degrades to null
--   rather than blanking the story.
--
-- Bounded on the way in: while the author is still editing, a background photo
-- is inlined as a data URL, so the row could otherwise grow without limit.

-- ---------------------------------------------------------------------------
-- 1. The column
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists canvas jsonb
    check (canvas is null or octet_length(canvas::text) <= 4194304);

comment on column public.stories.canvas is
  'Composed background state (paint, photo, texture, overlay, ink). Null = render from background_id.';

-- ---------------------------------------------------------------------------
-- 2. Carry `canvas` through the public profile payload
-- ---------------------------------------------------------------------------
-- get_public_bloom_profile builds the story payload inline in two places
-- (the profile's active stories, and each highlight). Both gain `canvas` in
-- the same position. The rest of the body is unchanged from
-- 20260910_story_platform.sql so this is a pure redefinition.

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
