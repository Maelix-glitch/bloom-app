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

export function useRailIdentity(): RailIdentity {
  const [identity, setIdentity] = useState<RailIdentity>({ ...SIGNED_OUT, status: "checking" });

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setIdentity(SIGNED_OUT);
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
        setIdentity({ ...SIGNED_OUT, status: "signed-in" });
        return;
      }
      const row = data as Row;
      const name = row.display_name?.trim() || null;
      setIdentity({
        status: "signed-in",
        displayName: name && name !== "Bloom User" ? name : null,
        avatarPath: row.avatar_path,
        accent: normalizeAccent(row.accent),
        bio: row.bio?.trim() || null,
      });
    }

    function apply(uid: string | null) {
      userId = uid;
      if (!uid) {
        setIdentity(SIGNED_OUT);
        return;
      }
      void read(uid);
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (alive) apply(data.session?.user.id ?? null);
    });
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
