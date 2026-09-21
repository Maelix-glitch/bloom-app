// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The Profile's waiting states.
 *
 * The contract worth pinning: while a read is in flight the person sees the
 * *shape of their page* (not a spinner, not a blank panel), a failed read that
 * still has a copy on this device produces a note the page survives, and the
 * note says the reason in words a person can act on.
 */

import {
  ProfileLoadingScreen,
  ProfileProblemNotice,
  ProfileSwap,
  ProfileUnavailable,
} from "./ProfileLoading";
import { classifyError } from "@/lib/profile/problems";

afterEach(cleanup);

describe("ProfileLoadingScreen", () => {
  it("announces itself as a status, and says nothing alarming", () => {
    render(<ProfileLoadingScreen />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toBe("Loading your profile");
    expect(status.textContent).toContain("Loading your profile");
    expect(status.textContent).not.toMatch(/error|failed|couldn't/i);
  });

  it("holds the shape of the page it stands in for", () => {
    const { container } = render(<ProfileLoadingScreen />);
    /* cover, avatar, head, the four numbers and the record grid */
    expect(container.querySelector(".pf-load-cover")).toBeTruthy();
    expect(container.querySelector(".pf-load-avatar")).toBeTruthy();
    expect(container.querySelector(".pf-head")).toBeTruthy();
    expect(container.querySelectorAll(".pf-load-tile")).toHaveLength(4);
    expect(container.querySelectorAll(".pf-load-cell")).toHaveLength(12 * 7);
  });
});

describe("ProfileSwap", () => {
  it("shows the skeleton while loading and the page when it is not", () => {
    const { container, rerender } = render(
      <ProfileSwap loading>
        <div data-testid="page">the profile</div>
      </ProfileSwap>,
    );
    expect(container.querySelector(".pf-load")).toBeTruthy();
    expect(screen.queryByTestId("page")).toBeNull();

    rerender(
      <ProfileSwap loading={false}>
        <div data-testid="page">the profile</div>
      </ProfileSwap>,
    );
    expect(screen.getByTestId("page")).toBeTruthy();
  });

  it("keeps both panes in one grid cell, so the swap cannot shift the layout", () => {
    const { container } = render(
      <ProfileSwap loading>
        <div>page</div>
      </ProfileSwap>,
    );
    expect(container.querySelector(".pf-swap")).toBeTruthy();
  });
});

describe("ProfileProblemNotice", () => {
  const offline = classifyError(new TypeError("Failed to fetch"));

  it("says what is on screen and why, and offers one way out", () => {
    const onRetry = vi.fn();
    render(<ProfileProblemNotice problem={offline} syncing={false} onRetry={onRetry} />);

    expect(screen.getByText(/Showing the copy on this device/i)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("You're offline");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not offer a retry while one is already running", () => {
    render(<ProfileProblemNotice problem={offline} syncing onRetry={() => {}} />);
    const retry = screen.getByRole("button", { name: /try again/i }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    expect(screen.getByText(/Trying again/i)).toBeTruthy();
  });

  it("can be dismissed — the page underneath still works", () => {
    render(<ProfileProblemNotice problem={offline} syncing={false} onRetry={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("ProfileUnavailable", () => {
  it("names the cause for a project that was never migrated", () => {
    const schema = classifyError({ code: "42P01", message: 'relation "profiles" does not exist' });
    render(<ProfileUnavailable problem={schema} syncing={false} onRetry={() => {}} />);
    expect(screen.getByText(/isn't here yet/i)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/missing part of its profile table/i);
  });

  it("still works with no diagnosis at all", () => {
    render(<ProfileUnavailable problem={null} syncing={false} onRetry={() => {}} />);
    expect(screen.getByRole("status").textContent).toMatch(/couldn't reach your profile/i);
  });
});
