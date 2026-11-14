// @vitest-environment jsdom
/**
 * Mobile pass regression: the "This week" stat figure must never wrap
 * mid-phrase. The synthesis value is "3 of 7 days"; the tile renders the
 * figure "3 of 7" on one no-wrap line with "days" as its caption, so the
 * tile stays the height of its row-mates instead of growing a second
 * figure line and leaving dead space in theirs.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { StatTiles } from "./OverviewBand";
import type { OverviewSynthesis } from "@/lib/overview/synthesis";

afterEach(cleanup);

const overview = {
  state: {
    headline: "The day is partly written.",
    lines: [],
    facts: [{ id: "week", label: "This week", value: "3 of 7 days" }],
  },
} as unknown as OverviewSynthesis;

describe("StatTiles on a phone (mobile pass)", () => {
  it("renders the week figure on one no-wrap line with the unit as caption", () => {
    render(<StatTiles overview={overview} ready />);
    const figure = screen.getByText("3 of 7");
    expect(figure.tagName).toBe("DD");
    expect(figure.className).toContain("whitespace-nowrap");
    const caption = screen.getByText("days");
    expect(caption.tagName).toBe("SPAN");
    /* The full phrase still reads as one accessible value. */
    expect(figure.textContent).toContain("days");
  });
});
