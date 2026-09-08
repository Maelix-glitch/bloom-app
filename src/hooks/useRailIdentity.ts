/**
 * useRailIdentity — the little identity the shared rail shows at its foot
 * (avatar, name, a one-line tagline) on every main page. A light read of the
 * signed-in user's profile row: no stories, no journey, no rewards — those
 * belong to useProfileSpace on the Profile page. Re-reads when the session
 * changes and when the Profile page announces an identity edit
 * (`bloom:profile-changed`), so a new avatar shows up in the rail at once.
 */

import { useEffect, useState } from "react";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { normalizeAccent, type BloomAccent } from "@/lib/profile/types";
import { syncPrefs } from "@/lib/prefs";

export const PROFILE_CHANGED_EVENT = "bloom:profile-changed";

export type RailIdentity = {
  status: "checking" | "signed-out" | "signed-in";
  /** null until the profile row is read, or when it holds the default name. */
  displayName: string | null;
  avatarPath: string | null;
  accent: BloomAccent;
  bio: string | null;
};

const SIGNED_OUT: RailIdentity = {
  status: "signed-out",
  displayName: null,
  avatarPath: null,
  accent: "violet",
  bio: null,
};

type Row = {
  display_name: string | null;
  avatar_path: string | null;
  accent: string | null;
  bio: string | null;
};

/*
 * The rail is rendered by every route rather than by a shared layout, so it
 * unmounts and remounts on every tab change. Without a cache that meant each
 * navigation re-ran getSession(), a profiles query and a prefs sync, and the
 * avatar dropped back to "checking" until they returned — the lag and flicker
 * on switching tabs.
 *
 * One module-level record, shared by every mount and kept between them. The
 * effect below still runs once per mount to subscribe to auth changes, but it
 * only *fetches* if nothing has been loaded yet.
 */
let cachedIdentity: RailIdentity | null = null;
/** Which user id the prefs document was last synced for. */
let syncedFor: string | null | undefined = undefined;
const identityListeners = new Set<(next: RailIdentity) => void>();

function publishIdentity(next: RailIdentity): void {
  cachedIdentity = next;
  for (const l of identityListeners) l(next);
}

/** Forget the cached rail identity (sign-out, "erase everything", tests). */
export function resetRailIdentity(): void {
  cachedIdentity = null;
  syncedFor = undefined;
}

export function useRailIdentity(): RailIdentity {
  const [identity, setIdentity] = useState<RailIdentity>(
    () => cachedIdentity ?? { ...SIGNED_OUT, status: "checking" },
  );

  useEffect(() => {
    /* Every mount listens, so one fetch updates all of them. */
    identityListeners.add(setIdentity);
    return () => void identityListeners.delete(setIdentity);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      publishIdentity(SIGNED_OUT);
      return;
    }

    let alive = true;
    let userId: string | null = null;

    async function read(uid: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_path, accent, bio")
        .eq("id", uid)
        .maybeSingle();
      if (!alive) return;
      if (error || !data) {
        publishIdentity({ ...SIGNED_OUT, status: "signed-in" });
        return;
      }
      const row = data as Row;
      const name = row.display_name?.trim() || null;
      publishIdentity({
        status: "signed-in",
        displayName: name && name !== "Bloom User" ? name : null,
        avatarPath: row.avatar_path,
        accent: normalizeAccent(row.accent),
        bio: row.bio?.trim() || null,
      });
    }

    function apply(uid: string | null) {
      userId = uid;
      /*
       * The rail is on every page, so this is where device preferences
       * (goals, active trackers, subjects, flow times) meet the account.
       *
       * Guarded by user id: onAuthStateChange fires on every remount as well
       * as on real sign-in/out, and re-syncing prefs on each tab change was
       * pure waste — a round trip and a write for a user who hasn't changed.
       */
      if (syncedFor !== uid) {
        syncedFor = uid;
        void syncPrefs(uid);
      }
      if (!uid) {
        publishIdentity(SIGNED_OUT);
        return;
      }
      void read(uid);
    }

    /*
     * Only reach for the network when we have nothing. A remount with a warm
     * cache still subscribes to auth changes below, but shows the known
     * identity immediately instead of blanking to "checking".
     */
    if (cachedIdentity === null) {
      void supabase.auth.getSession().then(({ data }) => {
        if (alive) apply(data.session?.user.id ?? null);
      });
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) apply(session?.user.id ?? null);
    });

    const onChanged = () => {
      if (userId) void read(userId);
    };
    window.addEventListener(PROFILE_CHANGED_EVENT, onChanged);

    return () => {
      alive = false;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_CHANGED_EVENT, onChanged);
    };
  }, []);

  return identity;
}

/** Call after saving the profile so every open rail refreshes its avatar. */
export function announceProfileChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}
