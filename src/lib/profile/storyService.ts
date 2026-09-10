/**
 * Bloom — story + highlight service.
 * Visibility and expiration are enforced by database policies (see the
 * Profile migration); this layer simply never asks for more than the user
 * needs and maps rows into domain objects defensively.
 */

import { supabase } from "@/lib/supabase";
import { report } from "./errors";
import { PROFILE_MEDIA_BUCKET } from "./profileService";
import {
  normalizeAccent,
  normalizeHighlightIcon,
  type BloomAccent,
  type HighlightIcon,
  type HighlightItem,
  type LocalImage,
  type Story,
  type StoryKind,
  type StoryVisibility,
} from "./types";
import { sanitizeAdjustments, sanitizeElements } from "@/lib/stories/elements";
import type {
  StoryAdjustments,
  StoryAudience,
  StoryElement,
  StoryMediaType,
  StoryMusicMeta,
} from "@/lib/stories/types";

export class StoryServiceError extends Error {}

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

type StoryRow = {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  media_path: string | null;
  media_width: number | null;
  media_height: number | null;
  accent: string | null;
  atmosphere: string | null;
  created_at: string | null;
  expires_at: string | null;
  visibility: string | null;
  deleted_at: string | null;
  /* Story Platform columns — absent when the backend predates the migration. */
  media_type?: string | null;
  duration_ms?: number | null;
  elements?: unknown;
  filter_id?: string | null;
  adjustments?: unknown;
  background_id?: string | null;
  music?: unknown;
  alt_text?: string | null;
  audience?: string | null;
};

const STORY_COLUMNS =
  "id, kind, title, body, media_path, media_width, media_height, accent, atmosphere, created_at, expires_at, visibility, deleted_at";

const STORY_COLUMNS_LEGACY = STORY_COLUMNS;

const STORY_COLUMNS_FULL = `${STORY_COLUMNS}, media_type, duration_ms, elements, filter_id, adjustments, background_id, music, alt_text, audience`;

/** True when PostgREST complains about a column the migration hasn't added yet. */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === "42703") return true;
  return (
    typeof error.message === "string" &&
    /column .* does not exist|Could not find the .* column/i.test(error.message)
  );
}

/* ------------------------- client-side publish guards ------------------------ */
/* 30 publishes per rolling hour, and a 15s duplicate guard so double-taps and
 * retries never mint two rows. The fingerprint check is in-memory per device. */

const PUBLISH_WINDOW_MS = 60 * 60_000;
const PUBLISH_MAX = 30;
const publishStamps: number[] = [];

function publishAllowed(): boolean {
  const now = Date.now();
  while (publishStamps.length && publishStamps[0]! <= now - PUBLISH_WINDOW_MS) {
    publishStamps.shift();
  }
  if (publishStamps.length >= PUBLISH_MAX) return false;
  publishStamps.push(now);
  return true;
}

const DUPLICATE_WINDOW_MS = 15_000;
let lastFingerprint = "";
let lastFingerprintAt = 0;

function duplicatePublishGuard(fingerprint: string): boolean {
  const now = Date.now();
  if (fingerprint === lastFingerprint && now - lastFingerprintAt < DUPLICATE_WINDOW_MS) {
    return false;
  }
  lastFingerprint = fingerprint;
  lastFingerprintAt = now;
  return true;
}

function parseRowMusic(value: unknown): StoryMusicMeta | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v["title"] !== "string" || typeof v["artist"] !== "string") return null;
  const src = v["src"];
  return {
    trackId: typeof v["trackId"] === "string" ? (v["trackId"] as string).slice(0, 120) : "catalog",
    title: (v["title"] as string).slice(0, 120),
    artist: (v["artist"] as string).slice(0, 120),
    startMs: Math.max(0, Number(v["startMs"]) || 0),
    durationMs: Math.max(1000, Math.min(60000, Number(v["durationMs"]) || 15000)),
    ...(typeof src === "string" && src ? { src: src.slice(0, 2048) } : {}),
  };
}

