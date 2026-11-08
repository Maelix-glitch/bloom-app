import { describe, expect, it } from "vitest";

import {
  HABIT_IMAGE_MAX_ATTEMPTS,
  habitImageFailed,
  initialHabitImageState,
  nextHabitImageState,
  type HabitImageState,
} from "./habitImage";

const SRC = "data:image/png;base64,iVBORw0KGgo=";

describe("habit image load state", () => {
  it("starts pending when a photo exists, settled when there is none", () => {
    expect(initialHabitImageState(SRC)).toEqual({ src: SRC, attempt: 1, phase: "pending" });
    expect(initialHabitImageState(null).phase).toBe("ready");
    expect(habitImageFailed(initialHabitImageState(SRC))).toBe(false);
  });

  it("a load settles the tile as ready", () => {
    const s = nextHabitImageState(initialHabitImageState(SRC), { type: "load" });
    expect(s.phase).toBe("ready");
    expect(habitImageFailed(s)).toBe(false);
  });

  it("a transient error retries instead of falling back", () => {
    let s = initialHabitImageState(SRC);
    s = nextHabitImageState(s, { type: "error" });
    expect(s).toEqual({ src: SRC, attempt: 2, phase: "pending" });
    expect(habitImageFailed(s)).toBe(false);
    /* …and the retry can still succeed. */
    s = nextHabitImageState(s, { type: "load" });
    expect(s.phase).toBe("ready");
  });

  it("only the final attempt's error is terminal", () => {
    let s: HabitImageState = initialHabitImageState(SRC);
    for (let i = 0; i < HABIT_IMAGE_MAX_ATTEMPTS - 1; i += 1) {
      s = nextHabitImageState(s, { type: "error" });
      expect(habitImageFailed(s)).toBe(false);
    }
    s = nextHabitImageState(s, { type: "error" });
    expect(s.phase).toBe("failed");
    expect(habitImageFailed(s)).toBe(true);
    /* Further events cannot resurrect or re-fail a settled tile. */
    expect(nextHabitImageState(s, { type: "error" })).toBe(s);
    expect(nextHabitImageState(s, { type: "load" })).toBe(s);
  });

  it("a new URL restarts the state from attempt one", () => {
    const failed = nextHabitImageState(
      { src: "data:old", attempt: HABIT_IMAGE_MAX_ATTEMPTS, phase: "pending" },
      { type: "error" },
    );
    expect(failed.phase).toBe("failed");
    const fresh = nextHabitImageState(failed, { type: "src", src: SRC });
    expect(fresh).toEqual({ src: SRC, attempt: 1, phase: "pending" });
    /* The same URL is not a change. */
    expect(nextHabitImageState(fresh, { type: "src", src: SRC })).toBe(fresh);
  });
});
