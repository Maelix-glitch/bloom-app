// @vitest-environment jsdom
/**
 * M-246 — the Mood page's selection must feel smooth, and the
 * quote must breathe. Owner report (2026-11-25, on his own tab):
 * the line "However today lands..." sat hard against the mood
 * faces, and the selection animation felt rough. Measured live:
 * the face labels ended ~3px above the quote strip's hairline.
 * Root causes, all pinned here so they cannot quietly return:
 *
 *   1. The De-box override zeroed ALL padding on the log panel's
 *      faces container (it wins over the markup's p-6/p-9/p-11),
 *      gluing the hairline to the labels. The override now keeps
 *      the float-on-canvas look but restores bottom air.
 *   2. The saving face carried Tailwind's animate-pulse, whose
 *      opacity flicker fought the selection animation on every
 *      tap and snapped off mid-beat when the save landed.
 *   3. The chosen face's glow was an animated drop-shadow filter
 *      — a per-frame repaint that stutters on phones. The glow
 *      is now a halo behind the blob that fades by opacity, on
 *      the same duration as the grow.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const MOOD_CSS = read("styles/mood.css");
const MOOD_PAGE = read("components/mood/page/MoodPage.tsx");

/** The body of the first rule whose selector contains `needle`. */
function ruleBody(css: string, needle: string): string {
  const at = css.indexOf(needle);
  expect(at, `rule containing ${needle}`).toBeGreaterThan(-1);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

describe("M-246: mood selection smoothness + quote air", () => {
  it("the log panel's faces container keeps its bottom air at the winning rule", () => {
    const body = ruleBody(
      MOOD_CSS,
      'section.mp-panel[data-testid="mood-log"] > div:first-child',
    );
    expect(body).toContain("padding: 0 0 var(--space-10)");
  });

  it("no face carries the saving pulse", () => {
    const faceSpan = MOOD_PAGE.slice(MOOD_PAGE.indexOf('className="mm-face'));
    expect(faceSpan.slice(0, 200)).not.toContain("animate-pulse");
    expect(MOOD_PAGE).not.toContain('busy ? "animate-pulse"');
  });

  it("the face transition never animates a filter", () => {
    const body = ruleBody(MOOD_CSS, ".mood-page .mm-face {");
    expect(body).not.toContain("filter");
  });

  it("the chosen face's glow is an opacity halo, not a drop-shadow", () => {
    const active = ruleBody(MOOD_CSS, '.mm-face[data-active="true"] {');
    expect(active).not.toContain("drop-shadow");
    const halo = ruleBody(MOOD_CSS, ".mood-page .mm-face::before {");
    expect(halo).toContain("radial-gradient");
    expect(halo).toContain("opacity: 0");
    expect(halo).toContain("transition: opacity");
    const haloOn = ruleBody(
      MOOD_CSS,
      '.mm-face[data-active="true"]::before {',
    );
    expect(haloOn).toContain("opacity: 1");
  });
});
