/**
 * Bloom — profile service. All identity/privacy data access lives here so
 * components never speak to the database directly.
 */

import { supabase } from "@/lib/supabase";
import { report } from "./errors";
import { classifyError, type ProfileProblem } from "./problems";
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
  banner_path: string | null;
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
  bannerPath: null,
  accent: "violet",
  featured: null,
};

const FALLBACK_PRIVACY: ProfilePrivacy = {
  profileVisibility: "private",
  storyVisibility: "private",
};

/** Raised when the profile row itself cannot be read (network, RLS, migration). */
export class ProfileLoadError extends Error {
  /** What actually went wrong, already translated for a screen. */
  readonly problem: ProfileProblem;

  constructor(problem: ProfileProblem) {
    super(problem.message);
    this.name = "ProfileLoadError";
    this.problem = problem;
  }
}

/** Every column the identity migration adds. */
const FULL_COLUMNS = "id, display_name, username, bio, avatar_path, banner_path, accent, featured";

/**
 * Narrower reads, tried in order only when the project says a *column* is
 * missing — a real state: `20260909_core_tables.sql` creates `profiles` with
 * (id, profile_name, total_points) and `20260828_profile_identity_stories.sql`
 * adds the identity columns, and a project that ran one without the other
 * answers "column does not exist" on the full select. Reading what exists
 * keeps the page alive; failing the whole profile over one column is what made
 * this look like "Bloom can't load my profile".
 */
const PARTIAL_COLUMN_SETS = [
  "id, display_name, username, bio, avatar_path, banner_path, accent",
  "id, display_name, avatar_path, accent",
  "id, display_name",
];

/**
 * Ask the session to refresh itself, once. An expired access token comes back
 * as an error on the *read* (PGRST301 / "JWT expired"), not from the auth
 * client, so this is the only place it can be repaired — and repairing it here
 * means a laptop waking from sleep shows a profile instead of an error.
 */
async function refreshSessionOnce(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && Boolean(data.session);
  } catch (error) {
    report("profile:session-refresh", error);
    return false;
  }
}

type SelectResult = { data: unknown; error: unknown };

/**
 * Load my profile. A missing row is not an error — accounts created before
 * the profile trigger simply get defaults until their first save. A failed
 * read, however, throws: silently degrading to the default identity made a
 * network error or an un-migrated project look exactly like "Bloom forgot
 * my profile" (and invited overwriting real data from the fake defaults).
 *
 * Before it throws it tries, in order: a session refresh (stale token), and a
 * narrower select (a project missing one of the identity columns). Both are
 * cheap, and both turn "the profile is broken" back into "the profile loads".
 */
export async function loadMyProfile(userId: string): Promise<MyProfileSnapshot> {
  /* The auth read is a nicety (email, member since) — it must never be the
     reason the profile fails, and with no project configured it throws. */
  let fallbackEmail: string | null = null;
  let fallbackMemberSince: string | null = null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    fallbackEmail = authData.user?.email ?? null;
    fallbackMemberSince = authData.user?.created_at ?? null;
  } catch (error) {
    report("profile:auth", error);
  }

  const snapshot: MyProfileSnapshot = {
    identity: FALLBACK_IDENTITY,
    privacy: FALLBACK_PRIVACY,
    memberSince: fallbackMemberSince,
    email: fallbackEmail,
  };

  const readRow = (columns: string): Promise<SelectResult> =>
    supabase
      .from("profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle() as unknown as Promise<SelectResult>;

  let lastProblem: ProfileProblem | null = null;
  let data: unknown = null;
  let refreshed = false;

  /*
   * An index loop, not a `for…of`: a session refresh retries the *same* columns
   * (the token was the problem, not the schema), while a missing column moves
   * on to the next narrower set.
   */
  const columnSets = [FULL_COLUMNS, ...PARTIAL_COLUMN_SETS];
  for (let attempt = 0; attempt < columnSets.length;) {
    const columns = columnSets[attempt]!;
    let result: SelectResult;
    try {
      result = await readRow(columns);
    } catch (error) {
      /* The lazy Supabase proxy throws when there is no project to talk to. */
      lastProblem = classifyError(error);
      report("profile:load", error);
      break;
    }

    if (!result.error) {
      data = result.data;
      lastProblem = null;
      break;
    }

    const problem = classifyError(result.error);
    report("profile:load", result.error);
    lastProblem = problem;

    /* A stale token is worth exactly one refresh, then one more read of the
       same columns. */
    if (problem.kind === "session" && !refreshed) {
      refreshed = true;
      if (await refreshSessionOnce()) continue;
    }
    /* Only a missing column is fixed by asking for less. */
    if (!problem.partialReadPossible) break;
    attempt += 1;
  }

  if (lastProblem) throw new ProfileLoadError(lastProblem);

  if (data) {
    const row = data as Partial<ProfileRow>;
    snapshot.identity = {
      displayName: row.display_name?.trim() || "Bloom User",
      username: row.username ?? null,
      bio: row.bio?.trim() || null,
      avatarPath: row.avatar_path ?? null,
      bannerPath: row.banner_path ?? null,
      accent: normalizeAccent(row.accent ?? null),
      featured: parseFeatured(row.featured),
    };
  }

  const { data: privacyRow, error: privacyError } = (await supabase
    .from("profile_privacy")
    .select("profile_visibility, story_visibility")
    .eq("profile_id", userId)
    .maybeSingle()) as unknown as SelectResult;

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
  /** Include only when the banner is set or cleared — never clobber it otherwise. */
  bannerPath?: string | null;
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
  if ("bannerPath" in patch) values["banner_path"] = patch.bannerPath;

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

export async function uploadBanner(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/banner.jpg`;
  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) {
    report("profile:banner-upload", error);
    throw new ProfileSaveError("Couldn't upload that banner.");
  }
  return path;
}

export async function removeBanner(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
  if (error) report("profile:banner-remove", error);
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
