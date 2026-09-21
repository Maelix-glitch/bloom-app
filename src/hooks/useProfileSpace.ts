/**
 * useProfileSpace — the Profile page's data orchestrator.
 * Local to the Profile route (no global store): session → identity →
 * stories → highlights → journey. Every block loads independently and can
 * fail quietly without taking the rest of the page down.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase, hasSupabaseConfig, supabaseConfigProblem, watchAuth } from "@/lib/supabase";
import { moodStorage } from "@/lib/mood/storage";
import type { MoodEntry } from "@/lib/mood/types";
import { report } from "@/lib/profile/errors";
import { classifyError, type ProfileProblem } from "@/lib/profile/problems";
import { clearSnapshot, readSnapshot, writeSnapshot } from "@/lib/profile/identityCache";
import {
  loadMyProfile,
  ProfileLoadError,
  ProfileSaveError,
  removeAvatar,
  removeBanner,
  savePrivacy,
  saveProfile,
  uploadAvatar,
  uploadBanner,
  type MyProfileSnapshot,
  type ProfilePatch,
} from "@/lib/profile/profileService";
import { localIdentity } from "@/lib/profile/localIdentity";
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
import { announceProfileChanged } from "@/hooks/useRailIdentity";
import {
  isStoryActive,
  type BloomAccent,
  type HighlightIcon,
  type HighlightItem,
  type ProfilePrivacy,
  type Story,
  type StoryVisibility,
} from "@/lib/profile/types";

export type AuthState = "checking" | "signed-out" | "signed-in";

type Block<T> =
  { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string };

const GENTLE = "Couldn't load that just now.";

/**
 * Quiet retries for an identity read that failed for a reason that repairs
 * itself (no network yet, a session mid-refresh). Short enough that nobody
 * waits on them, long enough that a real blip has cleared.
 */
const RETRY_DELAYS = [700, 2_400];

