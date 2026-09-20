// @vitest-environment jsdom
/**
 * The Notification Center sheet's contract:
 *   · a real header (art hero, title, waiting line, close button);
 *   · due rows with times, insight rows with provenance, tappable history
 *     grouped by day with unread dots;
 *   · honest empty states when there's nothing;
 *   · closing (not opening) marks everything read;
 *   · Clear empties the history.
 *
 * Reminders, cycle intelligence and routing are mocked — this suite pins the
 * sheet's own behavior, not the engines behind it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import type { Reminder } from "@/lib/reminders/schedule";
import { NotificationCenter } from "./NotificationCenter";
import { listNotices } from "@/lib/notifications/center";

const { mockPreview } = vi.hoisted(() => ({ mockPreview: { items: [] as Reminder[] } }));
const { mockCycle } = vi.hoisted(() => ({
  mockCycle: { value: { loading: true } as Record<string, unknown> },
}));

vi.mock("@/hooks/useReminders", () => ({ useReminders: () => ({ preview: mockPreview.items }) }));
vi.mock("@/hooks/useCycleSystem", () => ({ useCycleSystem: () => mockCycle.value }));
vi.mock("@/lib/cycle/intelligence", () => ({
  buildPersonalInsight: () => ({
    id: "p1",
    text: "Your cycle is settling into its rhythm.",
    why: "Read from your last three cycles.",
  }),
  buildObservations: () => [{ id: "o1", text: "Logging stays steadier mid-week." }],
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
  }) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

afterEach(cleanup);

/** jsdom ships no matchMedia; the sheet asks whether this is a phone. */
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
  mockPreview.items = [];
  mockCycle.value = { loading: true };
});

const STORE_KEY = "bloom.notifications.v1";

function seedHistory(
  items: { at: Date; kind?: Reminder["kind"] | "insight" | "system"; read?: boolean }[],
): void {
  window.localStorage.setItem(
    STORE_KEY,
    JSON.stringify(
      items.map((s, i) => ({
        id: `h-${i}`,
        at: s.at.toISOString(),
        kind: s.kind ?? "habit",
        title: `Notice ${i + 1}`,
        body: "A seeded line of history.",
        url: "/",
        read: s.read ?? false,
      })),
    ),
  );
}

function noonDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Sections carry counts in their headings — select by label id, exactly. The
 * sheet portals to document.body, so the render container can't see them.
 */
function sectionById(id: string): HTMLElement {
  const section = document.querySelector(`section[aria-labelledby="${id}"]`);
  if (!(section instanceof HTMLElement)) throw new Error(`missing section ${id}`);
  return section;
}

describe("NotificationCenter", () => {
  it("shows the hero with the waiting line", () => {
    seedHistory([{ at: new Date() }, { at: new Date() }]);
    render(<NotificationCenter open onClose={() => {}} />);
    // the visible hero title (Radix also renders an sr-only twin for AT)
    expect(document.querySelector("h2.ncenter-title")?.textContent).toBe("Notifications");
    // the narrow notification-column panel, not the wide default card
    expect(document.querySelector(".bsheet.ncenter-sheet")).not.toBeNull();
    expect(screen.getByText("2 waiting for you.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Close notifications" })).toBeDefined();
  });

  it("says so when all is caught up", () => {
    render(<NotificationCenter open onClose={() => {}} />);
    expect(screen.getByText("All caught up.")).toBeDefined();
  });

  it("marks everything read on close — not before", () => {
    seedHistory([{ at: new Date() }, { at: new Date() }]);
    const onClose = vi.fn();
    render(<NotificationCenter open onClose={onClose} />);
    // still unread while reading: the rows wear their dots
    expect(document.querySelectorAll('[data-unread="true"]').length).toBeGreaterThan(0);
    expect(listNotices().every((n) => !n.read)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(listNotices().every((n) => n.read)).toBe(true);
  });

  it("lists due reminders with their times", () => {
    mockPreview.items = [
      {
        key: "r1",
        kind: "habit",
        title: "Morning pages",
        body: "Three lines.",
        at: "08:00",
        url: "/",
      },
      {
        key: "r2",
        kind: "evening",
        title: "Wind down",
        body: "Screens off.",
        at: "18:30",
        url: "/",
      },
    ];
    const onClose = vi.fn();
    render(<NotificationCenter open onClose={onClose} />);
    const section = sectionById("nc-due");
    expect(within(section).getByText("Morning pages")).toBeDefined();
    expect(within(section).getByText("8:00 AM")).toBeDefined();
    expect(within(section).getByText("6:30 PM")).toBeDefined();
    fireEvent.click(within(section).getByText("Wind down"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("lists insights with their provenance", () => {
    mockCycle.value = { loading: false, model: {}, context: {}, entries: [] };
    render(<NotificationCenter open onClose={() => {}} />);
    const section = sectionById("nc-insights");
    expect(within(section).getByText("Your cycle is settling into its rhythm.")).toBeDefined();
    expect(within(section).getByText("Read from your last three cycles.")).toBeDefined();
    expect(within(section).getByText("Logging stays steadier mid-week.")).toBeDefined();
  });

  it("groups history by day, newest first", () => {
    const three = noonDaysAgo(3);
    seedHistory([{ at: new Date() }, { at: noonDaysAgo(1) }, { at: three }]);
    render(<NotificationCenter open onClose={() => {}} />);
    const section = sectionById("nc-history");
    const days = [...section.querySelectorAll(".ncenter-day")].map((el) => el.textContent);
    expect(days).toEqual([
      "Today",
      "Yesterday",
      new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(three),
    ]);
    // newest first
    const titles = within(section)
      .getAllByText(/Notice \d/)
      .map((el) => el.textContent);
    expect(titles).toEqual(["Notice 1", "Notice 2", "Notice 3"]);
  });

  it("is honest when there's nothing anywhere", () => {
    render(<NotificationCenter open onClose={() => {}} />);
    expect(screen.getByText("Nothing due")).toBeDefined();
    expect(screen.getByText("No insights yet")).toBeDefined();
    expect(screen.getByText("Quiet so far")).toBeDefined();
  });

  it("clears the history", () => {
    seedHistory([{ at: new Date() }]);
    render(<NotificationCenter open onClose={() => {}} />);
    expect(screen.queryByText("Quiet so far")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText("Quiet so far")).toBeDefined();
  });
});
