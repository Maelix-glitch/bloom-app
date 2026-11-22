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

/**
 * M-207 (F-13, the live shape): the resumed conversation the audit
 * re-checked is the imported cloud thread — ONE conversation whose rows
 * span 24–30 Aug 2026, each turn's user/coach rows sharing the exact
 * stored timestamp, sources ["live-data"] throughout and one turn
 * carrying ["Last 7 days", "Last 30 days", "Mood record"]. Live, the
 * caption stood at 12:40 AM, 6:00 PM and 8:55 PM — the first reply of
 * three DIFFERENT local days, indistinguishable because the thread
 * showed no date anywhere. The pins: the attribution still stands at
 * most once per local day on that day's first reply (in whatever
 * timezone the reader is in), the variant caption appears once, and a
 * day divider opens each local day so the rhythm is visible as days,
 * not as a metronome.
 */
describe("CoachThread — the resumed multi-day thread (M-207, F-13 live shape)", () => {
  const turn = (
    id: string,
    time: string,
    reply: string,
    sources: string[],
  ): CoachMessage[] => [
    {
      id: `${id}-u`,
      role: "user",
      time,
      paragraphs: [`Question ${id}.`],
      sources: [],
      blocks: [],
      status: "sent",
    },
    {
      id: `${id}-c`,
      role: "coach",
      time,
      paragraphs: [reply],
      sources,
      blocks: [],
      status: "sent",
    },
  ];

  const liveThread = () =>
    thread([
      ...turn("t1", "2026-08-23T19:10:25.117Z", "Reply one.", ["live-data"]),
      ...turn("t2", "2026-08-23T19:11:07.373Z", "Reply two.", ["live-data"]),
      ...turn("t3", "2026-08-24T04:18:16.346Z", "Reply three.", ["live-data"]),
      ...turn("t4", "2026-08-24T11:14:32.213Z", "Reply four.", ["live-data"]),
      ...turn("t5", "2026-08-26T12:30:42.621Z", "Reply five.", ["live-data"]),
      ...turn("t6", "2026-08-28T15:25:35.702Z", "Reply six.", ["live-data"]),
      ...turn("t7", "2026-08-30T15:27:28.798Z", "Reply seven.", [
        "Last 7 days",
        "Last 30 days",
        "Mood record",
      ]),
      ...turn("t8", "2026-08-30T15:27:36.371Z", "Reply eight.", [
        "Last 7 days",
        "Last 30 days",
        "Mood record",
      ]),
    ]);

  const articleWith = (container: HTMLElement, text: string) =>
    [...container.querySelectorAll("article.coach-msg-bloom")].find((a) =>
      a.textContent?.includes(text),
    );

  it("stands the attribution once per local day, on the day's first reply", () => {
    const { container } = liveThread();
    const dividers = [...container.querySelectorAll(".coach-day-divider")];
    const captions = [...container.querySelectorAll(".coach-msg-sources-text")];
    /* The fixture spans four local days in IST, five in UTC — the
       counts must agree with each other in either. */
    expect(dividers.length).toBeGreaterThanOrEqual(4);
    expect(captions.length).toBe(dividers.length);
    /* Every day-first caption but the last is the live-data one; the
       variant stands exactly once, on its own day's first reply. */
    for (const caption of captions.slice(0, -1)) {
      expect(caption.textContent).toContain("From your record — live-data");
    }
    expect(captions[captions.length - 1]?.textContent).toContain(
      "From your record — Last 7 days · Last 30 days · Mood record",
    );
    /* Same-day followers carry no caption: reply two shares reply
       one's local day in both IST and UTC, reply eight shares seven's. */
    expect(articleWith(container, "Reply one.")?.querySelector(".coach-msg-sources-text")).not.toBeNull();
    expect(articleWith(container, "Reply two.")?.querySelector(".coach-msg-sources-text")).toBeNull();
    expect(articleWith(container, "Reply eight.")?.querySelector(".coach-msg-sources-text")).toBeNull();
    /* The latest reply keeps its always-visible action row. */
    const latest = articleWith(container, "Reply eight.");
    expect(latest?.querySelector(".coach-actions")?.className).toContain("is-forced");
  });

  it("names each day with a divider, starting with the thread's first day", () => {
    const { container } = liveThread();
    const dividers = [...container.querySelectorAll(".coach-day-divider")];
    expect(dividers[0]?.textContent).toContain("Aug");
    /* A divider precedes the first message of its day: the first
       divider is the thread list's first element. */
    const list = container.querySelector(".coach-thread-list");
    expect(list?.firstElementChild?.className).toContain("coach-day-divider");
  });
});