const FALLBACK_IDENTITY_FOR_JOURNEY = {
  displayName: "Bloom User",
  username: null,
  bio: null,
  avatarPath: null,
  bannerPath: null,
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

  /* What went wrong with the identity read, once retries are exhausted. */
  const [profileProblem, setProfileProblem] = useState<ProfileProblem | null>(null);
  /** True while the identity on screen is this device's copy, not a fresh read. */
  const [identityStale, setIdentityStale] = useState(false);
  /** True while a read is in flight — the hero's quiet "syncing" dot. */
  const [identitySyncing, setIdentitySyncing] = useState(false);
  /** Bumped to ask for another identity read without reloading the rest. */
  const [identityNonce, setIdentityNonce] = useState(0);

  /* Refs so the recovery listeners below never re-subscribe on a state change. */
  const problemRef = useRef<ProfileProblem | null>(null);
  const syncingRef = useRef(false);
  useEffect(() => {
    problemRef.current = profileProblem;
    syncingRef.current = identitySyncing;
  }, [profileProblem, identitySyncing]);

  const retryIdentity = useCallback(() => setIdentityNonce((n) => n + 1), []);

  /* ------------------------------- session ------------------------------- */
  useEffect(() => {
    let mounted = true;

    if (!hasSupabaseConfig) {
      setUserId(null);
      setAuthState("signed-out");
      return;
    }

    const stop = watchAuth((uid) => {
      if (!mounted) return;
      setUserId(uid);
      setAuthState(uid ? "signed-in" : "signed-out");
    });

    return () => {
      mounted = false;
      stop();
    };
  }, []);

  /* --------------------------- the identity read --------------------------- */
  /*
   * Stale-while-revalidate, with a floor under it.
   *
   * This used to be: set `loading`, await the network, and on any failure set
   * `error` — so a tracker with a perfectly good profile saw an empty room
   * whenever the read hiccuped. A laptop waking from sleep, an access token
   * that expired overnight, a project missing one identity column: all of them
   * produced the same dead end, "Your profile couldn't be read just now", with
   * nothing on the page and no way to tell what would fix it.
   *
   * Now:
   *   1. the last good snapshot for this account paints immediately, before a
   *      single request goes out, so the page is never an empty room;
   *   2. the read runs behind it and replaces it when it lands;
   *   3. failures that fix themselves (offline, a stale session) are retried
   *      twice, quietly, before anyone is told anything;
   *   4. if it still fails, the page keeps the real copy from this device and
   *      says why, with a way to try again — the full-screen "couldn't load"
   *      card only appears when there is genuinely nothing to show.
   */
  useEffect(() => {
    if (authState === "signed-out") {
      // No account connected. With a configured project this is the preview:
      // the full Profile renders against a real empty state — never invented
      // data. Without a project (a device-only build) the identity comes from
      // this device — the same local-first rule mood, trackers and habits
      // already follow — so a saved name/@username/bio survives revisits
      // instead of snapping back to "Bloom User".
      const local = hasSupabaseConfig ? null : localIdentity.read();
      setIdentityBlock({
        status: "ready",
        data: {
          identity: {
            displayName: local?.displayName ?? "Bloom User",
            username: local?.username ?? null,
            bio: local?.bio ?? null,
            avatarPath: local?.avatarPath ?? null,
            bannerPath: null,
            accent: local?.accent ?? "violet",
            featured: null,
          },
          privacy: { profileVisibility: "private", storyVisibility: "private" },
          memberSince: null,
          email: null,
        },
      });
      setProfileProblem(null);
      setIdentityStale(false);
      setIdentitySyncing(false);
      return undefined;
    }
    if (authState !== "signed-in" || !userId) return undefined;

    let alive = true;
    const timers: number[] = [];
    const cached = readSnapshot(userId);

    /* 1. Paint what this device already knows, straight away. */
    if (cached) {
      setIdentityBlock({ status: "ready", data: cached });
      setIdentityStale(true);
    } else {
      setIdentityBlock((block) => (block?.status === "ready" ? block : { status: "loading" }));
      setIdentityStale(false);
    }
    setProfileProblem(null);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    /* Something real to show while the cloud is unreachable: the last good
       read for this account, or an identity this device remembers. Both are
       the person's own data — never invented defaults. */
    const bridge = (): MyProfileSnapshot | null => {
      const last = readSnapshot(userId);
      if (last) return last;
      const local = localIdentity.read();
      if (local && (local.username || local.avatarPath || local.displayName !== "Bloom User")) {
        return {
          identity: {
            displayName: local.displayName,
            username: local.username,
            bio: local.bio,
            avatarPath: local.avatarPath,
            bannerPath: null,
            accent: local.accent,
            featured: null,
          },
          privacy: { profileVisibility: "private", storyVisibility: "private" },
          memberSince: null,
          email: null,
        };
      }
      return null;
    };

    const run = async (attempt: number): Promise<void> => {
      if (!alive) return;
      setIdentitySyncing(true);
      try {
        const snapshot = await loadMyProfile(userId);
        if (!alive) return;
        writeSnapshot(userId, snapshot);
        setIdentityBlock({ status: "ready", data: snapshot });
        setProfileProblem(null);
        setIdentityStale(false);
        setIdentitySyncing(false);
        return;
      } catch (error) {
        if (!alive) return;
        const problem = error instanceof ProfileLoadError ? error.problem : classifyError(error);
        report("profile:identity", error);

        /* 3. Quiet retries for the kinds that repair themselves. */
        const delay = problem.retryable ? RETRY_DELAYS[attempt] : undefined;
        if (delay !== undefined) {
          await wait(delay);
          if (!alive) return;
          await run(attempt + 1);
          return;
        }

        /* 4. Out of attempts: keep the page alive on the device's copy. */
        setIdentitySyncing(false);
        setProfileProblem(problem);
        const fallback = bridge();
        if (fallback) {
          setIdentityBlock({ status: "ready", data: fallback });
          setIdentityStale(true);
        } else {
          setIdentityBlock({ status: "error", message: problem.message });
        }
      }
    };

    void run(0);

    return () => {
      alive = false;
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [authState, userId, reloadKey, identityNonce]);

  /*
   * Come back on its own. The retries above cover a momentary blip; these cover
   * the long ones — the train entering a tunnel, a laptop closing for the
   * night. Nothing fires unless the last read actually failed, so a healthy
   * profile is never re-requested for switching tabs.
   */
  useEffect(() => {
    if (authState !== "signed-in" || !userId) return undefined;
    const recover = () => {
      if (problemRef.current && !syncingRef.current) setIdentityNonce((n) => n + 1);
    };
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) recover();
    };
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authState, userId]);

  /* -------------------- the rest of the space, in parallel ------------------ */
  useEffect(() => {
    if (authState === "signed-out") {
      setStoriesBlock({ status: "ready", data: [] });
      setHighlightsBlock({ status: "ready", data: [] });
      setMoodBlock({ status: "ready", data: [] });
      setRewardsBlock({ status: "ready", data: [] });
      return;
    }
    if (authState !== "signed-in" || !userId) return;
    let alive = true;

    setStoriesBlock({ status: "loading" });
    setHighlightsBlock({ status: "loading" });
    setMoodBlock({ status: "loading" });
    setRewardsBlock({ status: "loading" });

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
      bannerPath: null,
      accent: "violet" as BloomAccent,
      featured: null,
    };

  const saveIdentity = useCallback(
    async (patch: ProfilePatch) => {
      if (!hasSupabaseConfig) {
        /* Device-only build: identity saves on this device (see localIdentity). */
        const saved = localIdentity.write({
          displayName: patch.displayName,
          username: patch.username,
          bio: patch.bio,
          accent: patch.accent as BloomAccent,
          ...(patch.avatarPath !== undefined ? { avatarPath: patch.avatarPath } : {}),
        });
        patchIdentity((identity) => ({
          ...identity,
          displayName: saved.displayName,
          username: saved.username,
          bio: saved.bio,
          accent: saved.accent,
          avatarPath: saved.avatarPath,
          featured: patch.featured,
        }));
        return;
      }
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
      announceProfileChanged();
    },
    [userId, patchIdentity],
  );

  const updateAccent = useCallback(
    async (accent: BloomAccent) => {
      if (!hasSupabaseConfig) {
        const saved = localIdentity.write({ accent });
        patchIdentity((i) => ({ ...i, accent: saved.accent }));
        return;
      }
      if (!userId) throw authRequired();
      const identity = currentIdentity();
      await saveProfile(userId, { ...toPatch(identity), accent });
      patchIdentity((i) => ({ ...i, accent }));
      announceProfileChanged();
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
    async (
      id: string | null,
      name: string,
      accent: BloomAccent,
      storyIds: string[],
      icon: HighlightIcon | null = null,
    ) => {
      if (!userId) throw authRequired();
      if (id) await updateHighlight(id, name, accent, storyIds, icon);
      else await createHighlight(userId, name, accent, storyIds, icon);
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
      if (!hasSupabaseConfig) {
        // Uploads need cloud storage, which needs an account. The bundled
        // `preset:` photographs save on-device through saveIdentity instead —
        // say so plainly rather than failing with a raw connection error.
        throw new ProfileSaveError(
          "Uploading a photo needs an account. One of Bloom's own pictures saves on this device.",
        );
      }
      if (!userId) throw authRequired();
      // The object path is stable (uid/avatar.jpg), so uploading overwrites
      // cleanly — no orphaned files to sweep.
      const path = await uploadAvatar(userId, blob);
      patchIdentity((i) => ({ ...i, avatarPath: path }));
      await saveProfile(userId, { ...toPatch(currentIdentity()), avatarPath: path });
      announceProfileChanged();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, patchIdentity],
  );

  const clearAvatar = useCallback(async () => {
    if (!hasSupabaseConfig) {
      const saved = localIdentity.write({ avatarPath: null });
      patchIdentity((i) => ({ ...i, avatarPath: saved.avatarPath }));
      return;
    }
    if (!userId) throw authRequired();
    patchIdentity((i) => ({ ...i, avatarPath: null }));
    await saveProfile(userId, { ...toPatch(currentIdentity()), avatarPath: null });
    await removeAvatar(currentIdentity().avatarPath ?? `${userId}/avatar.jpg`);
    announceProfileChanged();
  }, [userId, patchIdentity]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitBanner = useCallback(
    async (blob: Blob) => {
      if (!userId) throw authRequired();
      const path = await uploadBanner(userId, blob);
      patchIdentity((i) => ({ ...i, bannerPath: path }));
      await saveProfile(userId, { ...toPatch(currentIdentity()), bannerPath: path });
      announceProfileChanged();
    },
    [userId, patchIdentity],
  );

  const clearBanner = useCallback(async () => {
    if (!userId) throw authRequired();
    patchIdentity((i) => ({ ...i, bannerPath: null }));
    await saveProfile(userId, { ...toPatch(currentIdentity()), bannerPath: null });
    await removeBanner(currentIdentity().bannerPath ?? `${userId}/banner.jpg`);
    announceProfileChanged();
  }, [userId, patchIdentity]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    /* Drop this account's cached snapshot: the next person on this device
       should never see the last person's name while a read is in flight. */
    clearSnapshot(userId);
    await supabase.auth.signOut();
  }, [userId]);

  const sendMagicLink = useCallback(async (email: string) => {
    /*
     * Guarded, and everything inside a try.
     *
     * Without the guard this hit the throwing Supabase proxy when no project
     * is configured. The throw rejected the promise, the caller had no
     * try/catch, so its `setState` never ran and the button sat on "sending"
     * forever — the "magic link isn't sending" report, with no error shown.
     *
     * Now an unconfigured build says so plainly instead of hanging.
     */
    if (!hasSupabaseConfig) {
      return {
        ok: false,
        message:
          supabaseConfigProblem() ??
          "This copy of Bloom has no account system connected, so there's no link to send.",
      };
    }
    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
      });
      if (error) {
        report("profile:magic-link", error);
        /*
         * Supabase's own wording is more useful than a generic apology here:
         * rate limits and an unconfirmed SMTP setup are the two usual causes
         * and they need different fixes.
         */
        const detail = /rate|limit|too many/i.test(error.message)
          ? "Too many requests just now — wait a minute and try again."
          : /smtp|email|sender|provider/i.test(error.message)
            ? "The project's email sending isn't set up yet, so no link could go out."
            : error.message;
        return { ok: false, message: detail };
      }
      return { ok: true, message: "Check your inbox — a sign-in link is on its way." };
    } catch (e) {
      report("profile:magic-link", e);
      return {
        ok: false,
        message:
          e instanceof Error && /not connected/i.test(e.message)
            ? "Bloom isn't connected to a database here, so there's no account to sign in to."
            : "We couldn't reach the sign-in service. Check your connection and try again.",
      };
    }
  }, []);

  return {
    authState,
    userId,
    identityBlock,
    identity,
    /** Why the identity read failed, or null when it didn't. */
    profileProblem,
    /** The identity on screen is a device copy, not a fresh read. */
    identityStale,
    /** A read is in flight behind what's on screen. */
    identitySyncing,
    retryIdentity,
    storiesBlock,
    storiesByAge,
    highlightsBlock,
    moodBlock,
    rewardsBlock,
    journey,
    refresh,
    actions: {
      refresh,
      retryIdentity,
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
