import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

/**
 * True when this environment actually has a project to talk to. Bloom is
 * usable without it — every page falls back to device-local storage — so a
 * missing config must never take a whole route down.
 */
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

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
      storageKey: "sb-zsqsfxmjphctknnumgsi-auth-token",
    },
  });
  return cached;
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
