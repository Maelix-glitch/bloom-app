/**
 * Bloom — profile service. All identity/privacy data access lives here so
 * components never speak to the database directly.
 */

import { supabase } from "@/lib/supabase";
import { report } from "./errors";
import {
  normalizeAccent,
  type FeaturedMoment,
  type ProfileIdentity,
  type ProfilePrivacy,
} from "./types";

export const PROFILE_MEDIA_BUCKET = "profile-media";

export function objectUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_path: string | null;
  accent: string | null;
  featured: unknown;
};

type PrivacyRow = {
  profile_visibility: string | null;
  story_visibility: string | null;
};

export function parseFeatured(value: unknown): FeaturedMoment | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { kind?: unknown; id?: unknown };
  if (
    (v.kind === "story" ||
      v.kind === "reflection" ||
      v.kind === "reward" ||
      v.kind === "milestone") &&
    typeof v.id === "string"
  ) {
    return { kind: v.kind, id: v.id };
  }
  return null;
}

export interface MyProfileSnapshot {
  identity: ProfileIdentity;
  privacy: ProfilePrivacy;
  memberSince: string | null;
  email: string | null;
}

const FALLBACK_IDENTITY: ProfileIdentity = {
  displayName: "Bloom User",
  username: null,
  bio: null,
  avatarPath: null,
  accent: "violet",
  featured: null,
};

const FALLBACK_PRIVACY: ProfilePrivacy = {
  profileVisibility: "private",
  storyVisibility: "private",
};

/**
 * Load my profile. Never fails: missing rows/columns (a project that hasn't
 * run the Profile migration yet) degrade to defaults, logged for developers.
 */
export async function loadMyProfile(userId: string): Promise<MyProfileSnapshot> {
  const { data: authData } = await supabase.auth.getUser();
  const fallbackEmail = authData.user?.email ?? null;
  const fallbackMemberSince = authData.user?.created_at ?? null;

  const snapshot: MyProfileSnapshot = {
    identity: FALLBACK_IDENTITY,
    privacy: FALLBACK_PRIVACY,
    memberSince: fallbackMemberSince,
    email: fallbackEmail,
  };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, avatar_path, accent, featured")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    report("profile:load", error);
    return snapshot;
  }

  if (data) {
    const row = data as ProfileRow;
    snapshot.identity = {
      displayName: row.display_name?.trim() || "Bloom User",
      username: row.username,
      bio: row.bio?.trim() || null,
      avatarPath: row.avatar_path,
      accent: normalizeAccent(row.accent),
      featured: parseFeatured(row.featured),
    };
  }

  const { data: privacyRow, error: privacyError } = await supabase
    .from("profile_privacy")
    .select("profile_visibility, story_visibility")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!privacyError && privacyRow) {
    const row = privacyRow as PrivacyRow;
    snapshot.privacy = {
      profileVisibility: row.profile_visibility === "public" ? "public" : "private",
      storyVisibility: row.story_visibility === "public" ? "public" : "private",
    };
  } else if (privacyError) {
    report("profile:privacy-load", privacyError);
  }

  return snapshot;
}

export interface ProfilePatch {
  displayName: string;
  username: string | null;
  bio: string | null;
  accent: string;
  featured: FeaturedMoment | null;
  /** Include only when the avatar is set or cleared — never clobber it otherwise. */
  avatarPath?: string | null;
}

export class ProfileSaveError extends Error {}

export async function saveProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const values: Record<string, unknown> = {
    display_name: patch.displayName,
    username: patch.username,
    bio: patch.bio,
    accent: patch.accent,
    featured: patch.featured,
    updated_at: new Date().toISOString(),
  };

  if ("avatarPath" in patch) values["avatar_path"] = patch.avatarPath;

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    report("profile:save", updateError);
    throw new ProfileSaveError("Couldn't save that just now.");
  }

  if (!updated) {
    // First profile save for an account created before the trigger existed.
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      profile_name: patch.displayName,
      total_points: 0,
      ...values,
    });
    if (insertError) {
      report("profile:save-insert", insertError);
      throw new ProfileSaveError("Couldn't save that just now.");
    }
  }
}

export async function savePrivacy(userId: string, privacy: ProfilePrivacy): Promise<void> {
  const { error } = await supabase.from("profile_privacy").upsert(
    {
      profile_id: userId,
      profile_visibility: privacy.profileVisibility,
      story_visibility: privacy.storyVisibility,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );

  if (error) {
    report("profile:privacy-save", error);
    throw new ProfileSaveError("Couldn't save that just now.");
  }
}

export type UsernameCheck = "available" | "taken" | "unknown";

export async function checkUsername(handle: string): Promise<UsernameCheck> {
  const { data, error } = await supabase.rpc("is_bloom_username_available", {
    p_username: handle,
  });
  if (error) {
    report("profile:username-check", error);
    return "unknown";
  }
  return data === true ? "available" : "taken";
}

export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) {
    report("profile:avatar-upload", error);
    throw new ProfileSaveError("Couldn't upload that image.");
  }
  return path;
}

export async function removeAvatar(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
  if (error) report("profile:avatar-remove", error); // reference is cleared regardless
}

export interface PublicProfileResponse {
  private?: boolean;
  username?: string;
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  accent?: string;
  featured?: unknown;
  stories?: unknown[];
  highlights?: unknown[];
}

export type PublicProfileResult =
  | { status: "not-found" }
  | { status: "private"; username: string }
  | { status: "found"; data: unknown };

export async function loadPublicProfile(handle: string): Promise<PublicProfileResult> {
  const { data, error } = await supabase.rpc("get_public_bloom_profile", {
    p_username: handle,
  });

  if (error) {
    report("profile:public-load", error);
    return { status: "not-found" };
  }
  if (!data) return { status: "not-found" };
  const payload = data as PublicProfileResponse;
  if (payload.private) return { status: "private", username: handle };
  return { status: "found", data };
}
