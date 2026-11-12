/**
 * useRailIdentity — the little identity the shared rail shows at its foot
 * (avatar, name, a one-line tagline) on every main page. A light read of the
 * signed-in user's profile row: no stories, no journey, no rewards — those
 * belong to useProfileSpace on the Profile page. Re-reads when the session
 * changes and when the Profile page announces an identity edit
 * (`bloom:profile-changed`), so a new avatar shows up in the rail at once.
 */

import { useEffect, useState } from "react";

import { hasSupabaseConfig, supabase, watchAuth } from "@/lib/supabase";
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

/**
 * Whether a "no user" auth answer may turn the rail signed-out. Only once
 * a person has actually been established on this device: the auth client's
 * first answer on a cold load can be a *transient* null for someone who is
 * signed in — when session recovery errors or races the token refresh,
 * `@supabase/auth-js` emits `INITIAL_SESSION` with a null session, and
 * `watchAuth` forwards it like any other answer. Treating that first null
 * as signed-out painted "Sign in" in the rail for a frame before the real
 * session landed (warm loads recover cleanly, so it only ever showed on
 * the very first cold paint). Before establishment the honest state is
 * still "checking" — the neutral mark the rail already holds — and a
 * genuinely signed-out visitor meets the app-level access gate, which has
 * its own readiness rule. After establishment, a null is a real sign-out
 * and lands at once.
 */
export function nullAnswerEndsSession(
  current: RailIdentity | null,
): boolean {
  return current?.status === "signed-in";
}

type Row = {
  display_name: string | null;
  avatar_path: string | null;
  accent: string | null;
  bio: string | null;
};

/*
 * The rail is mounted once by the root layout, but it still unmounts and
 * remounts across the access gate (signed-out ↔ signed-in) and on a full
 * page load. Without a cache that meant each remount re-ran getSession(),
 * a profiles query and a prefs sync, and the avatar dropped back to
 * "checking" until they returned — the lag and flicker on tab switches
 * back when every page rendered its own rail.
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
        /* Hold the neutral checking state until someone has actually been
           established — see nullAnswerEndsSession. A first null answer on
           a cold load is not proof of signed-out. */
        if (nullAnswerEndsSession(cachedIdentity)) publishIdentity(SIGNED_OUT);
        return;
      }
      void read(uid);
    }

    /* watchAuth handles both the initial session read and auth changes. It
       also catches rejected/invalid auth clients so a rail remount cannot
       create an unhandled promise rejection in the console. */
    const stop = watchAuth((uid) => {
      if (alive) apply(uid);
    });

    const onChanged = () => {
      if (userId) void read(userId);
    };
    window.addEventListener(PROFILE_CHANGED_EVENT, onChanged);

    return () => {
      alive = false;
      stop();
      window.removeEventListener(PROFILE_CHANGED_EVENT, onChanged);
    };
  }, []);

  return identity;
}

/** Call after saving the profile so every open rail refreshes its avatar. */
export function announceProfileChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}
