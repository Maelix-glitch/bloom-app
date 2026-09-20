// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The reverted-profile report, end to end at the hook level.
 *
 * In a device-only build (no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * every feature keeps its data on the device — and now the profile identity
 * does too. These tests walk the actual repro: open the Profile, save a
 * name/@username/bio, leave, come back — and assert the edits are still
 * there instead of snapping back to "Bloom User".
 */

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: false,
  supabaseConfigProblem: () => "This copy of Bloom has no database connection configured.",
  supabase: {},
  watchAuth: (onUser: (uid: string | null) => void) => {
    queueMicrotask(() => onUser(null));
    return () => {};
  },
}));

import { useProfileSpace } from "./useProfileSpace";
import { localIdentity } from "@/lib/profile/localIdentity";
import { ProfileSaveError } from "@/lib/profile/profileService";

beforeEach(() => {
  window.localStorage.clear();
});

const mountProfile = async () => {
  const view = renderHook(() => useProfileSpace());
  await waitFor(() => expect(view.result.current.authState).toBe("signed-out"));
  await waitFor(() => expect(view.result.current.identityBlock?.status).toBe("ready"));
  return view;
};

describe("useProfileSpace without a database", () => {
  it("keeps a saved name/@username/bio across a revisit", async () => {
    const first = await mountProfile();
    /* first visit: the empty default */
    expect(first.result.current.identity?.identity.displayName).toBe("Bloom User");
    expect(first.result.current.identity?.identity.username).toBeNull();

    await act(async () => {
      await first.result.current.actions.saveIdentity({
        displayName: "Ivy",
        username: "quiet-lavender",
        bio: "Slow mornings, strong tea.",
        accent: "sage",
        featured: null,
      });
    });
    expect(first.result.current.identity?.identity.displayName).toBe("Ivy");

    /* revisit = a fresh mount, exactly what closing and reopening the app does */
    first.unmount();
    const second = await mountProfile();
    expect(second.result.current.identity?.identity.displayName).toBe("Ivy");
    expect(second.result.current.identity?.identity.username).toBe("quiet-lavender");
    expect(second.result.current.identity?.identity.bio).toBe("Slow mornings, strong tea.");
    expect(second.result.current.identity?.identity.accent).toBe("sage");
    second.unmount();
  });

  it("persists a preset photo but refuses uploads with a plain-language error", async () => {
    const view = await mountProfile();

    await act(async () => {
      await view.result.current.actions.saveIdentity({
        displayName: "Ivy",
        username: null,
        bio: null,
        accent: "violet",
        featured: null,
        avatarPath: "preset:branch",
      });
    });
    expect(view.result.current.identity?.identity.avatarPath).toBe("preset:branch");

    await act(async () => {
      await expect(
        view.result.current.actions.commitAvatar(new Blob(["jpeg"], { type: "image/jpeg" })),
      ).rejects.toBeInstanceOf(ProfileSaveError);
    });

    view.unmount();
    const revisit = await mountProfile();
    expect(revisit.result.current.identity?.identity.avatarPath).toBe("preset:branch");
    revisit.unmount();
  });

  it("keeps an accent change across a revisit", async () => {
    const view = await mountProfile();
    await act(async () => {
      await view.result.current.actions.updateAccent("rose");
    });
    view.unmount();
    const revisit = await mountProfile();
    expect(revisit.result.current.identity?.identity.accent).toBe("rose");
    revisit.unmount();
  });

  it("writes through to the shared device store", async () => {
    const view = await mountProfile();
    await act(async () => {
      await view.result.current.actions.saveIdentity({
        displayName: "Ivy",
        username: "ivy",
        bio: null,
        accent: "sky",
        featured: null,
      });
    });
    expect(localIdentity.read()).toMatchObject({ displayName: "Ivy", username: "ivy" });
    view.unmount();
  });
});
