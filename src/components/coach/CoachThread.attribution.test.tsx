// @vitest-environment jsdom
/**
 * M-205 (F-13) — the Coach thread's quiet rhythm.
 *
 * The audit found the identical "From your record — …" caption and the
 * Copy/thumbs row repeated under all 18 replies. The pins: attribution
 * stands once per conversation day (on the day's first reply), and the
 * action row stays visible only on the latest reply (older replies
 * reveal theirs on hover/focus, per coach.css).
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

afterEach(cleanup);

import type { CoachMessage } from "@/hooks/useCoachSystem";
import { CoachThread } from "./CoachThread";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = () =>
      ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  /* jsdom has no layout scrolling; the thread's stick-to-bottom calls
     element.scrollTo inside a rAF and would throw unhandled. */
  if (typeof Element.prototype.scrollTo !== "function") {
    Element.prototype.scrollTo = () => {};
  }
});

const coach = (id: string, time: string, text: string): CoachMessage => ({
  id,
  role: "coach",
  time,
  paragraphs: [text],
  sources: ["live-data"],
  blocks: [],
  status: "sent",
});

const noop = () => {};

function thread(messages: CoachMessage[]) {
  return render(
    <CoachThread
      conversationKey="test"
      loading={false}
      messages={messages}
      previews={{}}
      freshId={null}
      thinking={false}
      responseSlow={false}
      showWelcome={false}
      starters={[]}
      onStart={noop}
      onRetry={noop}
      onOfflineAnswer={noop}
      onRegenerate={noop}
      onTellMeMore={noop}
      onMakePlan={noop}
      onBlockAction={noop}
    />,
  );
}

describe("CoachThread attribution rhythm (M-205, F-13)", () => {
  it("shows the attribution once per day, not once per reply", () => {
    const { container } = thread([
      coach("a", "2026-11-20T09:00:00", "First reply of the day."),
      coach("b", "2026-11-20T10:00:00", "Second reply, same day."),
      coach("c", "2026-11-21T09:00:00", "Next day's first reply."),
    ]);
    const lines = [...container.querySelectorAll(".coach-msg-sources-text")];
    expect(lines.length).toBe(2);
    expect(lines[0]?.textContent).toContain("From your record");
  });

  it("keeps the action row visible only on the latest reply", () => {
    const { container } = thread([
      coach("a", "2026-11-20T09:00:00", "An older reply."),
      coach("b", "2026-11-20T10:00:00", "The latest reply."),
    ]);
    const rows = [...container.querySelectorAll(".coach-actions")];
    expect(rows.length).toBe(2);
    expect(rows[0]?.className).not.toContain("is-forced");
    expect(rows[1]?.className).toContain("is-forced");
  });
});
