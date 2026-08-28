/**
 * useProfileSpace — the Profile page's data orchestrator.
 * Local to the Profile route (no global store): session → identity →
 * stories → highlights → journey. Every block loads independently and can
 * fail quietly without taking the rest of the page down.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { moodStorage } from "@/lib/mood/storage";
import type { MoodEntry } from "@/lib/mood/types";
import { report } from "@/lib/profile/errors";
import {
  loadMyProfile,
  removeAvatar,
  savePrivacy,
  saveProfile,
  uploadAvatar,
  type MyProfileSnapshot,
  type ProfilePatch,
} from "@/lib/profile/profileService";
import {
  createHighlight,
  createStory,
  deleteHighlight,
  deleteStory,
  listMyHighlights,
  listMyStories,
  reshareStory,
  restoreStory,
  setStoryVisibility,
  updateHighlight,
  type CreateStoryInput,
} from "@/lib/profile/storyService";
import {
  computeActivity,
  computeCompleteness,
  computeMilestones,
  computeStats,
  type RewardRecord,
} from "@/lib/profile/journey";
import {
  isStoryActive,
  type BloomAccent,
  type HighlightItem,
  type ProfilePrivacy,
  type Story,
  type StoryVisibility,
} from "@/lib/profile/types";

export type AuthState = "checking" | "signed-out" | "signed-in";

type Block<T> =
  { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string };

const GENTLE = "Couldn't load that just now.";

const FALLBACK_IDENTITY_FOR_JOURNEY = {
  displayName: "Bloom User",
  username: null,
  bio: null,
  avatarPath: null,
  featured: null as null,
};

export function useProfileSpace() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [userId, setUserId] = useState<string | null>(null);

  const [identityBlock, setIdentityBlock] = useState<Block<MyProfileSnapshot> | null>(null);
  const [storiesBlock, setStoriesBlock] = useState<Block<Story[]> | null>(null);
  const [highlightsBlock, setHighlightsBlock] = useState<Block<HighlightItem[]> | null>(null);
  const [moodBlock, setMoodBlock] = useState<Block<MoodEntry[]> | null>(null);
  const [rewardsBlock, setRewardsBlock] = useState<Block<RewardRecord[]> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /* ------------------------------- session ------------------------------- */
  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      setAuthState(uid ? "signed-in" : "signed-out");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const uid = session?.user.id ?? null;
      setUserId(uid);
      setAuthState(uid ? "signed-in" : "signed-out");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ----------------------------- parallel load ---------------------------- */
  useEffect(() => {
    if (authState === "signed-out") {
      // Preview mode: the full Profile renders without an account, backed by
      // real empty state — never invented data.
      setIdentityBlock({
        status: "ready",
        data: {
          identity: {
            displayName: "Bloom User",
            username: null,
            bio: null,
            avatarPath: null,
            accent: "violet",
            featured: null,
          },
          privacy: { profileVisibility: "private", storyVisibility: "private" },
          memberSince: null,
          email: null,
        },
      });
      setStoriesBlock({ status: "ready", data: [] });
      setHighlightsBlock({ status: "ready", data: [] });
      setMoodBlock({ status: "ready", data: [] });
      setRewardsBlock({ status: "ready", data: [] });
      return;
    }
    if (authState !== "signed-in" || !userId) return;
    let alive = true;

    setIdentityBlock({ status: "loading" });
    setStoriesBlock({ status: "loading" });
    setHighlightsBlock({ status: "loading" });
    setMoodBlock({ status: "loading" });
    setRewardsBlock({ status: "loading" });

    void loadMyProfile(userId)
      .then((snapshot) => alive && setIdentityBlock({ status: "ready", data: snapshot }))
      .catch((error) => {
        report("profile:identity", error);
        if (alive) setIdentityBlock({ status: "error", message: GENTLE });
      });

    void listMyStories(userId)
      .then((rows) => alive && setStoriesBlock({ status: "ready", data: rows }))
      .catch((error) => {
        report("profile:stories", error);
        if (alive)
          setStoriesBlock({ status: "error", message: "Your stories couldn't be read just now." });
      });

    void listMyHighlights(userId)
      .then((rows) => alive && setHighlightsBlock({ status: "ready", data: rows }))
      .catch((error) => {
        report("profile:highlights", error);
        if (alive) setHighlightsBlock({ status: "error", message: GENTLE });
      });

    void moodStorage
      .all(userId)
      .then((rows) => alive && setMoodBlock({ status: "ready", data: rows }))
      .catch((error) => {
        report("profile:mood", error);
        if (alive) setMoodBlock({ status: "error", message: GENTLE });
      });

    void Promise.resolve(supabase.rpc("get_my_rewards"))
      .then(({ data, error }) => {
        if (error) throw error;
        const rows = (data ?? []) as {
          id: string;
          title: string;
          claimed_at: string | null;
          delivery_state: string;
        }[];
        const claimable = rows
          .filter((r) => r.delivery_state === "claimed" || r.claimed_at)
          .map((r) => ({ id: r.id, title: r.title, claimed_at: r.claimed_at }));
        if (alive) setRewardsBlock({ status: "ready", data: claimable });
      })
      .catch((error) => {
        report("profile:rewards", error);
        if (alive) setRewardsBlock({ status: "error", message: GENTLE });
      });

    return () => {
      alive = false;
    };
  }, [authState, userId, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  /* ------------------------------- derived ------------------------------- */
  const identity = identityBlock?.status === "ready" ? identityBlock.data : null;
  const allStories = storiesBlock?.status === "ready" ? storiesBlock.data : null;

  const storiesByAge = useMemo(() => {
    if (!allStories) return null;
    const now = Date.now();
    return {
      active: allStories.filter((s) => isStoryActive(s, now)),
      archived: allStories.filter((s) => !isStoryActive(s, now)),
    };
  }, [allStories]);

  // Expire the rail on the minute hand — active → archived without reload.
  const [expiryTick, setExpiryTick] = useState(0);
  useEffect(() => {
    if (!storiesByAge?.active.length) return;
    const soonest = Math.min(...storiesByAge.active.map((s) => new Date(s.expiresAt).getTime()));
    if (!Number.isFinite(soonest)) return;
    const delay = Math.min(2_147_483_647, Math.max(1_000, soonest - Date.now() + 250));
    const timer = window.setTimeout(() => setExpiryTick((t) => t + 1), delay);
    return () => window.clearTimeout(timer);
  }, [storiesByAge, expiryTick]);

  const journeySource = useMemo(() => {
    if (
      !identity ||
      storiesBlock?.status !== "ready" ||
      highlightsBlock?.status !== "ready" ||
      moodBlock?.status !== "ready" ||
      rewardsBlock?.status !== "ready"
    ) {
      return null;
    }
    return {
      entries: moodBlock.data,
      rewards: rewardsBlock.data,
      stories: storiesBlock.data,
      highlights: highlightsBlock.data,
      memberSince: identity.memberSince,
    };
  }, [identity, storiesBlock, highlightsBlock, moodBlock, rewardsBlock]);

  const journey = useMemo<ProfileSpaceJourney>(() => {
    if (!journeySource) {
      if (
        identityBlock?.status === "loading" ||
        storiesBlock?.status === "loading" ||
        highlightsBlock?.status === "loading" ||
        moodBlock?.status === "loading"
      ) {
        return { status: "loading" };
      }
      return { status: "error", message: GENTLE };
    }
    return {
      status: "ready",
      stats: computeStats(journeySource),
      milestones: computeMilestones(journeySource),
      activity: computeActivity(journeySource),
      completeness: computeCompleteness(
        identity?.identity ?? {
          displayName: "Bloom User",
          username: null,
          bio: null,
          avatarPath: null,
          featured: null,
        },
        (allStories?.length ?? 0) > 0,
      ),
    };
  }, [
    journeySource,
    identity,
    allStories,
    identityBlock,
    storiesBlock,
    highlightsBlock,
    moodBlock,
  ]);

  const identityRef = identity; // captured for closures below

  /* ------------------------------- actions ------------------------------- */
  const patchIdentity = useCallback(
    (patch: (i: MyProfileSnapshot["identity"]) => MyProfileSnapshot["identity"]) => {
      setIdentityBlock((block) =>
        block?.status === "ready"
          ? { status: "ready", data: { ...block.data, identity: patch(block.data.identity) } }
          : block,
      );
    },
    [],
  );

  const currentIdentity = (): MyProfileSnapshot["identity"] =>
    identityRef?.identity ?? {
      displayName: "Bloom User",
      username: null,
      bio: null,
      avatarPath: null,
      accent: "violet" as BloomAccent,
      featured: null,
    };

  const saveIdentity = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) throw authRequired();
      await saveProfile(userId, patch);
      patchIdentity((identity) => ({
        ...identity,
        displayName: patch.displayName,
        username: patch.username,
        bio: patch.bio,
        accent: patch.accent as BloomAccent,
        featured: patch.featured,
      }));
    },
    [userId, patchIdentity],
  );

  const updateAccent = useCallback(
    async (accent: BloomAccent) => {
      if (!userId) throw authRequired();
      const identity = currentIdentity();
      await saveProfile(userId, { ...toPatch(identity), accent });
      patchIdentity((i) => ({ ...i, accent }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, patchIdentity],
  );

  const setFeatured = useCallback(
    async (featured: ProfilePatch["featured"]) => {
      if (!userId) throw authRequired();
      const identity = currentIdentity();
      await saveProfile(userId, { ...toPatch(identity), featured });
      patchIdentity((i) => ({ ...i, featured }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, patchIdentity],
  );

  const savePrivacySettings = useCallback(
    async (privacy: ProfilePrivacy) => {
      if (!userId) throw authRequired();
      await savePrivacy(userId, privacy);
      setIdentityBlock((block) =>
        block?.status === "ready" ? { status: "ready", data: { ...block.data, privacy } } : block,
      );
    },
    [userId],
  );

  const publishStory = useCallback(
    async (input: CreateStoryInput) => {
      if (!userId) throw authRequired();
      const story = await createStory(userId, input);
      setStoriesBlock((block) =>
        block && block.status === "ready"
          ? { status: "ready", data: [story, ...block.data] }
          : { status: "ready", data: [story] },
      );
      return story;
    },
    [userId],
  );

  const removeStory = useCallback(async (story: Story) => {
    await deleteStory(story);
    setStoriesBlock((block) =>
      block?.status === "ready"
        ? { status: "ready", data: block.data.filter((s) => s.id !== story.id) }
        : block,
    );
    return {
      undo: async () => {
        try {
          await restoreStory(story.id);
          setStoriesBlock((block) =>
            block?.status === "ready" ? { status: "ready", data: [story, ...block.data] } : block,
          );
        } catch (error) {
          report("profile:story-undo", error);
          throw new Error("Couldn't bring that back.");
        }
      },
    };
  }, []);

  const shareAgain = useCallback(
    async (story: Story) => {
      if (!userId) throw authRequired();
      const updated = await reshareStory(userId, story);
      setStoriesBlock((block) =>
        block?.status === "ready" ? { status: "ready", data: [updated, ...block.data] } : block,
      );
      return updated;
    },
    [userId],
  );

  const changeStoryVisibility = useCallback(async (id: string, visibility: StoryVisibility) => {
    await setStoryVisibility(id, visibility);
    setStoriesBlock((block) =>
      block?.status === "ready"
        ? {
            status: "ready",
            data: block.data.map((s) => (s.id === id ? { ...s, visibility } : s)),
          }
        : block,
    );
  }, []);

  const saveHighlight = useCallback(
    async (id: string | null, name: string, accent: BloomAccent, storyIds: string[]) => {
      if (!userId) throw authRequired();
      if (id) await updateHighlight(id, name, accent, storyIds);
      else await createHighlight(userId, name, accent, storyIds);
      setReloadKey((k) => k + 1);
    },
    [userId],
  );

  const removeHighlight = useCallback(async (id: string) => {
    await deleteHighlight(id);
    setHighlightsBlock((block) =>
      block?.status === "ready"
        ? { status: "ready", data: block.data.filter((h) => h.id !== id) }
        : block,
    );
  }, []);

  const commitAvatar = useCallback(
    async (blob: Blob) => {
      if (!userId) throw authRequired();
      // The object path is stable (uid/avatar.jpg), so uploading overwrites
      // cleanly — no orphaned files to sweep.
      const path = await uploadAvatar(userId, blob);
      patchIdentity((i) => ({ ...i, avatarPath: path }));
      await saveProfile(userId, { ...toPatch(currentIdentity()), avatarPath: path });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, patchIdentity],
  );

  const clearAvatar = useCallback(async () => {
    if (!userId) throw authRequired();
    patchIdentity((i) => ({ ...i, avatarPath: null }));
    await saveProfile(userId, { ...toPatch(currentIdentity()), avatarPath: null });
    await removeAvatar(currentIdentity().avatarPath ?? `${userId}/avatar.jpg`);
  }, [userId, patchIdentity]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
    });
    if (error) {
      report("profile:magic-link", error);
      return { ok: false, message: "We couldn't send that link right now. Try again soon." };
    }
    return { ok: true, message: "Check your inbox — a sign-in link is on its way." };
  }, []);

  return {
    authState,
    userId,
    identityBlock,
    identity,
    storiesBlock,
    storiesByAge,
    highlightsBlock,
    moodBlock,
    rewardsBlock,
    journey,
    refresh,
    actions: {
      refresh,
      saveIdentity,
      updateAccent,
      setFeatured,
      savePrivacySettings,
      publishStory,
      removeStory,
      shareAgain,
      changeStoryVisibility,
      saveHighlight,
      removeHighlight,
      commitAvatar,
      clearAvatar,
      signOut,
      sendMagicLink,
    },
  };
}

export function authRequired(): Error {
  return new Error("Sign in to save that.");
}

function toPatch(identity: {
  displayName: string;
  username: string | null;
  bio: string | null;
  accent: BloomAccent;
  featured: ProfilePatch["featured"];
}): ProfilePatch {
  return {
    displayName: identity.displayName,
    username: identity.username,
    bio: identity.bio,
    accent: identity.accent,
    featured: identity.featured,
  };
}

export type ProfileSpaceJourney =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      stats: ReturnType<typeof computeStats>;
      milestones: ReturnType<typeof computeMilestones>;
      activity: ReturnType<typeof computeActivity>;
      completeness: ReturnType<typeof computeCompleteness>;
    };

export type ProfileSpace = ReturnType<typeof useProfileSpace>;
