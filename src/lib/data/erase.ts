/**
 * B9 · "Erase everything".
 *
 * For an app holding cycle, mood and coach conversations, a delete path is
 * expected — and in most places required. Two halves:
 *
 *   · **this device** — every `bloom.*` key in localStorage, so nothing is
 *     left behind on a shared laptop even when there is no account; plus
 *     the Bloom keys that predate the `bloom.` prefix (the legacy cycle
 *     log and the error log) and the Coach drafts held in sessionStorage,
 *     which a localStorage wipe alone can never reach;
 *   · **the account** — an `erase_my_data()` RPC (security definer) that
 *     deletes every row keyed to the caller across the tables, and, if the
 *     project has been migrated to do so, the auth user itself.
 *
 * The device half always runs, even when the account half fails: someone
 * asking to be forgotten on a borrowed computer must not be blocked by the
 * network. The caller is told, honestly, which halves succeeded.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { clearSnapshot } from "@/lib/profile/identityCache";

export const ERASE_RPC = "erase_my_data";

/** Only a typed confirmation may trigger an erase — no misclicks. */
export const ERASE_PHRASE = "erase everything";

export const matchesErasePhrase = (typed: string): boolean =>
  typed.trim().toLowerCase() === ERASE_PHRASE;

export interface EraseResult {
  device: boolean;
  /** null when there was no account to erase (signed out / no Supabase). */
  account: boolean | null;
  /** Present when the account half failed — shown to the person verbatim. */
  message?: string;
}

/** Every key this app owns. Anything else in localStorage is left alone. */
export function bloomKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith("bloom.")) keys.push(key);
  }
  return keys;
}

/**
 * Bloom's own localStorage keys from before the `bloom.` prefix rule, which
 * the prefix therefore never matched:
 *   · `bloom_cycle_logs_advanced` — cycle day logs left by the predecessor
 *     page. `usePeriodLog` still falls back to them when the current store
 *     is empty, so leaving this key behind RESURRECTS erased cycle days on
 *     the next mount. It is the one genuinely dangerous miss.
 *   · `bloom:error-log:v1` — the client error log (lib/telemetry).
 */
export const LEGACY_DEVICE_KEYS = ["bloom_cycle_logs_advanced", "bloom:error-log:v1"] as const;

/**
 * Bloom's sessionStorage keys. The Coach composers keep the person's own
 * typed drafts there (`bloom.coach.drafts.v2`, `bloom-coach-draft`) — a
 * localStorage wipe cannot reach them, and they survive an erase in the
 * same tab. Anything not Bloom's is left alone.
 */
export function bloomSessionKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && (key.startsWith("bloom.") || key.startsWith("bloom-"))) keys.push(key);
  }
  return keys;
}

/** Wipes this device's copy. Returns how many keys were removed. */
export function eraseDevice(storage?: Storage, session?: Storage): number {
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  const sessionStore =
    session ?? (typeof window === "undefined" ? null : window.sessionStorage);
  /* The profile snapshot keeps an in-memory copy so a route change doesn't
     re-read storage — that copy has to go too, or "erase everything" leaves the
     name and avatar on screen until a reload. */
  clearSnapshot();
  let removed = 0;
  const wipe = (storeToWipe: Storage, keys: string[]): void => {
    for (const key of keys) {
      try {
        storeToWipe.removeItem(key);
        removed += 1;
      } catch {
        /* a locked key must not stop the rest */
      }
    }
  };
  if (store) {
    wipe(store, [
      ...bloomKeys(store),
      ...LEGACY_DEVICE_KEYS.filter((key) => store.getItem(key) !== null),
    ]);
  }
  if (sessionStore) wipe(sessionStore, bloomSessionKeys(sessionStore));
  return removed;
}

function missingRpc(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    e.code === "42883" ||
    e.code === "PGRST202" ||
    /could not find the function|does not exist|schema cache/i.test(msg)
  );
}

/**
 * Ask the account to forget everything. Resolves `false` with a message when
 * the migration hasn't been run yet — the device is still wiped by the caller.
 */
export async function eraseAccount(): Promise<{ ok: boolean; message?: string }> {
  if (!hasSupabaseConfig)
    return { ok: false, message: "This device isn't connected to an account." };
  try {
    const { error } = await supabase.rpc(ERASE_RPC);
    if (error) {
      if (missingRpc(error)) {
        return {
          ok: false,
          message:
            "Your data is gone from this device. The account-side erase needs the 20260910_erase_account.sql migration to be run first.",
        };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "The erase didn't go through.",
    };
  }
}

/**
 * The whole thing: account first (so a failure is reported honestly), device
 * always, then sign out. `signedIn` false skips the account half entirely.
 */
export async function eraseEverything(signedIn: boolean): Promise<EraseResult> {
  let account: boolean | null = null;
  let message: string | undefined;

  if (signedIn && hasSupabaseConfig) {
    const res = await eraseAccount();
    account = res.ok;
    if (res.message) message = res.message;
  }

  eraseDevice();

  if (signedIn && hasSupabaseConfig) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* already gone */
    }
  }

  return message === undefined ? { device: true, account } : { device: true, account, message };
}
