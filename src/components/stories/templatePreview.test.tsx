// @vitest-environment jsdom
/**
 * A template preview with an unfilled photo slot must still look intentional.
 *
 * Every one of the 50 templates renders live from its composition, so on the
 * shelf almost every preview has at least one empty photo slot in it. Those
 * slots used to be a fixed `rgba(148,142,168,0.16)` grey regardless of the
 * template — a smudge on the ivory designs and a hole in the obsidian ones,
 * which is most of why a shelf of them read as unfinished rather than designed.
 *
 * They now tint from the template's own ink. This pins that, and pins the ink
 * being published at all: `--story-ink` was declared once on `.bstory` as a
 * static ivory, so on the light templates it equalled the paper and anything
 * relying on it for contrast vanished.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

afterEach(cleanup);

import { EMPTY_BLOOM_DATA } from "@/lib/stories/types";
import { STORY_TEMPLATE_COLLECTION } from "@/lib/stories/templates/collection";
import { instantiateTemplate } from "@/lib/stories/templates";
import { StoryCanvas } from "@/components/stories/StoryCanvas";

beforeAll(() => {
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

function renderTemplate(id: string) {
  const def = STORY_TEMPLATE_COLLECTION.find((d) => d.id === id);
  if (!def) throw new Error(`no such template: ${id}`);
  const composed = instantiateTemplate(def);
  if (!composed) throw new Error(`could not instantiate: ${id}`);
  const { container } = render(
    <StoryCanvas
      media={{ type: "none", src: null }}
      background={composed.composed.background}
      elements={composed.composed.elements}
      data={EMPTY_BLOOM_DATA}
      mode="static"
      fixedScale={0.3}
      showMaskDefs={false}
    />,
  );
  return { def, container };
}

describe("empty photo slots", () => {
  it("tint from the template's ink rather than a fixed grey", () => {
    let slots = 0;
    const byTone = new Map<string, number>();

    for (const def of STORY_TEMPLATE_COLLECTION) {
      const composed = instantiateTemplate(def);
      if (!composed) continue;
      if (!composed.composed.elements.some((e) => e.kind === "photo")) continue;

      const { container } = renderTemplate(def.id);
      const inner = container.querySelector<HTMLElement>(".sphoto-inner");
      if (!inner) continue;

      slots += 1;
      const bg = inner.style.background;
      expect(bg, `${def.id}: the old flat grey is back`).not.toContain("rgba(148, 142, 168");
      expect(bg, `${def.id}: should tint from the ink`).toContain("color-mix");

      const ink = container
        .querySelector<HTMLElement>(".scanvas")!
        .style.getPropertyValue("--story-ink");
      expect(ink, `${def.id}: canvas should publish its ink`).toBeTruthy();
      /* The whole point: the ink has to contrast with the template's paper. */
      expect(ink, `${def.id}: ink must not equal the background colour`).not.toBe(
        (composed.composed.background as { color?: string }).color,
      );

      byTone.set(def.tone, (byTone.get(def.tone) ?? 0) + 1);
    }

    /* If this drops, the templates stopped using photo slots and this test
       stopped proving anything. */
    expect(slots).toBeGreaterThan(20);
    /* Both dark and light templates must be covered, or one of them is
       silently getting the wrong tint. */
    expect(byTone.get("dark")).toBeGreaterThan(0);
    expect(byTone.get("light")).toBeGreaterThan(0);
  });
});
