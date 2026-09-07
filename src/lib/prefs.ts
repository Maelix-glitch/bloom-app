/**
 * Small preferences that should follow the person, not the device.
 *
 * Tracker goals, which trackers are tracked, the study subjects someone has
 * typed, the times on Today's flow — each used to live in its own device-only
 * key, so "goal met" could disagree between phone and laptop. They now live in
 * one document: `{ [key]: { value, updatedAt } }`, mirrored to `user_prefs`
 * (one row per person) and merged per key, later wins.
 *
 * Device-first like everything else: reads never wait for the network, a
 * missing table or a signed-out session just means "this device only".
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export const PREFS_KEY = "bloom.prefs.v1";
export const PREFS_CHANGED = "bloom:prefs-changed";
export const PREFS_TABLE = "user_prefs";

export interface PrefEntry {
  value: unknown;
  /** ISO timestamp of the write that produced `value`. */
  updatedAt: string;
}

export type PrefsDoc = Record<string, PrefEntry>;

const hasWindow = () => typeof window !== "undefined";

/* --------------------------------- document -------------------------------- */

export function normalizeDoc(raw: unknown): PrefsDoc {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PrefsDoc = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { value?: unknown; updatedAt?: unknown };
    if (typeof e.updatedAt !== "string" || Number.isNaN(Date.parse(e.updatedAt))) continue;
    if (!("value" in e)) continue;
    out[key] = { value: e.value, updatedAt: e.updatedAt };
  }
  return out;
}

export function loadDoc(): PrefsDoc {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? normalizeDoc(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function saveDoc(doc: PrefsDoc): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(doc));
    window.dispatchEvent(new Event(PREFS_CHANGED));
  } catch {
    /* storage full or blocked — the session still works */
  }
}

/** Per key, the later write wins. Reports which side had anything newer. */
export function mergeDocs(
  local: PrefsDoc,
  remote: PrefsDoc,
): { merged: PrefsDoc; localNewer: boolean; remoteNewer: boolean } {
  const merged: PrefsDoc = {};
  let localNewer = false;
  let remoteNewer = false;
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  for (const key of keys) {
    const l = local[key];
    const r = remote[key];
    if (l && r) {
      if (l.updatedAt > r.updatedAt) {
        merged[key] = l;
        localNewer = true;
      } else if (r.updatedAt > l.updatedAt) {
        merged[key] = r;
        remoteNewer = true;
      } else {
        merged[key] = r;
      }
    } else if (l) {
      merged[key] = l;
      localNewer = true;
    } else if (r) {
      merged[key] = r;
      remoteNewer = true;
    }
  }
  return { merged, localNewer, remoteNewer };
}

/* ---------------------------------- access --------------------------------- */

/**
 * Read one preference. `parse` turns whatever is on disk into a `T` (or null
 * when it's unusable) so a corrupt value can never reach the UI.
 */
export function getPref<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  const entry = loadDoc()[key];
  if (!entry) return fallback;
  const parsed = parse(entry.value);
  return parsed === null ? fallback : parsed;
}

/** Write one preference, stamp it, tell every listener, and queue it for the account. */
export function setPref(key: string, value: unknown): void {
  const doc = loadDoc();
  doc[key] = { value, updatedAt: new Date().toISOString() };
  saveDoc(doc);
  schedulePush();
}

/** Forget one preference (it is removed, not tombstoned — a later write on another device revives it). */
export function clearPref(key: string): void {
  const doc = loadDoc();
  if (!(key in doc)) return;
  delete doc[key];
  saveDoc(doc);
}

/* ----------------------------------- sync ---------------------------------- */

let knownProfileId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let tableMissing = false;

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    e.code === "42P01" ||
    e.code === "PGRST205" ||
    /relation .* does not exist|could not find the table|schema cache/i.test(msg)
  );
}

/** The account's document, or null when there is none / the table isn't migrated yet. */
export async function pullPrefs(profileId: string): Promise<PrefsDoc | null> {
  if (!hasSupabaseConfig || tableMissing) return null;
  const { data, error } = await supabase
    .from(PREFS_TABLE)
    .select("prefs")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) {
      tableMissing = true;
      return null;
    }
    throw new Error(error.message);
  }
  return data ? normalizeDoc((data as { prefs?: unknown }).prefs) : {};
}

export async function pushPrefs(profileId: string, doc: PrefsDoc): Promise<void> {
  if (!hasSupabaseConfig || tableMissing) return;
  const { error } = await supabase
    .from(PREFS_TABLE)
    .upsert(
      { profile_id: profileId, prefs: doc, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  if (error) {
    if (isMissingTable(error)) {
      tableMissing = true;
      return;
    }
    throw new Error(error.message);
  }
}

function schedulePush(): void {
  if (!knownProfileId || !hasWindow()) return;
  if (pushTimer) clearTimeout(pushTimer);
  const pid = knownProfileId;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushPrefs(pid, loadDoc()).catch(() => {
      /* the next change or the next sync retries; nothing is lost on the device */
    });
  }, 800);
}

/**
 * Reconcile this device with the account: pull, merge per key, apply anything
 * newer from the account, push anything newer from here. Safe to call often.
 */
export async function syncPrefs(profileId: string | null): Promise<void> {
  knownProfileId = profileId;
  if (!profileId) return;
  try {
    const remote = await pullPrefs(profileId);
    if (remote === null) return;
    const { merged, localNewer, remoteNewer } = mergeDocs(loadDoc(), remote);
    if (remoteNewer) saveDoc(merged);
    if (localNewer) await pushPrefs(profileId, merged);
  } catch {
    /* offline or a transient error — device copy stands, next sync retries */
  }
}

/** Test seam: forget the "table missing" probe result. */
export function resetPrefsProbe(): void {
  tableMissing = false;
}
