// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "The profile isn't loading."
 *
 * The report came with one console line — `[bloom:profile:identity] Your
 * profile couldn't be read just now.` — and a page that showed an empty panel
 * with a Try again button. Any failure did that: a laptop waking from sleep on
 * a stale token, a train entering a tunnel, a Supabase project that ran the
 * core migration but not the identity one. The person's own profile was sitting
 * in the database the whole time; the page just refused to render anything
 * while a single request was unhappy.
 *
 * These pin the three behaviours that replaced it: paint the copy this device
 * already has, retry on its own the failures that fix themselves, and say what
 * went wrong in a sentence that matches the cause.
 */

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabaseConfigProblem: () => null,
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { email: "ivy@bloom.app" } } }),
      signOut: async () => ({ error: null }),
      refreshSession: async () => ({ data: { session: {} }, error: null }),
    },
    from: (table: string) => {
      throw new Error(`${table} is not part of this test`);
    },
    rpc: async () => ({ data: [], error: null }),
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
  watchAuth: (onUser: (uid: string | null) => void) => {
    queueMicrotask(() => onUser("u1"));
    return () => {};
  },
}));

vi.mock("@/lib/profile/storyService", () => ({
  listMyStories: async () => [],
  listMyHighlights: async () => [],
}));

vi.mock("@/lib/mood/storage", () => ({
  moodStorage: { all: async () => [] },
}));

vi.mock("@/lib/profile/profileService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile/profileService")>();
  return { ...actual, loadMyProfile: vi.fn() };
});

import { useProfileSpace } from "./useProfileSpace";
import { writeSnapshot, clearSnapshot } from "@/lib/profile/identityCache";
import { classifyError } from "@/lib/profile/problems";
import {
  loadMyProfile,
  ProfileLoadError,
  type MyProfileSnapshot,
} from "@/lib/profile/profileService";

const mockedLoad = vi.mocked(loadMyProfile);

const SCHEMA_ERROR = new ProfileLoadError(
  classifyError({ code: "42P01", message: 'relation "public.profiles" does not exist' }),
);
const OFFLINE_ERROR = new ProfileLoadError(classifyError(new TypeError("Failed to fetch")));

const CACHED: MyProfileSnapshot = {
  identity: {
    displayName: "Ivy",
    username: "ivy",
    bio: "Slow mornings.",
    avatarPath: "u1/avatar.jpg",
    bannerPath: null,
    accent: "sage",
    featured: null,
  },
  privacy: { profileVisibility: "private", storyVisibility: "private" },
  memberSince: "2026-01-05T00:00:00Z",
  email: "ivy@bloom.app",
};

const FRESH: MyProfileSnapshot = {
  ...CACHED,
  identity: { ...CACHED.identity, displayName: "Ivy Okafor", bio: "Updated abroad." },
};

beforeEach(() => {
  window.localStorage.clear();
  clearSnapshot();
  mockedLoad.mockReset();
});

const mount = () => renderHook(() => useProfileSpace());

describe("useProfileSpace when the cloud read fails", () => {
  it("shows the copy this device already has instead of an empty room", async () => {
    writeSnapshot("u1", CACHED);
    mockedLoad.mockRejectedValue(SCHEMA_ERROR);

    const view = mount();
    await waitFor(() => expect(view.result.current.identityBlock?.status).toBe("ready"));

    expect(view.result.current.identity?.identity.displayName).toBe("Ivy");
    expect(view.result.current.identityStale).toBe(true);
    expect(view.result.current.profileProblem?.kind).toBe("schema");
    /* The page renders, so the problem is a note — not a state. */
    expect(view.result.current.identityBlock?.status).not.toBe("error");
    view.unmount();
  });

  it("retries on its own when the failure is the kind that repairs itself", async () => {
    writeSnapshot("u1", CACHED);
    mockedLoad.mockRejectedValueOnce(OFFLINE_ERROR).mockResolvedValueOnce(FRESH);

    const view = mount();
    await waitFor(() => expect(view.result.current.identityBlock?.status).toBe("ready"));
    /* The cached name first — the person is never looking at a skeleton. */
    expect(view.result.current.identity?.identity.displayName).toBe("Ivy");

    await waitFor(
      () => expect(view.result.current.identity?.identity.displayName).toBe("Ivy Okafor"),
      { timeout: 4_000 },
    );
    expect(view.result.current.profileProblem).toBeNull();
    expect(view.result.current.identityStale).toBe(false);
    expect(mockedLoad).toHaveBeenCalledTimes(2);
    view.unmount();
  }, 12_000);

  it("only falls back to the full-screen failure when there is nothing to show", async () => {
    mockedLoad.mockRejectedValue(SCHEMA_ERROR);

    const view = mount();
    await waitFor(() => expect(view.result.current.identityBlock?.status).toBe("error"));

    const block = view.result.current.identityBlock;
    expect(block?.status === "error" && block.message).toMatch(/profile table/i);
    expect(view.result.current.identity).toBeNull();
    view.unmount();
  });

  it("keeps a successful read for the next visit", async () => {
    mockedLoad.mockResolvedValue(FRESH);

    const view = mount();
    await waitFor(() => expect(view.result.current.identityBlock?.status).toBe("ready"));
    view.unmount();

    /* Second visit: the load fails, but the page still knows who you are. */
    mockedLoad.mockReset().mockRejectedValue(SCHEMA_ERROR);
    const revisit = mount();
    await waitFor(() => expect(revisit.result.current.identityBlock?.status).toBe("ready"));
    expect(revisit.result.current.identity?.identity.displayName).toBe("Ivy Okafor");
    revisit.unmount();
  });

  it("asks for another read without reloading the rest of the page", async () => {
    mockedLoad.mockRejectedValue(SCHEMA_ERROR);

    const view = mount();
    await waitFor(() => expect(view.result.current.profileProblem).not.toBeNull());
    expect(mockedLoad).toHaveBeenCalledTimes(1);

    mockedLoad.mockResolvedValue(FRESH);
    view.result.current.retryIdentity();
    await waitFor(() => expect(view.result.current.profileProblem).toBeNull());
    expect(view.result.current.identity?.identity.displayName).toBe("Ivy Okafor");
    /* The retry is the identity's own: stories and the rest were not touched. */
    expect(mockedLoad).toHaveBeenCalledTimes(2);
    view.unmount();
  });
});
