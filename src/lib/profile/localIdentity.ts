/**
 * Device-local profile identity — the "no account connected" fallback.
 *
 * Bloom's rule everywhere else (mood, trackers, habits, prefs) is that a
 * missing database means the device keeps the data. The profile editor was
 * the one exception: without an account it refused to save, and the page
 * rendered a hardcoded preview ("Bloom User", no username), so a name,
 * @username or bio typed into the editor vanished on the next visit — which
 * read exactly like "Bloom lost my profile".
 *
 * This store keeps identity edits between visits in a device-only build
 * (no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). It is deliberately never
 * used when a real project is configured: a signed-in profile always reads
 * and writes Supabase, so the two can never disagree.
 *
 * Avatar uploads need cloud storage (an account); the bundled `preset:`
 * photos are plain asset paths, so they save and restore fine on-device.
 */

import { normalizeAccent, type BloomAccent } from "@/lib/profile/types";
import { BIO_MAX, NAME_MAX, USERNAME_MAX } from "@/lib/profile/validation";

export interface LocalIdentity {
  displayName: string;
  username: string | null;
  bio: string | null;
  accent: BloomAccent;
  avatarPath: string | null;
  updatedAt: number;
}

export interface LocalIdentityPatch {
  displayName?: string;
  username?: string | null;
  bio?: string | null;
  accent?: BloomAccent;
  avatarPath?: string | null;
}

const KEY = "bloom.profile.local.v1";

const DEFAULTS = {
  displayName: "Bloom User",
  username: null,
  bio: null,
  accent: "violet" as BloomAccent,
  avatarPath: null,
};

/** Trim, clamp to the same limits the database enforces, empty → null. */
function clean(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
}

/**
 * Read the saved identity, or null when nothing is stored (first visit) or
 * the record is unreadable (corrupted / partial JSON — treated as absent
 * rather than half-applied).
 */
function read(): LocalIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalIdentity> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const displayName = clean(parsed.displayName, NAME_MAX) ?? DEFAULTS.displayName;
    return {
      displayName,
      username: clean(parsed.username, USERNAME_MAX),
      bio: clean(parsed.bio, BIO_MAX),
      accent: normalizeAccent(parsed.accent ?? null),
      avatarPath: typeof parsed.avatarPath === "string" ? parsed.avatarPath : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Merge a patch over what's saved, clamp it, persist, and return the result. */
function write(patch: LocalIdentityPatch): LocalIdentity {
  const current = read() ?? { ...DEFAULTS, updatedAt: 0 };
  const next: LocalIdentity = {
    displayName:
      patch.displayName !== undefined
        ? (clean(patch.displayName, NAME_MAX) ?? DEFAULTS.displayName)
        : current.displayName,
    username: patch.username !== undefined ? clean(patch.username, USERNAME_MAX) : current.username,
    bio: patch.bio !== undefined ? clean(patch.bio, BIO_MAX) : current.bio,
    accent: patch.accent !== undefined ? normalizeAccent(patch.accent) : current.accent,
    avatarPath:
      patch.avatarPath !== undefined ? patch.avatarPath?.trim() || null : current.avatarPath,
    updatedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable — the in-memory patch still applies */
    }
  }
  return next;
}

function clear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const localIdentity = { read, write, clear };
