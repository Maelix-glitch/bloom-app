// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

/**
 * The cold-boot "Sign in" flash. The rail identity starts "checking" and
 * may only turn signed-out on a "no user" auth answer once a person has
 * been established — because the auth client's first answer on a cold
 * load can be a transient null for a signed-in user (session recovery in
 * @supabase/auth-js emits INITIAL_SESSION with a null session when it
 * errors or races the refresh, and watchAuth forwards that answer).
 * Publishing signed-out on it painted "Sign in" in the sidebar for a
 * frame before the real session landed. `nullAnswerEndsSession` is the
 * rule that holds the neutral state instead.
 */

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabaseConfigProblem: () => null,
  supabase: {},
  watchAuth: () => () => {},
}));

import {
  nullAnswerEndsSession,
  type RailIdentity,
} from "./useRailIdentity";

const checking: RailIdentity = {
  status: "checking",
  displayName: null,
  avatarPath: null,
  accent: "violet",
  bio: null,
};

const signedIn: RailIdentity = {
  status: "signed-in",
  displayName: "Maelix",
  avatarPath: null,
  accent: "violet",
  bio: null,
};

const signedOut: RailIdentity = { ...checking, status: "signed-out" };

describe("nullAnswerEndsSession", () => {
  it("holds the neutral state before anyone is established", () => {
    /* Nothing cached yet, or still resolving: a null answer is not proof
       of signed-out, so the rail keeps its checking mark. */
    expect(nullAnswerEndsSession(null)).toBe(false);
    expect(nullAnswerEndsSession(checking)).toBe(false);
  });

  it("treats a null answer after establishment as a real sign-out", () => {
    expect(nullAnswerEndsSession(signedIn)).toBe(true);
  });

  it("stays settled once signed out", () => {
    expect(nullAnswerEndsSession(signedOut)).toBe(false);
  });
});