function fromRow(row: StoryRow): Story {
  const createdAt = row.created_at ?? new Date().toISOString();
  const mediaType: StoryMediaType =
    row.media_type === "video" || row.media_type === "image" || row.media_type === "none"
      ? row.media_type
      : row.media_path
        ? "image"
        : "none";
  return {
    id: row.id,
    kind: (
      ["text", "photo", "video", "mood", "reflection", "win", "reward", "milestone"] as StoryKind[]
    ).includes(row.kind as StoryKind)
      ? (row.kind as StoryKind)
      : "text",
    title: row.title ?? "",
    body: row.body ?? "",
    mediaPath: row.media_path,
    mediaWidth: row.media_width,
    mediaHeight: row.media_height,
    accent: normalizeAccent(row.accent),
    atmosphere: row.atmosphere === "field" || row.atmosphere === "ink" ? row.atmosphere : "quiet",
    createdAt,
    expiresAt: row.expires_at ?? new Date(Date.now() + 24 * 3600_000).toISOString(),
    visibility: row.visibility === "public" ? "public" : "private",
    deletedAt: row.deleted_at,
    mediaType,
    durationMs: typeof row.duration_ms === "number" ? row.duration_ms : null,
    elements: sanitizeElements(row.elements),
    filterId: typeof row.filter_id === "string" ? row.filter_id : null,
    adjustments: sanitizeAdjustments(row.adjustments),
    backgroundId: typeof row.background_id === "string" ? row.background_id : null,
    music: parseRowMusic(row.music),
    altText: typeof row.alt_text === "string" ? row.alt_text.slice(0, 300) : null,
    audience: row.audience === "close" ? "close" : "all",
  };
}

export async function uploadStoryPhoto(userId: string, image: LocalImage): Promise<string> {
  const path = `${userId}/stories/${uuid()}.jpg`;
  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, image.blob, { contentType: "image/jpeg", upsert: false });

  if (error) {
    report("story:photo-upload", error);
    throw new StoryServiceError("Couldn't upload that image.");
  }
  return path;
}

export interface LocalVideo {
  /** Object URL or data URL preview. */
  previewUrl: string;
  width: number;
  height: number;
  durationMs: number;
  /** Original bytes for upload (no client-side transcode). */
  blob: Blob;
  contentType: string;
}

export interface CreateStoryInput {
  kind: StoryKind;
  title: string;
  body: string;
  accent: BloomAccent;
  atmosphere: Story["atmosphere"];
  visibility: StoryVisibility;
  photo: LocalImage | null;
  source: { kind: string; id: string } | null;
  /* Story Platform extensions — all optional. */
  video?: LocalVideo | null | undefined;
  durationMs?: number | null | undefined;
  elements?: StoryElement[] | undefined;
  filterId?: string | null | undefined;
  adjustments?: StoryAdjustments | null | undefined;
  backgroundId?: string | null | undefined;
  music?: StoryMusicMeta | null | undefined;
  /** Own-audio bytes, uploaded at publish time and resolved into music.src. */
  audio?: { blob: Blob; contentType: string } | null | undefined;
  /** Device-uploaded GIF bytes, resolved into their elements' src before save. */
  gifFiles?: { elementId: string; blob: Blob; contentType: string }[] | undefined;
  altText?: string | null | undefined;
  audience?: StoryAudience | undefined;
}

export async function uploadStoryVideo(userId: string, video: LocalVideo): Promise<string> {
  const ext =
    video.contentType === "video/webm"
      ? "webm"
      : video.contentType === "video/quicktime"
        ? "mov"
        : "mp4";
  const path = `${userId}/stories/${uuid()}.${ext}`;
  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, video.blob, { contentType: video.contentType, upsert: false });

  if (error) {
    report("story:video-upload", error);
    throw new StoryServiceError("Couldn't upload that video.");
  }
  return path;
}

