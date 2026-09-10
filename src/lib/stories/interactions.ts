/**
 * Bloom Story Platform — interactions service.
 * Views, reactions, replies, gifts, poll votes, settings, close friends.
 *
 * Server-authoritative when Supabase + the Story Platform tables exist;
 * every call degrades to a local store when the backend is unreachable or
 * the migration hasn't run yet — the viewer never breaks because an
 * interaction failed. Client-side rate limits + in-flight idempotency keys
 * stop double-tap duplicates before they reach the network.
 */

import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { report } from "@/lib/profile/errors";
import {
  normalizeGift,
  normalizeReaction,
  type StoryGiftKind,
  type StoryGiftRecord,
  type StoryPollTally,
  type StoryReactionKind,
  type StoryReplyRecord,
  type StorySettings,
} from "./types";
import { DEFAULT_STORY_SETTINGS } from "./types";

export type { StoryPollTally } from "./types";

/* ------------------------------ rate limits ----------------------------- */

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  view: { max: 60, windowMs: 60_000 },
  react: { max: 12, windowMs: 60_000 },
  reply: { max: 6, windowMs: 60_000 },
  gift: { max: 6, windowMs: 60_000 },
  vote: { max: 30, windowMs: 60_000 },
};

function allow(key: string): boolean {
  const limit = LIMITS[key] ?? { max: 10, windowMs: 60_000 };
  const now = Date.now();
  const bucket = buckets.get(key) ?? { windowStart: now, count: 0 };
  if (now - bucket.windowStart > limit.windowMs) {
    bucket.windowStart = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count <= limit.max;
}

/* --------------------------- in-flight idempotency ---------------------- */

const inflight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

/* ------------------------------- local store ---------------------------- */

interface LocalDB {
  reactions: Record<string, { reaction: StoryReactionKind; at: string }>; // storyId -> mine
  reactionCounts: Record<string, Partial<Record<StoryReactionKind, number>>>;
  replies: StoryReplyRecord[];
  gifts: StoryGiftRecord[];
  votes: Record<string, Record<string, number>>; // storyId -> elementId -> option
  tallies: Record<string, Record<string, number[]>>; // storyId -> elementId -> counts
  settings: StorySettings | null;
  closeFriends: string[];
}

const LOCAL_KEY = "bloom.story.local.v1";

function readLocal(): LocalDB {
  const empty: LocalDB = {
    reactions: {},
    reactionCounts: {},
    replies: [],
    gifts: [],
    votes: {},
    tallies: {},
    settings: null,
    closeFriends: [],
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<LocalDB>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function writeLocal(db: LocalDB): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({
        ...db,
        replies: db.replies.slice(-120),
        gifts: db.gifts.slice(-120),
      }),
    );
  } catch {
    /* best-effort */
  }
  window.dispatchEvent(new CustomEvent("bloom:story-local"));
}

export function subscribeLocal(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("bloom:story-local", fn);
  return () => window.removeEventListener("bloom:story-local", fn);
}

const cleanName = (name: string | null | undefined): string =>
  (name ?? "").trim().slice(0, 48) || "Someone in Bloom";

const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** True when the error means "table/policy missing" rather than a real failure. */
function isMissingBackend(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return (
    code === "42P01" || // undefined_table
    code === "42703" || // undefined_column
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}

/* --------------------------------- views -------------------------------- */

export async function recordView(
  storyId: string,
  viewerId: string | null,
  viewerName?: string | null,
): Promise<void> {
  if (!allow("view")) return;
  if (!hasSupabaseConfig || !viewerId) return;
  await dedupe(`view:${storyId}:${viewerId}`, async () => {
    const { error } = await supabase.from("story_views").upsert(
      {
        story_id: storyId,
        viewer_id: viewerId,
        viewer_name: cleanName(viewerName),
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "story_id,viewer_id" },
    );
    if (error && !isMissingBackend(error)) report("story:view", error);
  }).catch((error) => {
    if (!isMissingBackend(error)) report("story:view", error);
  });
}

export interface StoryViewerEntry {
  viewerId: string;
  name: string;
  viewedAt: string;
}

export async function listViewers(storyId: string): Promise<StoryViewerEntry[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data, error } = await supabase
      .from("story_views")
      .select("viewer_id, viewer_name, viewed_at")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false })
      .limit(100);
    if (error) {
      if (!isMissingBackend(error)) report("story:viewers", error);
      return [];
    }
    return (
      (data ?? []) as { viewer_id: string; viewer_name: string | null; viewed_at: string }[]
    ).map((row) => ({
      viewerId: row.viewer_id,
      name: row.viewer_name?.trim() || "Someone in Bloom",
      viewedAt: row.viewed_at,
    }));
  } catch (error) {
    report("story:viewers", error);
    return [];
  }
}

