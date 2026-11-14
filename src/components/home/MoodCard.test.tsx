// @vitest-environment jsdom
/**
 * The MoodCard (Reskin slice A): Bloom's six real faces, the prototype's
 * five tones mapped by each face's real preset score, and the prototype's
 * title/body states — before logging, and after, with the logged face
 * selected in its tone.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { MoodCard, MOOD_TONES } from "./MoodCard";
import { PAGE_MOOD_PRESETS, type PageMood } from "@/lib/mood/page";
import type { MoodEntry } from "@/lib/mood/types";

afterEach(cleanup);

const entry = (over: Partial<MoodEntry>): MoodEntry => ({
  id: "m1",
  timestamp: new Date().toISOString(),
  mood: 8.5,
  energy: 7,
  stress: 3,
  emotions: ["happy"],
  tags: ["quick-log"],
  ...over,
});

describe("MoodCard — tone mapping", () => {
  it("maps the prototype tones onto Bloom's faces by preset score, warmest highest", () => {
    // The tones are tokens (styles.css is the hex home): low, flat,
    // steady, good, radiant — referenced by name, never by hex.
    const tones = [
      "var(--mood-tone-low)",
      "var(--mood-tone-flat)",
      "var(--mood-tone-steady)",
      "var(--mood-tone-good)",
      "var(--mood-tone-radiant)",
    ];
    for (const tone of Object.values(MOOD_TONES)) expect(tones).toContain(tone);
    // Highest preset score (Happy 8.5) takes the warmest tone; the lowest
    // two faces share the coolest, there being five tones for six faces.
    const byScore = (Object.keys(PAGE_MOOD_PRESETS) as PageMood[]).sort(
      (a, b) => PAGE_MOOD_PRESETS[b].mood - PAGE_MOOD_PRESETS[a].mood,
    );
    expect(MOOD_TONES[byScore[0]!]).toBe("var(--mood-tone-radiant)");
    expect(MOOD_TONES[byScore[byScore.length - 1]!]).toBe("var(--mood-tone-low)");
    expect(MOOD_TONES.sad).toBe("var(--mood-tone-low)");
  });
});

describe("MoodCard — states", () => {
  it("asks the question before logging and offers all six real faces", () => {
    render(<MoodCard entry={null} onPick={() => {}} onOpenComposer={() => {}} />);
    expect(screen.getByText("How does today feel?")).toBeTruthy();
    for (const face of ["happy", "calm", "neutral", "sad", "anxious", "angry"]) {
      const tile = screen.getByTestId(`home-mood-face-${face}`);
      expect(tile.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("names the logged feeling and selects its face in its tone", () => {
    render(<MoodCard entry={entry({})} onPick={() => {}} onOpenComposer={() => {}} />);
    expect(screen.getByText("Feeling happy.")).toBeTruthy();
    const tile = screen.getByTestId("home-mood-face-happy");
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(tile.style.borderColor).not.toBe("");
    expect(screen.getByTestId("home-mood-face-calm").getAttribute("aria-pressed")).toBe("false");
  });

  it("a face tap is the quick log; the detail button opens the composer", () => {
    const onPick = vi.fn();
    const onOpenComposer = vi.fn();
    render(<MoodCard entry={null} onPick={onPick} onOpenComposer={onOpenComposer} />);
    fireEvent.click(screen.getByTestId("home-mood-face-calm"));
    expect(onPick).toHaveBeenCalledWith("calm");
    fireEvent.click(screen.getByTestId("home-mood-more"));
    expect(onOpenComposer).toHaveBeenCalledTimes(1);
  });
});