export async function uploadStoryAudio(
  userId: string,
  audio: { blob: Blob; contentType: string },
): Promise<string> {
  const ext = audio.contentType.includes("wav")
    ? "wav"
    : audio.contentType.includes("ogg")
      ? "ogg"
      : "mp3";
  const path = `${userId}/stories/${uuid()}.${ext}`;
  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, audio.blob, { contentType: audio.contentType, upsert: false });

  if (error) {
    report("story:audio-upload", error);
    throw new StoryServiceError("Couldn't upload that audio.");
  }
  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadStoryGif(
  userId: string,
  gif: { blob: Blob; contentType: string },
): Promise<string> {
  const ext = gif.contentType === "image/webp" ? "webp" : "gif";
  const path = `${userId}/stories/gif-${uuid()}.${ext}`;
  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, gif.blob, { contentType: gif.contentType || "image/gif", upsert: false });

  if (error) {
    report("story:gif-upload", error);
    throw new StoryServiceError("Couldn't upload that GIF.");
  }
  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createStory(userId: string, input: CreateStoryInput): Promise<Story> {
  if (!publishAllowed()) {
    throw new StoryServiceError(
      "You've shared a lot in the last hour. Take a breath, then try again.",
    );
  }
  const fingerprint = [
    userId,
    input.kind,
    input.title.trim(),
    input.body.trim(),
    input.photo ? `${input.photo.width}x${input.photo.height}` : "",
    input.video ? `${input.video.durationMs}` : "",
  ].join("|");
  if (!duplicatePublishGuard(fingerprint)) {
    throw new StoryServiceError("That story is already on its way — no double post.");
  }

  let mediaPath: string | null = null;
  let mediaType: StoryMediaType = "none";
  let mediaWidth: number | null = null;
  let mediaHeight: number | null = null;
  let durationMs: number | null = input.durationMs ?? null;

  if (input.video) {
    mediaPath = await uploadStoryVideo(userId, input.video);
    mediaType = "video";
    mediaWidth = input.video.width;
    mediaHeight = input.video.height;
    durationMs = input.video.durationMs;
  } else if (input.photo) {
    mediaPath = await uploadStoryPhoto(userId, input.photo);
    mediaType = "image";
    mediaWidth = input.photo.width;
    mediaHeight = input.photo.height;
  }

  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();

  // Device-uploaded GIFs ride up to storage first; their public URLs replace
  // the session blob URLs before sanitization (stored rows must be https).
  let pendingElements = input.elements ?? [];
  if (input.gifFiles?.length) {
    const urls = new Map<string, string>();
    for (const gif of input.gifFiles) {
      if (gif.blob.size > 4 * 1024 * 1024) {
        throw new StoryServiceError("That GIF is too large. Keep it under 4 MB.");
      }
      urls.set(gif.elementId, await uploadStoryGif(userId, gif));
    }
    pendingElements = pendingElements.map((e) => {
      if (e.kind !== "gif") return e;
      const url = urls.get(e.id);
      return url ? { ...e, src: url } : e;
    });
  }
  const elements = sanitizeElements(pendingElements);

  // Own audio rides up to storage; the public URL becomes the track source.
  let music = input.music ?? null;
  if (input.audio && music) {
    try {
      const src = await uploadStoryAudio(userId, input.audio);
      music = { ...music, src };
    } catch (error) {
      report("story:audio-upload", error);
      throw error;
    }
  }

  const legacyPayload = {
    author_id: userId,
    kind: input.kind === "video" ? "photo" : input.kind,
    title: input.title.trim().slice(0, 120),
    body: input.body.trim().slice(0, 2000),
    media_path: mediaPath,
    media_width: mediaWidth,
    media_height: mediaHeight,
    accent: input.accent,
    atmosphere: input.atmosphere,
    source_kind: input.source?.kind ?? null,
    source_id: input.source?.id ?? null,
    visibility: input.visibility,
    expires_at: expiresAt,
  };

  const fullPayload = {
    ...legacyPayload,
    kind: input.kind,
    media_type: mediaType,
    duration_ms: durationMs,
    elements,
    filter_id: input.filterId ?? null,
    adjustments: input.adjustments ?? null,
    background_id: input.backgroundId ?? null,
    music: music ?? null,
    alt_text: input.altText?.trim().slice(0, 300) || null,
    audience: input.audience ?? "all",
  };

  // Prefer the full insert; fall back to the legacy shape when the backend
  // predates the Story Platform migration. Never lose the draft on failure.
  const attempt = await supabase
    .from("stories")
    .insert(fullPayload)
    .select(STORY_COLUMNS_FULL)
    .single();

  if (!attempt.error) return fromRow(attempt.data as StoryRow);

  if (!isMissingColumn(attempt.error)) {
    report("story:create", attempt.error);
    throw new StoryServiceError("Couldn't publish your story.");
  }

  const legacy = await supabase
    .from("stories")
    .insert(legacyPayload)
    .select(STORY_COLUMNS_LEGACY)
    .single();

  if (legacy.error) {
    report("story:create", legacy.error);
    throw new StoryServiceError("Couldn't publish your story.");
  }

  const story = fromRow(legacy.data as StoryRow);
  // The row is saved; rich layers ride along locally until the backend upgrades.
  story.elements = elements;
  story.filterId = input.filterId ?? null;
  story.backgroundId = input.backgroundId ?? null;
  story.music = music;
  return story;
}

