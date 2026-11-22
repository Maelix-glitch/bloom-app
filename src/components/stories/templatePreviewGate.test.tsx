// @vitest-environment jsdom
/**
 * Premium Stories templates (M-214): the preview of a premium
 * design stays open to everyone, but below Premium Plus its Use
 * button names the tier instead of pretending to pick — and the
 * browser's pick wrapper (not under test here) routes that tap to
 * the paywall. A basic template never carries the lock.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const entitlementState = vi.hoisted(() => ({
  current: { kind: "unavailable" } as { kind: string; entitlement?: Record<string, unknown> },
}));
vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entitlementState.current,
}));

import { TemplatePreview } from "./TemplateBrowser";
import { templateById } from "@/lib/stories/templates";
import { EMPTY_BLOOM_DATA } from "@/lib/stories/types";

beforeAll(() => {
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  entitlementState.current = { kind: "unavailable" };
});

const readyWith = (tier: string) => ({
  kind: "ready",
  entitlement: {
    tier,
    status: "active",
    currentPeriodEnd: null,
    creditBalance: 300,
    monthlyAllowance: 300,
    periodStart: null,
  },
});

function renderPreview(id: string) {
  const def = templateById(id);
  if (!def) throw new Error(`no template ${id}`);
  return render(
    <TemplatePreview
      def={def}
      data={EMPTY_BLOOM_DATA}
      favorite={false}
      onToggleFavorite={() => {}}
      onUse={() => {}}
      onClose={() => {}}
    />,
  );
}

describe("TemplatePreview — premium template lock (M-214)", () => {
  it("a premium design below Plus names the tier on its Use button", () => {
    entitlementState.current = readyWith("premium");
    renderPreview("progress-poster");
    expect(screen.getByRole("button", { name: "Part of Premium Plus" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Use this template" })).toBeNull();
  });

  it("the same design on Plus offers the pick plainly", () => {
    entitlementState.current = readyWith("premium_plus");
    renderPreview("progress-poster");
    expect(screen.getByRole("button", { name: "Use this template" })).toBeTruthy();
  });

  it("a basic design never locks, whatever the tier", () => {
    entitlementState.current = readyWith("free");
    renderPreview("reflection-one-line");
    expect(screen.getByRole("button", { name: "Use this template" })).toBeTruthy();
  });
});