/* ------------------------------- reactions ------------------------------ */

export interface ReactionState {
  mine: StoryReactionKind | null;
  counts: Partial<Record<StoryReactionKind, number>>;
  total: number;
}

export async function getReactionState(
  storyId: string,
  userId: string | null,
): Promise<ReactionState> {
  const local = readLocal();
  const fallback: ReactionState = {
    mine: userId ? (local.reactions[storyId]?.reaction ?? null) : null,
    counts: local.reactionCounts[storyId] ?? {},
    total: Object.values(local.reactionCounts[storyId] ?? {}).reduce((a, b) => a + (b ?? 0), 0),
  };
  if (!hasSupabaseConfig || !userId) return fallback;
  try {
    const { data, error } = await supabase
      .from("story_reactions")
      .select("user_id, reaction")
      .eq("story_id", storyId)
      .limit(500);
    if (error) {
      if (!isMissingBackend(error)) report("story:reactions-read", error);
      return fallback;
    }
    const counts: Partial<Record<StoryReactionKind, number>> = {};
    let mine: StoryReactionKind | null = null;
    for (const row of (data ?? []) as { user_id: string; reaction: string }[]) {
      const kind = normalizeReaction(row.reaction);
      if (!kind) continue;
      counts[kind] = (counts[kind] ?? 0) + 1;
      if (row.user_id === userId) mine = kind;
    }
    // Merge local-only reactions (cast while offline) so nothing vanishes.
    const localMine = local.reactions[storyId]?.reaction;
    if (localMine && !mine) {
      counts[localMine] = (counts[localMine] ?? 0) + 1;
      mine = localMine;
    }
    return { mine, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  } catch (error) {
    report("story:reactions-read", error);
    return fallback;
  }
}

/**
 * Toggle-or-set: tapping the active reaction removes it, tapping another
 * switches. One action = one row, enforced by the unique constraint.
 */
export async function setReaction(
  storyId: string,
  userId: string | null,
  reaction: StoryReactionKind | null,
  userName?: string | null,
): Promise<ReactionState> {
  const local = readLocal();
  const prev = local.reactions[storyId]?.reaction ?? null;
  const next = reaction === prev ? null : reaction;

  // Optimistic local state first — the heart pops instantly.
  const counts: Partial<Record<StoryReactionKind, number>> = {
    ...(local.reactionCounts[storyId] ?? {}),
  };
  if (prev) counts[prev] = Math.max(0, (counts[prev] ?? 1) - 1);
  if (next) counts[next] = (counts[next] ?? 0) + 1;
  if (next) local.reactions[storyId] = { reaction: next, at: new Date().toISOString() };
  else delete local.reactions[storyId];
  local.reactionCounts[storyId] = counts;
  writeLocal(local);

  if (!allow("react")) return getReactionState(storyId, userId);
  if (!hasSupabaseConfig || !userId) return getReactionState(storyId, userId);

  await dedupe(`react:${storyId}:${userId}:${next ?? "none"}`, async () => {
    try {
      if (!next) {
        const { error } = await supabase
          .from("story_reactions")
          .delete()
          .eq("story_id", storyId)
          .eq("user_id", userId);
        if (error && !isMissingBackend(error)) report("story:react-remove", error);
      } else {
        const { error } = await supabase.from("story_reactions").upsert(
          {
            story_id: storyId,
            user_id: userId,
            reaction: next,
            user_name: cleanName(userName),
          },
          { onConflict: "story_id,user_id" },
        );
        if (error && !isMissingBackend(error)) report("story:react", error);
      }
    } catch (error) {
      if (!isMissingBackend(error)) report("story:react", error);
    }
  });
  return getReactionState(storyId, userId);
}

/* -------------------------------- replies ------------------------------- */

export async function listReplies(
  storyId: string,
  userId: string | null,
): Promise<StoryReplyRecord[]> {
  const local = readLocal().replies.filter((r) => r.storyId === storyId);
  if (!hasSupabaseConfig || !userId) return local;
  try {
    const { data, error } = await supabase
      .from("story_replies")
      .select("id, story_id, user_id, body, created_at, author_name")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) {
      if (!isMissingBackend(error)) report("story:replies-read", error);
      return local;
    }
    const server = (
      (data ?? []) as {
        id: string;
        story_id: string;
        user_id: string;
        body: string;
        created_at: string;
        author_name: string | null;
      }[]
    ).map((row) => ({
      id: row.id,
      storyId: row.story_id,
      userId: row.user_id,
      body: row.body,
      createdAt: row.created_at,
      authorName: row.author_name?.trim() || "Someone in Bloom",
    }));
    // Local-only replies (sent while offline) join by id.
    const ids = new Set(server.map((r) => r.id));
    return [...server, ...local.filter((r) => !ids.has(r.id))].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  } catch (error) {
    report("story:replies-read", error);
    return local;
  }
}

