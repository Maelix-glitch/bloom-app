import { describe, expect, it } from "vitest";

import { Spring, SpringRect, SPRING_FOCUS } from "./spring";

/**
 * The spring is the tour's motion model, so its contract matters more than its
 * feel: it has to arrive, it has to arrive quickly, and it must not explode when
 * a backgrounded tab hands it a four-second frame.
 */
describe("Spring", () => {
  it("travels to its target and settles", () => {
    const spring = new Spring(0, SPRING_FOCUS);
    spring.set(400);
    let frames = 0;
    while (spring.step(1 / 120) && frames < 600) frames += 1;
    expect(spring.settled).toBe(true);
    expect(spring.get()).toBeCloseTo(400, 0);
    /* Measured: 99% of a 400px hop in ~235ms, at rest inside half a second.
       Any slower and the tour reads as lag rather than as motion. */
    expect(frames / 120).toBeLessThan(0.55);
  });

  it("never overshoots by more than a whisker", () => {
    const spring = new Spring(0, SPRING_FOCUS);
    spring.set(300);
    let peak = 0;
    for (let i = 0; i < 240; i += 1) {
      spring.step(1 / 120);
      peak = Math.max(peak, spring.get());
    }
    expect(peak).toBeLessThan(300 * 1.06);
  });

  it("jumps straight to a value when the page is scrolling under it", () => {
    const spring = new Spring(0, SPRING_FOCUS);
    spring.jump(250);
    expect(spring.get()).toBe(250);
    expect(spring.settled).toBe(true);
  });

  it("survives a huge frame delta without exploding", () => {
    const spring = new Spring(0, SPRING_FOCUS);
    spring.set(200);
    spring.step(4); // a tab that was hidden for four seconds
    expect(Number.isFinite(spring.get())).toBe(true);
    expect(Math.abs(spring.get())).toBeLessThan(1_000);
  });

  it("chases a moving target without a snap", () => {
    const spring = new Spring(0, SPRING_FOCUS);
    let previous = 0;
    for (let i = 0; i < 120; i += 1) {
      spring.set(i * 4); // a scroll
      spring.step(1 / 60);
      const step = Math.abs(spring.get() - previous);
      expect(step).toBeLessThan(40); // never teleports mid-flight
      previous = spring.get();
    }
  });
});

describe("SpringRect", () => {
  it("moves every axis and reports when any of them is still travelling", () => {
    const rect = new SpringRect(SPRING_FOCUS);
    rect.jump({ x: 0, y: 0, width: 10, height: 10, radius: 4 });
    rect.set({ x: 100, y: 50, width: 200, height: 60, radius: 12 });
    expect(rect.settled).toBe(false);
    expect(rect.step(1 / 60)).toBe(true);
    let frames = 0;
    while (rect.step(1 / 120) && frames < 600) frames += 1;
    expect(rect.settled).toBe(true);
    expect(rect.x.get()).toBeCloseTo(100, 1);
    expect(rect.radius.get()).toBeCloseTo(12, 1);
  });
});
