/**
 * The last good profile snapshot, per account.
 *
 * Two jobs, both about the Profile page never showing an empty room:
 *
 *   · **Instant paint.** A returning tracker sees their own name, avatar and
 *     cover on the first frame while the network read happens behind it — the
 *     same stale-while-revalidate trick the rail identity already uses, and the
 *     reason a premium app feels instant even on a slow connection.
 *   · **Graceful failure.** When the cloud read fails (offline, stale session,
 *     a half-migrated project) there is something real to show instead of an
 *     error wall — the person's own last-known profile, with a quiet note that
 *     it may be out of date and a way to retry.
 *
 * It is a cache, not a source of truth: it is only ever read to *bridge* a
 * failure or a first paint, it is keyed by user id so two accounts on one
 * device never see each other, and it is dropped on sign-out and by "erase
 * everything". Anything unreadable is treated as absent.
 */

import { normalizeAccent, type ProfileIdentity, type ProfilePrivacy } from "@/lib/profile/types";
import { parseFeatured, type MyProfileSnapshot } from "@/lib/profile/profileService";

const PREFIX = "bloom.profile.snapshot.v2.";

/** In-memory first: it survives a route change without touching storage. */
const memory = new Map<string, MyProfileSnapshot>();

const keyFor = (userId: string) => `${PREFIX}${userId}`;

function isIdentity(value: unknown): value is ProfileIdentity {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v["displayName"] === "string";
}

function normalize(snapshot: unknown): MyProfileSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot as Record<string, unknown>;
  const identity = raw["identity"];
  if (!isIdentity(identity)) return null;
  const privacy = (raw["privacy"] ?? null) as Partial<ProfilePrivacy> | null;
  return {
    identity: {
      displayName: identity.displayName || "Bloom User",
      username: typeof identity.username === "string" ? identity.username : null,
      bio: typeof identity.bio === "string" ? identity.bio : null,
      avatarPath: typeof identity.avatarPath === "string" ? identity.avatarPath : null,
      bannerPath: typeof identity.bannerPath === "string" ? identity.bannerPath : null,
      accent: normalizeAccent(identity.accent ?? null),
      featured: parseFeatured(identity.featured),
    },
    privacy: {
      profileVisibility: privacy?.profileVisibility === "public" ? "public" : "private",
      storyVisibility: privacy?.storyVisibility === "public" ? "public" : "private",
    },
    memberSince: typeof raw["memberSince"] === "string" ? raw["memberSince"] : null,
    email: typeof raw["email"] === "string" ? raw["email"] : null,
  };
}

export function readSnapshot(userId: string | null): MyProfileSnapshot | null {
  if (!userId) return null;
  const cached = memory.get(userId);
  if (cached) return cached;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = normalize(JSON.parse(raw));
    if (parsed) memory.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeSnapshot(userId: string | null, snapshot: MyProfileSnapshot): void {
  if (!userId) return;
  memory.set(userId, snapshot);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(snapshot));
  } catch {
    /* Storage full or blocked (private mode). The memory copy still helps for
       this session, which is the case that matters most. */
  }
}

/** Drop one account's copy, or every account's when no id is given. */
export function clearSnapshot(userId?: string | null): void {
  if (userId) {
    memory.delete(userId);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(keyFor(userId));
    } catch {
      /* ignore */
    }
    return;
  }
  memory.clear();
  if (typeof window === "undefined") return;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
