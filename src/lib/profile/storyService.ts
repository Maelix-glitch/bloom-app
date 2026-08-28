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
  type BloomAccent,
  type HighlightItem,
  type LocalImage,
  type Story,
  type StoryKind,
  type StoryVisibility,
} from "./types";

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
};

const STORY_COLUMNS =
  "id, kind, title, body, media_path, media_width, media_height, accent, atmosphere, created_at, expires_at, visibility, deleted_at";

function fromRow(row: StoryRow): Story {
  const createdAt = row.created_at ?? new Date().toISOString();
  return {
    id: row.id,
    kind: (
      ["text", "photo", "mood", "reflection", "win", "reward", "milestone"] as StoryKind[]
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

export interface CreateStoryInput {
  kind: StoryKind;
  title: string;
  body: string;
  accent: BloomAccent;
  atmosphere: Story["atmosphere"];
  visibility: StoryVisibility;
  photo: LocalImage | null;
  source: { kind: string; id: string } | null;
}

export async function createStory(userId: string, input: CreateStoryInput): Promise<Story> {
  let mediaPath: string | null = null;

  if (input.photo) {
    mediaPath = await uploadStoryPhoto(userId, input.photo);
  }

  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();

  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: userId,
      kind: input.kind,
      title: input.title.trim().slice(0, 120),
      body: input.body.trim().slice(0, 2000),
      media_path: mediaPath,
      media_width: input.photo?.width ?? null,
      media_height: input.photo?.height ?? null,
      accent: input.accent,
      atmosphere: input.atmosphere,
      source_kind: input.source?.kind ?? null,
      source_id: input.source?.id ?? null,
      visibility: input.visibility,
      expires_at: expiresAt,
    })
    .select(STORY_COLUMNS)
    .single();

  if (error) {
    // Keep the draft alive: the caller decides what to show, media cleanup is
    // deferred (orphaned objects are namespaced to the owner only).
    report("story:create", error);
    throw new StoryServiceError("Couldn't publish your story.");
  }

  return fromRow(data as StoryRow);
}

/** Everything not soft-deleted; the rail filters active vs archived. */
export async function listMyStories(userId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("author_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    report("story:list", error);
    throw new StoryServiceError("Couldn't read your stories.");
  }
  return ((data ?? []) as StoryRow[]).map(fromRow);
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
  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: userId,
      kind: story.kind,
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
    })
    .select(STORY_COLUMNS)
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
  atmosphere: string | null;
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
      `id, name, accent, created_at, story_highlight_items ( story_id, position, stories (${STORY_COLUMNS}) )`,
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    report("highlight:list", error);
    throw new StoryServiceError("Couldn't read your highlights.");
  }

  return ((data ?? []) as HighlightRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    accent: normalizeAccent(row.accent),
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
): Promise<void> {
  const { data, error } = await supabase
    .from("story_highlights")
    .insert({ owner_id: ownerId, name: name.trim().slice(0, 40), accent })
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
): Promise<void> {
  const { error } = await supabase
    .from("story_highlights")
    .update({ name: name.trim().slice(0, 40), accent, updated_at: new Date().toISOString() })
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