export async function sendReply(
  storyId: string,
  userId: string | null,
  body: string,
  userName?: string | null,
): Promise<StoryReplyRecord> {
  const clean = body.trim().slice(0, 500);
  if (!clean) throw new Error("Write a little something first.");
  if (!allow("reply")) throw new Error("Slow down a touch — try again in a moment.");
  const record: StoryReplyRecord = {
    id: uid(),
    storyId,
    userId: userId ?? "local",
    body: clean,
    createdAt: new Date().toISOString(),
    authorName: cleanName(userName),
  };
  // Idempotency: the same send can't run twice concurrently.
  return dedupe(`reply:${storyId}:${record.id}`, async () => {
    const local = readLocal();
    local.replies.push(record);
    writeLocal(local);
    if (hasSupabaseConfig && userId) {
      try {
        const { data, error } = await supabase
          .from("story_replies")
          .insert({
            story_id: storyId,
            user_id: userId,
            body: clean,
            author_name: cleanName(userName),
          })
          .select("id, created_at")
          .single();
        if (error) {
          if (!isMissingBackend(error)) report("story:reply", error);
        } else if (data) {
          // Swap the local id for the server one.
          const next = readLocal();
          const found = next.replies.find((r) => r.id === record.id);
          if (found) {
            found.id = (data as { id: string }).id;
            found.createdAt = (data as { created_at: string }).created_at ?? found.createdAt;
            writeLocal(next);
            record.id = found.id;
            record.createdAt = found.createdAt;
          }
        }
      } catch (error) {
        if (!isMissingBackend(error)) report("story:reply", error);
      }
    }
    return record;
  });
}

/* --------------------------------- gifts -------------------------------- */

export async function listGifts(
  storyId: string,
  userId: string | null,
): Promise<StoryGiftRecord[]> {
  const local = readLocal().gifts.filter((g) => g.storyId === storyId);
  if (!hasSupabaseConfig || !userId) return local;
  try {
    const { data, error } = await supabase
      .from("story_gifts")
      .select("id, story_id, sender_id, gift, created_at, sender_name")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      if (!isMissingBackend(error)) report("story:gifts-read", error);
      return local;
    }
    const server = (
      (data ?? []) as {
        id: string;
        story_id: string;
        sender_id: string;
        gift: string;
        created_at: string;
        sender_name: string | null;
      }[]
    )
      .map((row): StoryGiftRecord | null => {
        const gift = normalizeGift(row.gift);
        if (!gift) return null;
        return {
          id: row.id,
          storyId: row.story_id,
          senderId: row.sender_id,
          gift,
          createdAt: row.created_at,
          senderName: row.sender_name?.trim() || "Someone in Bloom",
        } satisfies StoryGiftRecord;
      })
      .filter((g): g is StoryGiftRecord => g !== null);
    const ids = new Set(server.map((g) => g.id));
    return [...server, ...local.filter((g) => !ids.has(g.id))];
  } catch (error) {
    report("story:gifts-read", error);
    return local;
  }
}

export async function sendGift(
  storyId: string,
  userId: string | null,
  gift: StoryGiftKind,
  userName?: string | null,
): Promise<StoryGiftRecord> {
  if (!allow("gift")) throw new Error("Slow down a touch — try again in a moment.");
  const record: StoryGiftRecord = {
    id: uid(),
    storyId,
    senderId: userId ?? "local",
    gift,
    createdAt: new Date().toISOString(),
    senderName: cleanName(userName),
  };
  return dedupe(`gift:${storyId}:${record.id}`, async () => {
    const local = readLocal();
    local.gifts.push(record);
    writeLocal(local);
    if (hasSupabaseConfig && userId) {
      try {
        const { data, error } = await supabase
          .from("story_gifts")
          .insert({
            story_id: storyId,
            sender_id: userId,
            gift,
            sender_name: cleanName(userName),
          })
          .select("id, created_at")
          .single();
        if (error) {
          if (!isMissingBackend(error)) report("story:gift", error);
        } else if (data) {
          const next = readLocal();
          const found = next.gifts.find((g) => g.id === record.id);
          if (found) {
            found.id = (data as { id: string }).id;
            found.createdAt = (data as { created_at: string }).created_at ?? found.createdAt;
            writeLocal(next);
            record.id = found.id;
            record.createdAt = found.createdAt;
          }
        }
      } catch (error) {
        if (!isMissingBackend(error)) report("story:gift", error);
      }
    }
    return record;
  });
}

