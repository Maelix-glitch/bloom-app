import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

/**
 * True when this environment actually has a project to talk to. Bloom is
 * usable without it — every page falls back to device-local storage — so a
 * missing config must never take a whole route down.
 */
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * A human-readable reason the cloud is unavailable, or null when it's fine.
 * Surfaced in the UI so "nothing saves" is never a silent mystery.
 */
export function supabaseConfigProblem(): string | null {
  if (hasSupabaseConfig) return null;
  if (!supabaseUrl && !supabaseAnonKey) {
    return "This copy of Bloom has no database connection configured, so everything is saved on this device only.";
  }
  return supabaseUrl
    ? "The database key is missing, so Bloom is saving to this device only."
    : "The database address is missing, so Bloom is saving to this device only.";
}

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Bloom isn't connected to a database in this environment, so records stay on this device.",
    );
  }
  cached ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      /*
       * Derived from the project URL rather than hardcoded. The old value was a
       * literal project ref, so pointing Bloom at a different project left the
       * session stored under the *previous* project's key — sessions appeared
       * to vanish, and two projects on one browser silently fought over one slot.
       */
      storageKey: `sb-${projectRef(supabaseUrl)}-auth-token`,
    },
  });
  return cached;
}

/** "https://abcd.supabase.co" -> "abcd". Falls back to a stable literal. */
function projectRef(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] || "bloom";
  } catch {
    return "bloom";
  }
}

/**
 * Lazily-created client. Previously this module threw while being imported,
 * which meant one missing env var blank-screened every route that touched it
 * (mood, profile, coach, cycle). Now the failure happens at call time, inside
 * the try/catch every storage adapter already has.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = client();
    const value = Reflect.get(instance, prop, instance) as unknown;
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/* -------------------------------------------------------------------------- */
/*  Safe accessors                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Subscribe to auth, without exploding when there's no project.
 *
 * The bug this exists to kill: several hooks did
 *
 *     void supabase.auth.getSession().then(...).catch(...)
 *     const { data } = supabase.auth.onAuthStateChange(...)   // <- not caught
 *
 * The `.catch` covers the promise but NOT the second statement, which touches
 * the throwing Proxy synchronously. So with no config the whole effect threw
 * on its first run: `loading` never cleared, the session never resolved, and
 * the page sat forever in its loading state. From the outside that looks like
 * "I can't save anything" — which is exactly what it was.
 *
 * Every caller now goes through here, and it degrades to "signed out" instead.
 *
 * @returns an unsubscribe function, always safe to call.
 */
export function watchAuth(onUser: (userId: string | null) => void): () => void {
  if (!hasSupabaseConfig) {
    /* Async so callers see the same ordering they would with a real client. */
    queueMicrotask(() => onUser(null));
    return () => {};
  }
  try {
    void supabase.auth
      .getSession()
      .then(({ data }) => onUser(data.session?.user.id ?? null))
      .catch(() => onUser(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      onUser(session?.user.id ?? null);
    });
    return () => {
      try {
        subscription.unsubscribe();
      } catch {
        /* already gone */
      }
    };
  } catch {
    queueMicrotask(() => onUser(null));
    return () => {};
  }
}

/**
 * Run a Supabase call and never throw.
 *
 * Returns `{ ok: false, reason }` for both "no project configured" and a real
 * network/API failure, so callers can tell the person something true without
 * every call site repeating the same try/catch.
 */
export async function trySupabase<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; reason: string; offline: boolean }> {
  if (!hasSupabaseConfig) {
    return {
      ok: false,
      offline: true,
      reason: supabaseConfigProblem() ?? "No database connection.",
    };
  }
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return {
      ok: false,
      offline: false,
      reason: e instanceof Error ? e.message : "That didn't go through.",
    };
  }
}
