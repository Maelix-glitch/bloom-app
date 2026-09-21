/**
 * A tiny spring — the motion model behind Bloom's tutorial.
 *
 * The tour used to move with `setInterval(300ms)` + CSS transitions: the
 * highlight read the target four times a second and transitioned between the
 * readings, so it visibly stuttered behind the page, and a step change snapped
 * the highlight from one control to another instead of travelling between
 * them. Springs fix both, because a spring has no duration to mismatch — it
 * chases whatever the target is doing *right now*, whether that is a new step,
 * a smooth scroll, or a list re-rendering underneath it.
 *
 * Deliberately small and dependency-free: one integrator, no React, no
 * allocation per frame. The overlay owns a handful of these and writes their
 * values straight to `style`, so motion never triggers a re-render.
 */

export interface SpringConfig {
  /** Pull towards the target. Higher = snappier. */
  stiffness: number;
  /** Resistance. `damping / (2 * sqrt(stiffness))` is the damping ratio;
   *  ~0.85 reads as "Apple": fast, with the faintest overshoot. */
  damping: number;
  /** Below this distance *and* speed the spring counts as settled. */
  precision: number;
}

/*
 * Tuned by measurement, not by eye: for a 400px hop — about the distance
 * between two nav items — the highlight covers 99% of it in 233ms and is fully
 * at rest in 460ms. Fast enough to read as instant, slow enough to see where it
 * came from. Precision is a fifth of a pixel: nobody can see it, and chasing a
 * tighter one only lengthens the tail.
 */

/** The highlight and the card: quick, confident, no visible overshoot. */
export const SPRING_FOCUS: SpringConfig = { stiffness: 620, damping: 44, precision: 0.2 };

/** A touch lazier, so the leader line trails the card instead of fighting it. */
export const SPRING_SOFT: SpringConfig = { stiffness: 520, damping: 42, precision: 0.2 };

/**
 * Under `prefers-reduced-motion` springs are skipped entirely: every `set()`
 * lands instantly. The tour still works, it just doesn't travel.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

export class Spring {
  private value: number;
  private target: number;
  private velocity = 0;

  constructor(
    value = 0,
    private config: SpringConfig = SPRING_FOCUS,
  ) {
    this.value = value;
    this.target = value;
  }

  get(): number {
    return this.value;
  }

  getTarget(): number {
    return this.target;
  }

  /** Where the spring is heading. Motion happens in `step()`. */
  set(target: number): void {
    this.target = target;
  }

  /** Teleport — used while the page scrolls under a settled highlight, so it
   *  stays glued to the element instead of lagging behind it. */
  jump(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  /**
   * Advance the simulation. `dt` is clamped: a backgrounded tab returns with a
   * huge delta, and an unclamped spring explodes into a multi-second wobble.
   *
   * @returns true while the spring still has distance to cover.
   */
  step(dt: number): boolean {
    if (
      Math.abs(this.target - this.value) < this.config.precision &&
      Math.abs(this.velocity) < this.config.precision
    ) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    // Sub-step long frames so a 30fps display integrates like a 120fps one.
    const clamped = Math.min(Math.max(dt, 0), 0.064);
    const steps = clamped > 0.02 ? 4 : clamped > 0.012 ? 2 : 1;
    const h = clamped / steps;
    for (let i = 0; i < steps; i += 1) {
      // Recomputed per sub-step: one stale delta for all of them quietly halves
      // the stiffness and turns the spring into syrup.
      const remaining = this.target - this.value;
      const acceleration = this.config.stiffness * remaining - this.config.damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
    }
    return true;
  }

  /** True when it has arrived (nothing left to animate). */
  get settled(): boolean {
    return (
      Math.abs(this.target - this.value) < this.config.precision &&
      Math.abs(this.velocity) < this.config.precision
    );
  }
}

/** A rectangle of springs — the highlight's geometry, animated as one thing. */
export class SpringRect {
  readonly x: Spring;
  readonly y: Spring;
  readonly width: Spring;
  readonly height: Spring;
  readonly radius: Spring;

  constructor(config: SpringConfig = SPRING_FOCUS) {
    this.x = new Spring(0, config);
    this.y = new Spring(0, config);
    this.width = new Spring(0, config);
    this.height = new Spring(0, config);
    this.radius = new Spring(0, config);
  }

  set(rect: { x: number; y: number; width: number; height: number; radius: number }): void {
    this.x.set(rect.x);
    this.y.set(rect.y);
    this.width.set(rect.width);
    this.height.set(rect.height);
    this.radius.set(rect.radius);
  }

  jump(rect: { x: number; y: number; width: number; height: number; radius: number }): void {
    this.x.jump(rect.x);
    this.y.jump(rect.y);
    this.width.jump(rect.width);
    this.height.jump(rect.height);
    this.radius.jump(rect.radius);
  }

  /** Advance every axis; true while any of them is still travelling. */
  step(dt: number): boolean {
    // Evaluate all five before combining — `||` would short-circuit the rest.
    const moving = [
      this.x.step(dt),
      this.y.step(dt),
      this.width.step(dt),
      this.height.step(dt),
      this.radius.step(dt),
    ];
    return moving.some(Boolean);
  }

  get settled(): boolean {
    return (
      this.x.settled &&
      this.y.settled &&
      this.width.settled &&
      this.height.settled &&
      this.radius.settled
    );
  }
}