/* ------------------------------- poll votes ----------------------------- */

export async function getPollTally(
  storyId: string,
  elementId: string,
  optionCount: number,
  userId: string | null,
): Promise<StoryPollTally> {
  const local = readLocal();
  const mine = local.votes[storyId]?.[elementId] ?? null;
  const localCounts = local.tallies[storyId]?.[elementId];
  const empty = Array.from({ length: optionCount }, () => 0);
  const fallback: StoryPollTally = {
    elementId,
    counts:
      localCounts && localCounts.length === optionCount
        ? [...localCounts]
        : (() => {
            if (mine !== null && mine !== undefined && mine < optionCount) empty[mine] = 1;
            return empty;
          })(),
    total: 0,
    mine: mine ?? null,
  };
  fallback.total = fallback.counts.reduce((a, b) => a + b, 0);
  if (!hasSupabaseConfig || !userId) return fallback;
  try {
    const { data, error } = await supabase
      .from("story_poll_votes")
      .select("user_id, option_index")
      .eq("story_id", storyId)
      .eq("element_id", elementId)
      .limit(1000);
    if (error) {
      if (!isMissingBackend(error)) report("story:votes-read", error);
      return fallback;
    }
    const counts = Array.from({ length: optionCount }, () => 0);
    let mineServer: number | null = null;
    for (const row of (data ?? []) as { user_id: string; option_index: number }[]) {
      const idx = row.option_index;
      if (idx < 0 || idx >= optionCount) continue;
      counts[idx]! += 1;
      if (row.user_id === userId) mineServer = idx;
    }
    // Merge an offline vote that hasn't synced.
    if (mine !== null && mine !== undefined && mineServer === null && mine < optionCount) {
      counts[mine]! += 1;
      mineServer = mine;
    }
    return {
      elementId,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
      mine: mineServer,
    };
  } catch (error) {
    report("story:votes-read", error);
    return fallback;
  }
}

export async function castVote(
  storyId: string,
  elementId: string,
  optionIndex: number,
  userId: string | null,
  valueText?: string,
): Promise<StoryPollTally> {
  if (!allow("vote")) throw new Error("Slow down a touch — try again in a moment.");
  return dedupe(`vote:${storyId}:${elementId}:${userId ?? "local"}`, async () => {
    const local = readLocal();
    const storyVotes = local.votes[storyId] ?? {};
    const prev = storyVotes[elementId];
    storyVotes[elementId] = optionIndex;
    local.votes[storyId] = storyVotes;
    // Keep local tallies plausible for instant feedback.
    const key = storyId;
    const byElement = local.tallies[key] ?? {};
    const counts = [...(byElement[elementId] ?? [])];
    while (counts.length <= optionIndex) counts.push(0);
    if (prev !== undefined && counts[prev] !== undefined && counts[prev]! > 0) counts[prev]! -= 1;
    counts[optionIndex]! += 1;
    byElement[elementId] = counts;
    local.tallies[key] = byElement;
    writeLocal(local);

    if (hasSupabaseConfig && userId) {
      try {
        const { error } = await supabase.from("story_poll_votes").upsert(
          {
            story_id: storyId,
            element_id: elementId,
            user_id: userId,
            option_index: optionIndex,
            value_text: valueText?.slice(0, 280) ?? null,
          },
          { onConflict: "story_id,element_id,user_id" },
        );
        if (error && !isMissingBackend(error)) report("story:vote", error);
      } catch (error) {
        if (!isMissingBackend(error)) report("story:vote", error);
      }
    }
    return getPollTally(storyId, elementId, Math.max(optionIndex + 1, counts.length), userId);
  });
}

/* --------------------- sliders + question responses --------------------- */

export interface SliderStats {
  elementId: string;
  average: number | null;
  count: number;
  mine: number | null;
}