/** Everything not soft-deleted; the rail filters active vs archived. */
export async function listMyStories(userId: string): Promise<Story[]> {
  const attempt = await supabase
    .from("stories")
    .select(STORY_COLUMNS_FULL)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(160);

  if (!attempt.error) return ((attempt.data ?? []) as StoryRow[]).map(fromRow);
  if (!isMissingColumn(attempt.error)) {
    report("story:list", attempt.error);
    throw new StoryServiceError("Couldn't read your stories.");
  }

  const legacy = await supabase
    .from("stories")
    .select(STORY_COLUMNS_LEGACY)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(160);

  if (legacy.error) {
    report("story:list", legacy.error);
    throw new StoryServiceError("Couldn't read your stories.");
  }
  return ((legacy.data ?? []) as StoryRow[]).map(fromRow);
}

export async function setStoryVisibility(id: string, visibility: StoryVisibility): Promise<void> {
  const { error } = await supabase.from("stories").update({ visibility }).eq("id", id);
  if (error) {
    report("story:visibility", error);
    throw new StoryServiceError("Couldn't change who can see this.");
  }
}

/** Soft delete — recoverable via "share again" while the row lives. */
export async function deleteStory(story: Story): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", story.id);
  if (error) {
    report("story:delete", error);
    throw new StoryServiceError("Couldn't delete that just now.");
  }
}

/** Undo a soft delete. */
export async function restoreStory(id: string): Promise<void> {
  const { error } = await supabase.from("stories").update({ deleted_at: null }).eq("id", id);
  if (error) {
    report("story:restore", error);
    throw new StoryServiceError("Couldn't bring that back.");
  }
}

/** Share again = a fresh 24h story with the same content. */
export async function reshareStory(userId: string, story: Story): Promise<Story> {
  const legacyPayload = {
    author_id: userId,
    kind: story.kind === "video" ? ("photo" as StoryKind) : story.kind,
    title: story.title,
    body: story.body,
    media_path: story.mediaPath,
    media_width: story.mediaWidth,
    media_height: story.mediaHeight,
    accent: story.accent,
    atmosphere: story.atmosphere,
    source_kind: null,
    source_id: null,
    visibility: story.visibility,
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  };
  const attempt = await supabase
    .from("stories")
    .insert({
      ...legacyPayload,
      kind: story.kind,
      media_type: story.mediaType,
      duration_ms: story.durationMs,
      elements: story.elements,
      filter_id: story.filterId,
      adjustments: story.adjustments,
      background_id: story.backgroundId,
      music: story.music,
      alt_text: story.altText,
      audience: story.audience,
    })
    .select(STORY_COLUMNS_FULL)
    .single();

  if (!attempt.error) return fromRow(attempt.data as StoryRow);
  if (!isMissingColumn(attempt.error)) {
    report("story:reshare", attempt.error);
    throw new StoryServiceError("Couldn't share that again.");
  }

  const { data, error } = await supabase
    .from("stories")
    .insert(legacyPayload)
    .select(STORY_COLUMNS_LEGACY)
    .single();

  if (error) {
    report("story:reshare", error);
    throw new StoryServiceError("Couldn't share that again.");
  }
  return fromRow(data as StoryRow);
}

