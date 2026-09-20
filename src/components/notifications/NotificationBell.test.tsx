// @vitest-environment jsdom
/**
 * The premium bell's contract:
 *   · quiet glass disc when everything is read — no badge, plain label;
 *   · a gold count pill while something waits (capped at 99+), announced;
 *   · a new arrival updates the live bell and replays the swing exactly once;
 *   · two bells on one page never share a gradient id.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import { NotificationBell } from "./NotificationCenter";
import { CENTER_CHANGED, recordNotice } from "@/lib/notifications/center";

afterEach(cleanup);

/** jsdom ships no matchMedia; the (closed) sheet inside the bell asks anyway. */
function mockMatchMedia(): void {
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
  window.localStorage.clear();
  mockMatchMedia();
});

function seedUnread(n: number, start = 0): void {
  for (let i = 0; i < n; i++) {
    recordNotice({
      key: `test-${start + i}`,
      kind: "habit",
      title: `Notice ${start + i}`,
      body: "Seeded for the bell suite.",
      url: "/",
    });
  }
}

function bellOf(container: HTMLElement): HTMLElement {
  const button = container.querySelector("button.bloom-bell");
  if (!(button instanceof HTMLElement)) throw new Error("no .bloom-bell button rendered");
  return button;
}

describe("NotificationBell", () => {
  it("is quiet when everything is read", () => {
    const { container } = render(<NotificationBell />);
    const button = bellOf(container);
    expect(button.getAttribute("aria-label")).toBe("Notifications");
    expect(button.dataset["unread"]).toBe("false");
    expect(container.querySelector(".bloom-bell__badge")).toBeNull();
  });

  it("shows the count while something waits", () => {
    seedUnread(3);
    const { container } = render(<NotificationBell />);
    const button = bellOf(container);
    expect(button.getAttribute("aria-label")).toBe("Notifications, 3 unread");
    expect(button.dataset["unread"]).toBe("true");
    expect(container.querySelector(".bloom-bell__badge")?.textContent).toBe("3");
  });

  it("caps a huge count at 99+", () => {
    seedUnread(150);
    const { container } = render(<NotificationBell />);
    expect(container.querySelector(".bloom-bell__badge")?.textContent).toBe("99+");
  });

  it("updates live when a notice arrives", () => {
    const { container } = render(<NotificationBell />);
    expect(container.querySelector(".bloom-bell__badge")).toBeNull();
    act(() => {
      seedUnread(2);
      window.dispatchEvent(new Event(CENTER_CHANGED));
    });
    expect(container.querySelector(".bloom-bell__badge")?.textContent).toBe("2");
    expect(bellOf(container).getAttribute("aria-label")).toBe("Notifications, 2 unread");
  });

  it("rings the swing when an arrival lands on a quiet bell", () => {
    const { container } = render(<NotificationBell />);
    const before = container.querySelector(".bloom-bell__swing");
    expect(before?.getAttribute("data-ring")).toBe("false");
    act(() => {
      seedUnread(1);
      window.dispatchEvent(new Event(CENTER_CHANGED));
    });
    const after = container.querySelector(".bloom-bell__swing");
    expect(after?.getAttribute("data-ring")).toBe("true");
    // the swing remounts (a fresh node) so the CSS ring replays from frame one
    expect(after).not.toBe(before);
  });

  it("gives every bell its own dome gradient", () => {
    const { container } = render(
      <>
        <NotificationBell />
        <NotificationBell />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getAllByRole("button", { name: "Notifications" })).toHaveLength(2);
  });
});
