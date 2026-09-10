/**
 * Is this person a Bloom admin? Answered by the database, not by the browser.
 *
 * The admin door used to be a button anyone could press. It wrote
 * `admin: true` into local storage and handed over a launcher for every
 * surface in the app. Nothing privileged sat behind it — the reward admin and
 * the point audit both re-check `is_rewards_admin()` on the server, so no data
 * was ever exposed — but a shield-icon button labelled "Launch as admin" that
 * opens for every visitor is not a thing to ship. It reads as a security
 * control and behaves as a shortcut.
 *
 * So the door is now gated on the same authority the reward admin already
 * uses: `public.app_admins`, a table that `anon` and `authenticated` have no
 * privileges on at all. Membership is granted by inserting a user id from a
 * trusted SQL session — there is no client-side path in, and no way for a
 * signed-in user to promote themselves.
 *
 * Rules this module follows:
 *
 *   · **Fail closed.** Signed out, no project, RPC error, timeout, or an
 *     unexpected answer: `denied`. Access is never granted by default.
 *   · **Checked, never assumed.** Nothing renders the door while the answer is
 *     still `"checking"`, so a forbidden control never flashes into view and
 *     then disappears.
 *   · **One request per session per person.** The result is cached by user id
 *     at module scope, so Welcome, the admin bar and the launcher don't each
 *     fire their own RPC.
 *   · **Reactive.** Sign in and the door appears; sign out and it goes, without
 *     a reload.
 *
 * The one exception is `DEV_DOOR` below, and it is deliberately narrow.
 */

import { useEffect, useSyncExternalStore } from "react";

import { hasSupabaseConfig, supabase, watchAuth } from "@/lib/supabase";

export type AdminStatus = "checking" | "granted" | "denied";

export interface AdminAccess {
  status: AdminStatus;
  /**
   * True only when access came from the local-development fallback rather than
   * from Supabase. The admin bar labels that case, so a developer never
   * mistakes it for real access.
   */
  devOnly: boolean;
}

const GRANTED: AdminAccess = { status: "granted", devOnly: false };
const DENIED: AdminAccess = { status: "denied", devOnly: false };
const CHECKING: AdminAccess = { status: "checking", devOnly: false };
const GRANTED_DEV: AdminAccess = { status: "granted", devOnly: true };

/**
 * The local-development door.
 *
 * `vite build` sets mode to `production`, which inlines `import.meta.env.DEV`
 * as `false` and lets the minifier delete this branch entirely: the shipped
 * client bundle contains neither `import.meta.env.DEV` nor the `devOnly: true`
 * object this branch returns. It is additionally gated on there being *no*
 * database at all, so even a development build against a real project still
 * asks Supabase.
 *
 * What it grants is only the launcher: the reward admin and the point audit
 * keep enforcing their own server-side checks either way.
 */
const DEV_DOOR = import.meta.env.DEV && !hasSupabaseConfig;

/**
 * Preferred name first, then the function that already exists in deployed
 * projects. `is_bloom_admin()` is the honest name for an app-wide door;
 * `is_rewards_admin()` is the one the reward delivery migration created and
 * the one a live project is guaranteed to have. Trying the new name first
 * means upgrading the database is optional rather than a lockout.
 */
const ADMIN_RPCS = ["is_bloom_admin", "is_rewards_admin"] as const;

/** "The function isn't there" — try the next name rather than denying. */
function isMissingFunction(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === "42883" || code === "PGRST202") return true;
  return typeof message === "string" && /could not find the function/i.test(message);
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The same shape as `lib/prefsStore`: a module-level snapshot with a listener
 * set, read through `useSyncExternalStore`. Chosen so that a hook mounted in
 * three places at once agrees, and so a remount during navigation doesn't
 * restart the check or flash the door.
 */
let snapshot: AdminAccess = CHECKING;
const listeners = new Set<() => void>();
/** user id -> decision. Cleared on sign-out for that id. */
const decisions = new Map<string, "granted" | "denied">();
let inFlight: Promise<void> | null = null;
let unwatch: (() => void) | null = null;

function publish(next: AdminAccess): void {
  if (next.status === snapshot.status && next.devOnly === snapshot.devOnly) return;
  snapshot = next;
  for (const l of [...listeners]) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/* The server pass has no session and must never render the door. Returning the
   same object identity for the server and hydration passes is what keeps the
   markup identical and React quiet. */
const serverSnapshot = (): AdminAccess => CHECKING;
const getSnapshot = (): AdminAccess => snapshot;

/** Give up on a slow request rather than leaving the door undecided forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("admin check timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

async function decide(userId: string | null): Promise<AdminAccess> {
  if (DEV_DOOR) return GRANTED_DEV;
  /* No project means no accounts, so nobody can be an admin. */
  if (!hasSupabaseConfig || !userId) return DENIED;

  const cached = decisions.get(userId);
  if (cached) return cached === "granted" ? GRANTED : DENIED;

  for (const name of ADMIN_RPCS) {
    try {
      /* `rpc()` returns a thenable builder rather than a Promise, so wrap it
         before timing it out. */
      const { data, error } = await withTimeout(Promise.resolve(supabase.rpc(name)), 12_000);
      if (error) {
        /* The function isn't installed — fall through to the next name. Any
           other error is a real failure and fails closed. */
        if (isMissingFunction(error)) continue;
        return DENIED;
      }
      /* Only a literal `true` counts. Anything else — null, an object, a
         string — is treated as no access. */
      const granted = data === true;
      decisions.set(userId, granted ? "granted" : "denied");
      return granted ? GRANTED : DENIED;
    } catch {
      return DENIED;
    }
  }
  /* Every candidate name was missing: the migration hasn't been run. */
  return DENIED;
}

async function resolve(userId: string | null): Promise<void> {
  /* A sign-out invalidates whatever we knew about that person. */
  if (!userId) decisions.clear();
  publish(await decide(userId));
}

/** Subscribe to auth exactly once for the whole app. */
function ensureStarted(): void {
  if (unwatch) return;
  unwatch = watchAuth((userId) => {
    /* Serialise: two auth events in quick succession must not race, or a
       stale "denied" can land after a fresh "granted". */
    inFlight = (inFlight ?? Promise.resolve()).then(() => resolve(userId));
  });
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Whether the admin door should exist for this person.
 *
 * Render nothing while `status === "checking"`: showing a control and then
 * taking it away is worse than showing it a beat late.
 */
export function useAdminAccess(): AdminAccess {
  const value = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  useEffect(() => {
    ensureStarted();
  }, []);
  return value;
}

/**
 * Drop the cached decision and re-ask. Used after sign-in from a surface that
 * doesn't rely on the auth subscription, and by the tests.
 */
export async function refreshAdminAccess(userId: string | null): Promise<AdminAccess> {
  await resolve(userId);
  return snapshot;
}

/** Test helper: back to "never asked". */
export function __resetAdminAccessForTests(): void {
  decisions.clear();
  inFlight = null;
  snapshot = CHECKING;
  if (unwatch) {
    unwatch();
    unwatch = null;
  }
}