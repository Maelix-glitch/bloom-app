// @vitest-environment jsdom
/**
 * Sign-out confirmation (M-234) — the Sessions rows are real sign-out
 * entry points, so they are pinned end to end here:
 *   · tapping a sign-out row opens the confirmation sheet and does NOT
 *     call sign-out;
 *   · Cancel and a backdrop tap both leave the session untouched;
 *   · the sheet's explicit "Sign out" is the only thing that signs out,
 *     exactly once, with the row's own scope.
 *
 * Sign-in is a magic link, so an accidental sign-out costs a trip to the
 * inbox — that is the whole reason the gate exists.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const { signOut } = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { email: "maelix67@gmail.com", created_at: "2026-01-01T00:00:00.000Z" },
          },
        },
      }),
      signOut,
    },
  },
  watchAuth: () => () => {},
}));

import { SessionsSection } from "./SessionsSection";

afterEach(cleanup);

/** jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(false);
  signOut.mockClear();
  window.localStorage.clear();
});

function renderSection() {
  return render(<SessionsSection isSignedIn onOpenErase={() => {}} />);
}

describe("SessionsSection sign-out confirmation (M-234)", () => {
  it("opens the confirmation without signing out when the row is tapped", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Sign out on this device/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Sign out?");
    expect(dialog.textContent).toContain("You'll need a fresh sign-in link to get back in.");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("Cancel leaves the session untouched", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Sign out on this device/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("a backdrop tap leaves the session untouched", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Sign out on this device/ }));
    await screen.findByRole("dialog");
    const backdrop = document.querySelector(".bsheet-backdrop");
    expect(backdrop).toBeTruthy();
    fireEvent.pointerDown(backdrop as Element);
    fireEvent.pointerUp(backdrop as Element);
    fireEvent.click(backdrop as Element);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("confirming signs out exactly once, with the local scope", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Sign out on this device/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("the every-device row confirms with its own copy, then signs out globally once", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Sign out on every device/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(
      "You'll need a fresh sign-in link to get back in. This signs you out on every device.",
    );
    expect(signOut).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
  });
});