/* ------------------------------- highlights ------------------------------ */

type HighlightRow = {
  id: string;
  name: string;
  accent: string | null;
  icon: string | null;
  created_at: string | null;
  story_highlight_items:
    { story_id: string; position: number; stories: StoryRow | StoryRow[] | null }[] | null;
};

function firstStory(item: {
  story_id: string;
  position: number;
  stories: StoryRow | StoryRow[] | null;
}) {
  const raw = item?.stories;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export async function listMyHighlights(userId: string): Promise<HighlightItem[]> {
  const { data, error } = await supabase
    .from("story_highlights")
    .select(
      `id, name, accent, icon, created_at, story_highlight_items ( story_id, position, stories (${STORY_COLUMNS}) )`,
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    report("highlight:list", error);
    throw new StoryServiceError("Couldn't read your highlights.");
  }

  return ((data ?? []) as unknown as HighlightRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    accent: normalizeAccent(row.accent),
    icon: normalizeHighlightIcon(row.icon),
    createdAt: row.created_at ?? new Date().toISOString(),
    stories: (row.story_highlight_items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(firstStory)
      .filter((story): story is StoryRow => Boolean(story))
      .map(fromRow),
  }));
}

export async function createHighlight(
  ownerId: string,
  name: string,
  accent: BloomAccent,
  storyIds: string[],
  icon: HighlightIcon | null = null,
): Promise<void> {
  const { data, error } = await supabase
    .from("story_highlights")
    .insert({ owner_id: ownerId, name: name.trim().slice(0, 40), accent, icon })
    .select("id")
    .single();

  if (error || !data) {
    report("highlight:create", error);
    throw new StoryServiceError("Couldn't create that highlight.");
  }

  const id = (data as { id: string }).id;
  if (storyIds.length > 0) {
    const { error: itemsError } = await supabase
      .from("story_highlight_items")
      .insert(storyIds.map((story_id, position) => ({ highlight_id: id, story_id, position })));
    if (itemsError) {
      report("highlight:create-items", itemsError);
      await supabase.from("story_highlights").delete().eq("id", id);
      throw new StoryServiceError("Couldn't create that highlight.");
    }
  }
}

export async function updateHighlight(
  id: string,
  name: string,
  accent: BloomAccent,
  storyIds: string[],
  icon: HighlightIcon | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("story_highlights")
    .update({
      name: name.trim().slice(0, 40),
      accent,
      icon,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    report("highlight:update", error);
    throw new StoryServiceError("Couldn't save that highlight.");
  }

  const { error: clearError } = await supabase
    .from("story_highlight_items")
    .delete()
    .eq("highlight_id", id);
  if (clearError) {
    report("highlight:update-clear", clearError);
    throw new StoryServiceError("Couldn't save that highlight.");
  }

  if (storyIds.length > 0) {
    const { error: itemsError } = await supabase
      .from("story_highlight_items")
      .insert(storyIds.map((story_id, position) => ({ highlight_id: id, story_id, position })));
    if (itemsError) {
      report("highlight:update-items", itemsError);
      throw new StoryServiceError("Couldn't save that highlight.");
    }
  }
}

export async function deleteHighlight(id: string): Promise<void> {
  const { error } = await supabase.from("story_highlights").delete().eq("id", id);
  if (error) {
    report("highlight:delete", error);
    throw new StoryServiceError("Couldn't delete that highlight.");
  }
}