export async function getSliderStats(
  storyId: string,
  elementId: string,
  userId: string | null,
): Promise<SliderStats> {
  const local = readLocal();
  const mineLocal = local.votes[storyId]?.[elementId] ?? null;
  const fallback: SliderStats = {
    elementId,
    average: mineLocal ?? null,
    count: mineLocal === null ? 0 : 1,
    mine: mineLocal,
  };
  if (!hasSupabaseConfig || !userId) return fallback;
  try {
    const { data, error } = await supabase
      .from("story_poll_votes")
      .select("user_id, option_index")
      .eq("story_id", storyId)
      .eq("element_id", elementId)
      .limit(1000);
    if (error) {
      if (!isMissingBackend(error)) report("story:slider-read", error);
      return fallback;
    }
    const rows = (data ?? []) as { user_id: string; option_index: number }[];
    let mine: number | null = mineLocal;
    let sum = 0;
    let count = 0;
    for (const row of rows) {
      const v = Math.max(0, Math.min(100, row.option_index));
      sum += v;
      count += 1;
      if (row.user_id === userId) mine = v;
    }
    if (mineLocal !== null && mineLocal !== undefined && !rows.some((r) => r.user_id === userId)) {
      sum += mineLocal;
      count += 1;
      mine = mineLocal;
    }
    return {
      elementId,
      average: count ? Math.round(sum / count) : null,
      count,
      mine,
    };
  } catch (error) {
    report("story:slider-read", error);
    return fallback;
  }
}

export interface TextResponse {
  userId: string;
  text: string;
  createdAt: string;
}

export async function listTextResponses(
  storyId: string,
  elementId: string,
): Promise<TextResponse[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data, error } = await supabase
      .from("story_poll_votes")
      .select("user_id, value_text, created_at")
      .eq("story_id", storyId)
      .eq("element_id", elementId)
      .not("value_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      if (!isMissingBackend(error)) report("story:text-read", error);
      return [];
    }
    return ((data ?? []) as { user_id: string; value_text: string | null; created_at: string }[])
      .filter((r) => r.value_text && r.value_text.trim())
      .map((r) => ({
        userId: r.user_id,
        text: (r.value_text ?? "").slice(0, 280),
        createdAt: r.created_at,
      }));
  } catch (error) {
    report("story:text-read", error);
    return [];
  }
}

/* --------------------------- settings + audience ------------------------ */

export async function getStorySettings(userId: string | null): Promise<StorySettings> {
  const local = readLocal().settings;
  if (!hasSupabaseConfig || !userId) return local ?? DEFAULT_STORY_SETTINGS;
  try {
    const { data, error } = await supabase
      .from("story_settings")
      .select("allow_replies, allow_reactions, allow_gifts, auto_archive, default_audience")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (!isMissingBackend(error)) report("story:settings-read", error);
      return local ?? DEFAULT_STORY_SETTINGS;
    }
    if (!data) return local ?? DEFAULT_STORY_SETTINGS;
    const row = data as {
      allow_replies: boolean;
      allow_reactions: boolean;
      allow_gifts: boolean;
      auto_archive: boolean;
      default_audience: string;
    };
    return {
      allowReplies: row.allow_replies,
      allowReactions: row.allow_reactions,
      allowGifts: row.allow_gifts,
      autoArchive: row.auto_archive,
      defaultAudience: row.default_audience === "close" ? "close" : "all",
    };
  } catch (error) {
    report("story:settings-read", error);
    return local ?? DEFAULT_STORY_SETTINGS;
  }
}

export async function saveStorySettings(
  userId: string | null,
  settings: StorySettings,
): Promise<StorySettings> {
  const local = readLocal();
  local.settings = settings;
  writeLocal(local);
  if (hasSupabaseConfig && userId) {
    try {
      const { error } = await supabase.from("story_settings").upsert(
        {
          user_id: userId,
          allow_replies: settings.allowReplies,
          allow_reactions: settings.allowReactions,
          allow_gifts: settings.allowGifts,
          auto_archive: settings.autoArchive,
          default_audience: settings.defaultAudience,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error && !isMissingBackend(error)) report("story:settings-save", error);
    } catch (error) {
      if (!isMissingBackend(error)) report("story:settings-save", error);
    }
  }
  return settings;
}

export async function listCloseFriends(userId: string | null): Promise<string[]> {
  const local = readLocal().closeFriends;
  if (!hasSupabaseConfig || !userId) return local;
  try {
    const { data, error } = await supabase
      .from("close_friends")
      .select("friend_id")
      .eq("owner_id", userId)
      .limit(200);
    if (error) {
      if (!isMissingBackend(error)) report("story:close-read", error);
      return local;
    }
    return ((data ?? []) as { friend_id: string }[]).map((r) => r.friend_id);
  } catch (error) {
    report("story:close-read", error);
    return local;
  }
}
