// @vitest-environment jsdom
/**
 * The Themes gallery (M-238) — the Atelier's dedicated presentation for
 * the twelve founded themes.
 *
 * The twelve themes are free for every user (owner decision,
 * 2026-11-24). These tests pin that model alongside the presentation:
 *   · every catalogue theme renders as a card with its overview artwork,
 *     its name, its world line and its palette swatches;
 *   · no price is rendered anywhere for a theme: no points line, no buy
 *     step, no rank lock;
 *   · the only states are Equipped (marked on the active theme) and
 *     Free, and the equip action is available without points and fires
 *     with the theme, unchanged;
 *   · opening a card shows the detail sheet with all three artworks and
 *     the full palette, values included, and the same free state.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { CATALOG } from "@/lib/rewards/catalog";
import type { ComponentDef } from "@/lib/rewards/types";
import { ThemesGallery, isThemeEquipped } from "./ThemesGallery";

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

beforeEach(() => mockMatchMedia(false));

const THEMES = CATALOG.components.filter((c) => c.kind === "theme");

function renderGallery(
  overrides: Partial<{
    equippedThemeId: string | undefined;
    onEquip: (theme: ComponentDef) => void;
  }> = {},
) {
  const onEquip = overrides.onEquip ?? vi.fn();
  const utils = render(
    <ThemesGallery
      themes={THEMES}
      equippedThemeId={overrides.equippedThemeId}
      onEquip={onEquip}
    />,
  );
  return { ...utils, onEquip };
}

function card(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector(`[data-theme-card="${id}"]`);
  if (!el) throw new Error(`no card for ${id}`);
  return el as HTMLElement;
}

describe("M-238 · Themes gallery", () => {
  it("renders all twelve themes with artwork, name, world and swatches", () => {
    const { container } = renderGallery();
    const cards = container.querySelectorAll("[data-theme-card]");
    expect(cards).toHaveLength(12);
    for (const theme of THEMES) {
      const el = card(container, theme.id);
      expect(within(el).getByText(theme.title)).toBeTruthy();
      expect(within(el).getByText(theme.intent)).toBeTruthy();
      const img = el.querySelector(".thg-art img");
      expect(img, theme.id).toBeTruthy();
      expect(img?.getAttribute("src"), theme.id).toBeTruthy();
      expect(el.querySelectorAll(".thg-swatch"), theme.id).toHaveLength(6);
    }
  });

  it("the twelve themes are free in the catalogue and no price renders", () => {
    for (const theme of THEMES) {
      expect(theme.points, theme.id).toBe(0);
    }
    const { container } = renderGallery();
    expect(container.textContent).not.toContain("850");
    expect(container.textContent).not.toMatch(/\d+ points/);
    expect(container.textContent).not.toContain("Opens at rank");
    for (const theme of THEMES) {
      const el = card(container, theme.id);
      expect(within(el).getByText("Free"), theme.id).toBeTruthy();
      expect(
        within(el).getByRole("button", { name: "Use this look" }),
        theme.id,
      ).toBeTruthy();
    }
  });

  it("marks the equipped theme and keeps equip available on the rest", () => {
    const { container } = renderGallery({ equippedThemeId: "th-honey-hour" });

    const equipped = card(container, "th-honey-hour");
    expect(equipped.getAttribute("data-equipped")).toBe("true");
    expect(within(equipped).getByText("Equipped")).toBeTruthy();
    expect(within(equipped).queryByText("Free")).toBeNull();
    expect(within(equipped).queryByRole("button", { name: "Use this look" })).toBeNull();

    const other = card(container, "th-ember");
    expect(other.getAttribute("data-equipped")).toBe("false");
    expect(within(other).getByText("Free")).toBeTruthy();
    expect(within(other).getByRole("button", { name: "Use this look" })).toBeTruthy();
  });

  it("fires the existing equip action with the theme", () => {
    const { container, onEquip } = renderGallery();
    const ember = card(container, "th-ember");
    fireEvent.click(within(ember).getByRole("button", { name: "Use this look" }));
    expect(onEquip).toHaveBeenCalledTimes(1);
    expect((onEquip as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.id).toBe("th-ember");
  });

  it("opens the detail sheet with three artworks, the palette and the free state", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "View Velvet Night" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Today · hero artwork")).toBeTruthy();
    expect(within(dialog).getByText("Rail · sidebar artwork")).toBeTruthy();
    expect(within(dialog).getByText("Mood · hero artwork")).toBeTruthy();
    expect(dialog.querySelectorAll(".thg-figure img")).toHaveLength(3);
    expect(within(dialog).getByText("oklch(0.155 0.007 85)")).toBeTruthy();
    expect(within(dialog).getByText("oklch(0.82 0.09 85)")).toBeTruthy();
    expect(within(dialog).getByText("Free")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Use this look" })).toBeTruthy();
    expect(dialog.textContent).not.toMatch(/\d+ points/);
  });

  it("isThemeEquipped reads only the equipped id", () => {
    const ember = THEMES.find((t) => t.id === "th-ember")!;
    expect(isThemeEquipped(ember, undefined)).toBe(false);
    expect(isThemeEquipped(ember, "th-velvet-night")).toBe(false);
    expect(isThemeEquipped(ember, "th-ember")).toBe(true);
  });
});
