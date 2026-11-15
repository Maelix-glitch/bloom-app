import { describe, expect, it } from "vitest";

import { verificationStatus } from "./verification";

/**
 * The tick is a claim, so the criteria behind it are pinned combination by
 * combination: it appears only when BOTH the email is confirmed and the
 * basic profile (real name + @username) is complete — never for less.
 */

describe("verificationStatus", () => {
  it("verifies when the email is confirmed and name + handle are set", () => {
    /* The owner's own account shape: confirmed email, display name and
       username all present — this case must yield verified. */
    const status = verificationStatus({
      emailConfirmed: true,
      displayName: "Said Ali",
      username: "maelix",
    });
    expect(status.verified).toBe(true);
    expect(status.remaining).toBe(0);
    expect(status.steps.every((s) => s.done)).toBe(true);
  });

  it("does not verify on an unconfirmed email, however complete the profile", () => {
    const status = verificationStatus({
      emailConfirmed: false,
      displayName: "Ivy",
      username: "ivy",
    });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(1);
    expect(status.steps.find((s) => s.id === "email")?.done).toBe(false);
    expect(status.steps.find((s) => s.id === "profile")?.done).toBe(true);
  });

  it("does not verify when the display name is missing", () => {
    for (const displayName of [null, undefined, "", "   "]) {
      const status = verificationStatus({
        emailConfirmed: true,
        displayName,
        username: "ivy",
      });
      expect(status.verified).toBe(false);
      expect(status.steps.find((s) => s.id === "profile")?.done).toBe(false);
    }
  });

  it("does not count the placeholder name as a name", () => {
    /* A profile row that was never saved reads back as "Bloom User" — that
       is the absence of a name, not a name. */
    const status = verificationStatus({
      emailConfirmed: true,
      displayName: "Bloom User",
      username: "ivy",
    });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(1);
  });

  it("does not verify when the handle is missing", () => {
    for (const username of [null, undefined, "", "   "]) {
      const status = verificationStatus({
        emailConfirmed: true,
        displayName: "Ivy",
        username,
      });
      expect(status.verified).toBe(false);
      expect(status.steps.find((s) => s.id === "profile")?.done).toBe(false);
    }
  });

  it("counts both steps remaining when nothing is done", () => {
    const status = verificationStatus({
      emailConfirmed: false,
      displayName: null,
      username: null,
    });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(2);
    expect(status.steps.map((s) => s.done)).toEqual([false, false]);
  });

  it("gives each unfinished step honest guidance", () => {
    const status = verificationStatus({
      emailConfirmed: false,
      displayName: null,
      username: null,
    });
    for (const step of status.steps) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.guidance.length).toBeGreaterThan(0);
    }
    expect(status.steps.find((s) => s.id === "email")?.guidance).toContain("sign-in link");
    expect(status.steps.find((s) => s.id === "profile")?.guidance).toContain("Edit profile");
  });
});
