// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The people-search sheet and its entry point, pinned at render:
 *
 *   · The Profile hero shows the magnifying glass only when a search
 *     handler is passed (signed-in pages), and clicking it asks to open.
 *   · Typing two or more characters calls the search service with the
 *     term and the searcher's id; one character never calls.
 *   · A verified result wears the blue tick; an unverified one does not.
 *   · Empty and failed searches say so honestly; a failure can be retried.
 *   · A row with a @username opens that profile; a row without one is
 *     informational only — rendered, but not a button.
 */

const h = vi.hoisted(() => ({
  search: vi.fn(),
}));

vi.mock("@/lib/profile/userSearchService", () => ({
  USER_SEARCH_MIN_TERM: 2,
  USER_SEARCH_LIMIT: 20,
  searchProfiles: h.search,
}));

/* The avatar's own machinery (storage URLs, preset art, frames) is not
   what this suite is about — a stand-in keeps the row honest. It renders
   no text: the row's name must stay the only text match for it. */
vi.mock("@/components/profile/ProfileAvatar", () => ({
  ProfileAvatar: ({ name }: { name: string }) => (
    <span data-testid="avatar" role="img" aria-label={`${name}'s profile mark`} />
  ),
}));

import { UserSearchSheet } from "./UserSearchSheet";
import { ProfileHero } from "./ProfileHero";
import type { UserSearchOutcome, UserSearchResult } from "@/lib/profile/userSearchService";

const IVY: UserSearchResult = {
  userId: "u-ivy",
  displayName: "Ivy Chen",
  username: "ivy",
  avatarPath: null,
  accent: "sage",
  verified: true,
};
const NOOR: UserSearchResult = {
  userId: "u-noor",
  displayName: "Noor",
  username: "noor",
  avatarPath: null,
  accent: "rose",
  verified: false,
};
const HANDLESS: UserSearchResult = {
  userId: "u-anon",
  displayName: "Quiet Gardener",
  username: null,
  avatarPath: null,
  accent: "violet",
  verified: false,
};

const ok = (results: UserSearchResult[]): UserSearchOutcome => ({ status: "ok", results });

/** jsdom ships no matchMedia, and BloomSheet/ProfileHero ask it for the form factor. */
function mockMatchMedia() {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
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
  mockMatchMedia();
  h.search.mockReset();
  h.search.mockResolvedValue(ok([]));
});

afterEach(() => cleanup());

function renderSheet(onOpenProfile = vi.fn()) {
  render(
    <UserSearchSheet
      open
      onClose={() => {}}
      currentUserId="me"
      onOpenProfile={onOpenProfile}
    />,
  );
  return { onOpenProfile };
}

async function typeTerm(term: string) {
  fireEvent.change(screen.getByLabelText("Search people by name or username"), {
    target: { value: term },
  });
}

describe("UserSearchSheet", () => {
  it("opens with an idle hint and does not search before two characters", async () => {
    renderSheet();
    expect(screen.getByText(/Type at least 2 letters/)).toBeTruthy();
    await typeTerm("i");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });
    expect(h.search).not.toHaveBeenCalled();
    expect(screen.getByText(/Type at least 2 letters/)).toBeTruthy();
  });

  it("searches with the term and the searcher's id, and renders the results", async () => {
    h.search.mockResolvedValue(ok([IVY, NOOR]));
    renderSheet();
    await typeTerm("iv");
    expect(await screen.findByText("Ivy Chen", undefined, { timeout: 3000 })).toBeTruthy();
    expect(h.search).toHaveBeenCalledWith("iv", "me");
    expect(screen.getByText("@ivy")).toBeTruthy();
    expect(screen.getByText("Noor")).toBeTruthy();
    expect(screen.getByText("@noor")).toBeTruthy();
  });

  it("wears the blue tick on the verified result only", async () => {
    h.search.mockResolvedValue(ok([IVY, NOOR]));
    renderSheet();
    await typeTerm("iv");
    await screen.findByText("Ivy Chen", undefined, { timeout: 3000 });
    expect(screen.getAllByTestId("verified-badge")).toHaveLength(1);
    expect(screen.getByLabelText("Verified account")).toBeTruthy();
  });

  it("says honestly when no one matches", async () => {
    h.search.mockResolvedValue(ok([]));
    renderSheet();
    await typeTerm("zzz");
    expect(await screen.findByText(/No one matches/, undefined, { timeout: 3000 })).toBeTruthy();
  });

  it("surfaces a failed search and retries it", async () => {
    h.search.mockResolvedValueOnce({ status: "error" }).mockResolvedValue(ok([IVY]));
    renderSheet();
    await typeTerm("ivy");
    expect(
      await screen.findByText(/Couldn’t search just now/, undefined, { timeout: 3000 }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Ivy Chen", undefined, { timeout: 3000 })).toBeTruthy();
    expect(h.search).toHaveBeenCalledTimes(2);
  });

  it("opens the profile of a row with a @username", async () => {
    h.search.mockResolvedValue(ok([IVY]));
    const { onOpenProfile } = renderSheet();
    await typeTerm("iv");
    await screen.findByText("Ivy Chen", undefined, { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "Open Ivy Chen's profile" }));
    expect(onOpenProfile).toHaveBeenCalledWith("ivy");
  });

  it("renders a row without a @username as information, not a tap", async () => {
    h.search.mockResolvedValue(ok([HANDLESS]));
    renderSheet();
    await typeTerm("qu");
    expect(await screen.findByText("Quiet Gardener", undefined, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Quiet Gardener/ })).toBeNull();
  });
});

describe("ProfileHero search entry", () => {
  const heroProps = {
    identity: {
      displayName: "Said Ali",
      username: "maelix",
      bio: null,
      avatarPath: null,
      bannerPath: null,
      accent: "violet" as const,
      featured: null,
    },
    story: { count: 0, unseen: 0, nextExpiry: null, animateIn: false },
    ambient: null,
    pulse: [],
    tags: [],
    memberSince: null,
    onEdit: () => {},
    onShare: () => {},
    onPreview: () => {},
    onOpenArchive: () => {},
    onOpenPrivacy: () => {},
    onSignOut: () => {},
    onOpenStory: () => {},
    onCreateStory: () => {},
    completion: { done: 0, total: 5, show: false },
  };

  it("shows the magnifying glass when search is offered, and fires on click", () => {
    const onSearchPeople = vi.fn();
    render(<ProfileHero {...heroProps} onSearchPeople={onSearchPeople} />);
    fireEvent.click(screen.getByRole("button", { name: "Search people" }));
    expect(onSearchPeople).toHaveBeenCalledTimes(1);
  });

  it("has no search button when no handler is passed", () => {
    render(<ProfileHero {...heroProps} />);
    expect(screen.queryByRole("button", { name: "Search people" })).toBeNull();
  });
});
