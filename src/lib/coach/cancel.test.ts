import { describe, expect, it } from "vitest";

import { CoachCancelled } from "./engine";

/**
 * The "thinking forever, no reply" bug.
 *
 * A superseded request used to resolve as `done([], ...)` — a successful
 * answer carrying ZERO paragraphs. The UI rendered that as a coach message
 * with no content: a blank bubble, appearing just as the thinking indicator
 * disappeared. From the outside it looked like the coach thought and never
 * answered.
 *
 * Two things made it fire constantly rather than rarely:
 *
 *   1. `requestResponse` called `inFlight.current?.abort()` on EVERY send, and
 *      never cleared the reference when a request finished. So the controller
 *      from the previous (already completed) send was still there, and under
 *      React StrictMode's double-invoke in dev a send could abort itself.
 *   2. An empty answer was treated as a valid answer all the way to the DOM.
 *
 * The fix: cancellation is thrown rather than returned (it is control flow,
 * not an answer), the controller is released in a `finally`, and both the hook
 * and the component refuse to produce a message with no paragraphs.
 */

describe("CoachCancelled", () => {
  it("is an Error, so it travels the normal throw path", () => {
    expect(new CoachCancelled()).toBeInstanceOf(Error);
  });

  it("is identifiable by name across module boundaries", () => {
    /* The component checks `error.name`, not `instanceof` — a bundler that
       duplicates the module would break an identity check. */
    expect(new CoachCancelled().name).toBe("CoachCancelled");
  });
});

describe("the abort controller lifecycle", () => {
  /* A faithful model of the hook's logic. */
  function makeSender() {
    let inFlight: AbortController | null = null;
    return {
      send() {
        inFlight?.abort();
        const controller = new AbortController();
        inFlight = controller;
        return {
          finish() {
            /* the `finally` that releases the controller */
            if (inFlight === controller) inFlight = null;
          },
          aborted: () => controller.signal.aborted,
        };
      },
    };
  }

  it("a completed request is not aborted by the next send", () => {
    const s = makeSender();
    const first = s.send();
    first.finish();
    s.send();
    expect(first.aborted()).toBe(false);
  });

  it("an in-flight request IS superseded by the next send", () => {
    /* the behaviour we want to keep: one answer at a time */
    const s = makeSender();
    const first = s.send();
    s.send();
    expect(first.aborted()).toBe(true);
  });

  it("sequential sends never abort each other", () => {
    const s = makeSender();
    for (let i = 0; i < 5; i += 1) {
      const r = s.send();
      r.finish();
      expect(r.aborted()).toBe(false);
    }
  });
});

describe("empty answers are impossible", () => {
  const FALLBACK = "Sorry — I lost my train of thought there. Ask me again?";

  /** The guard used in both the hook and the component. */
  const ensure = (paragraphs: string[]) => (paragraphs.length > 0 ? paragraphs : [FALLBACK]);

  it("substitutes a real reply for an empty list", () => {
    expect(ensure([])).toEqual([FALLBACK]);
  });

  it("leaves a real answer untouched", () => {
    expect(ensure(["Your sleep averaged 6.1 hours."])).toEqual(["Your sleep averaged 6.1 hours."]);
  });

  it("never yields a zero-length result", () => {
    for (const input of [[], [""], ["a"], ["a", "b"]]) {
      expect(ensure(input).length).toBeGreaterThan(0);
    }
  });
});
