// @vitest-environment jsdom
/**
 * M-251: the Nutrition tab opens only after the Assessment is
 * completed (owner directive 2026-11-26). The gate lives in the
 * route (src/routes/nutrition.index.tsx); this test drives the REAL
 * route component against the real prefs document:
 *  · no assessment at all        -> the locked invitation;
 *  · an assessment only started  -> the locked invitation;
 *  · a completed assessment      -> the Nutrition page itself,
 *    including a completed assessment stored before the country
 *    question existed (no country key — the common case for every
 *    existing user).
 * The locked state is the house invitation: one headline, one line,
 * one gold action into the Assessment on the Profile page.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({
    to,
    hash,
    children,
    ...rest
  }: {
    to: string;
    hash?: string;
    children: React.ReactNode;
  }) => (
    <a href={hash ? `${to}#${hash}` : to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ userId: "user-1", ready: true }),
}));

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  type AssessmentState,
} from "@/lib/assessment/state";
import { Route } from "@/routes/nutrition.index";

const Gate = (Route as unknown as { component: React.ComponentType }).component;

afterEach(cleanup);

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

function seedState(status: AssessmentState["status"], answers = EMPTY_ANSWERS): void {
  const state: AssessmentState = {
    version: 1,
    status,
    step: "summary",
    answers,
    consents: [],
    startedAt: "2026-11-10T03:00:00.000Z",
    completedAt: status === "complete" ? "2026-11-10T03:05:00.000Z" : null,
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
}

describe("the Nutrition gate (M-251)", () => {
  it("no assessment: the locked invitation, with the one gold door into the Assessment", () => {
    render(<Gate />);
    expect(screen.getByText("Nutrition opens after your Assessment")).toBeTruthy();
    const door = screen.getByRole("link", { name: "Start your Assessment" });
    expect(door.getAttribute("href")).toBe("/profile#pf-assessment");
    expect(screen.queryByText(/What you eat/)).toBeNull();
  });

  it("an assessment only started: still locked", () => {
    seedState("in_progress");
    render(<Gate />);
    expect(screen.getByText("Nutrition opens after your Assessment")).toBeTruthy();
    expect(screen.queryByText(/What you eat/)).toBeNull();
  });

  it("a completed assessment opens the page — including one stored before the country question existed", () => {
    /* EMPTY_ANSWERS carries country: null exactly as a pre-M-251
       stored assessment parses: completed is completed, and the
       absence of a country answer must not re-lock the tab. */
    seedState("complete");
    render(<Gate />);
    expect(screen.queryByText("Nutrition opens after your Assessment")).toBeNull();
    expect(screen.getByText(/What you eat/)).toBeTruthy();
  });
});
