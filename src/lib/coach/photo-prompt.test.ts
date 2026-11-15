/**
 * The coach function's photo contract, pinned at the source.
 *
 * The function is Deno code and never runs under vitest, so its half of
 * the 2026-11-15 photo defects is pinned by reading its prompt text —
 * the same guard style as ui.guard.test.ts. What is pinned:
 *
 *   1. Dish first: the food-photo rule must require the identification
 *      paragraph BEFORE the ≈ estimate line. The old rule did the
 *      opposite — "your FIRST paragraph must be one line starting with
 *      ≈" — which is why "what is this dish" was answered with numbers
 *      alone.
 *   2. Photo memory: the prompt must tell the model that the thread
 *      record carries what a shared photo showed (the bracketed photo
 *      note the client now sends), and must never again tell it that
 *      photos "exist for this single reply" — the line that primed
 *      "I can't see an image" answers on follow-ups.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const FUNCTION_SOURCE = readFileSync(
  join(process.cwd(), "supabase/functions/coach/index.ts"),
  "utf8",
);

const PHOTO_SECTION = (() => {
  const start = FUNCTION_SOURCE.indexOf("ATTACHED PHOTOS AND PDFS");
  const end = FUNCTION_SOURCE.indexOf("`;", start);
  return FUNCTION_SOURCE.slice(start, end === -1 ? undefined : end);
})();

describe("the coach function's photo contract", () => {
  it("has a photo section to pin", () => {
    expect(PHOTO_SECTION.length).toBeGreaterThan(200);
  });

  it("requires the identification BEFORE the estimate line for a food photo", () => {
    const foodRule = PHOTO_SECTION.slice(
      PHOTO_SECTION.indexOf("Food or drink photo"),
      PHOTO_SECTION.indexOf("Non-food photo"),
    );
    const identificationAt = foodRule.indexOf("FIRST paragraph names the dish");
    const estimateAt = foodRule.indexOf("SECOND paragraph");
    expect(identificationAt).toBeGreaterThanOrEqual(0);
    expect(estimateAt).toBeGreaterThan(identificationAt);
    expect(foodRule).toContain("Never answer a photo with the numbers alone");
    /* The old ordering — estimate line as the FIRST paragraph — is gone. */
    expect(foodRule).not.toContain("FIRST paragraph must be one line starting with ≈");
  });

  it("tells the model the thread record carries what a photo showed", () => {
    expect(PHOTO_SECTION).toContain("Photo memory:");
    expect(PHOTO_SECTION).toContain("[Photo shared with this message — Bloom identified:");
    expect(PHOTO_SECTION).toContain(
      "never say you cannot see an image, or that no image was shared",
    );
    /* The single-reply priming line is gone. */
    expect(PHOTO_SECTION).not.toContain("exist for this single reply");
  });
});
