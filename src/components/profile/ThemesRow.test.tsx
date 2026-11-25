// @vitest-environment jsdom
/**
 * Themes in Settings (M-241): the Appearance group's Themes row.
 *
 * The owner found there was no way to change themes from Settings:
 * the twelve founded themes lived only behind Rewards, then the
 * Atelier, and Settings offered only the accent colour. These tests
 * pin the fix at the component Settings renders:
 *   · the row names the equipped theme, read live from the same
 *     rewards store the Atelier reads, and reads "Bloom default"
 *     when nothing is equipped;
 *   · opening the row shows the themes sheet with all twelve themes;
 *   · equipping inside the sheet goes through the store (so the skin
 *     republishes app-wide) and the row's name follows without a
 *     reload.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { CATALOG } from "@/lib/rewards/catalog";
import { loadRewardsStore, setEquipped } from "@/lib/rewards/store";
import { resetPrefCache } from "@/lib/prefsStore";
import { ThemesRow } from "./AccountRow";

afterEach(cleanup);

/** jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(false);
  window.localStorage.clear();
  resetPrefCache();
});

const THEMES = CATALOG.components.filter((c) => c.kind === "theme");

function row(): HTMLElement {
  return screen.getByTestId("pf-row-theme");
}

function card(id: string): HTMLElement {
  const el = document.querySelector(`[data-theme-card="${id}"]`);
  if (!el) throw new Error(`no card for ${id}`);
  return el as HTMLElement;
}

describe("M-241 · Themes row in Settings", () => {
  it("names the honest default when no theme is equipped", () => {
    render(<ThemesRow />);
    expect(within(row()).getByText("Theme")).toBeTruthy();
    expect(within(row()).getByText("Bloom default")).toBeTruthy();
  });

  it("names the equipped theme, read from the rewards store", () => {
    const theme = THEMES[0];
    if (!theme) throw new Error("catalogue has no themes");
    setEquipped({ themeId: theme.id });
    render(<ThemesRow />);
    expect(within(row()).getByText(theme.title)).toBeTruthy();
  });

  it("opens the themes sheet with all twelve themes", () => {
    render(<ThemesRow />);
    fireEvent.click(row());
    expect(document.querySelectorAll("[data-theme-card]")).toHaveLength(12);
    for (const theme of THEMES) {
      expect(within(card(theme.id)).getByText(theme.title)).toBeTruthy();
    }
  });

  it("equipping in the sheet updates the store and the row name follows", () => {
    const first = THEMES[0];
    const second = THEMES[1];
    if (!first || !second) throw new Error("catalogue has fewer than two themes");
    setEquipped({ themeId: first.id });
    render(<ThemesRow />);
    expect(within(row()).getByText(first.title)).toBeTruthy();

    fireEvent.click(row());
    fireEvent.click(within(card(second.id)).getByText("Use this look"));

    expect(loadRewardsStore().equipped.themeId).toBe(second.id);
    expect(within(row()).getByText(second.title)).toBeTruthy();
    expect(card(second.id).dataset["equipped"]).toBe("true");
    expect(card(first.id).dataset["equipped"]).toBe("false");
  });
});
