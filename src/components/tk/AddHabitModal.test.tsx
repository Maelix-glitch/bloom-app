// @vitest-environment jsdom
/**
 * AddHabitModal icon behaviour (U4, plan §3.4): the picker offers bespoke
 * glyphs, picking one saves `icon: { type: "bloom", value: <glyph id> }`
 * (which lib/home/habits maps onto icon_type='bloom'), the untouched
 * default is the star-bloom, and editing a legacy emoji habit upgrades it
 * to its twin glyph on re-save.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AddHabitModal, type AddHabitPayload } from "./AddHabitModal";

afterEach(cleanup);

async function fillAndSubmit(name: string) {
  fireEvent.change(screen.getByPlaceholderText("e.g. Morning walk"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Create habit" }));
}

describe("AddHabitModal — bespoke icon picker", () => {
  it("renders glyph buttons, not emoji, for the catalogue", () => {
    render(<AddHabitModal open onClose={() => {}} onSubmit={() => {}} />);
    const sprout = screen.getByRole("button", { name: "grow" });
    expect(sprout.querySelector("svg")).not.toBeNull();
    expect(sprout.getAttribute("data-icon")).toBe("sprout");
    // the whole grid is glyphs: no button carries a catalogue emoji
    for (const btn of document.querySelectorAll(".icon-opt")) {
      expect(btn.querySelector("svg")).not.toBeNull();
    }
  });

  it("saves the picked glyph as a bloom icon", async () => {
    const onSubmit = vi.fn<(h: AddHabitPayload) => void>();
    render(<AddHabitModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "grow" }));
    await fillAndSubmit("Water the plants");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].icon).toEqual({ type: "bloom", value: "sprout" });
  });

  it("defaults to the star-bloom glyph when the picker is untouched", async () => {
    const onSubmit = vi.fn<(h: AddHabitPayload) => void>();
    render(<AddHabitModal open onClose={() => {}} onSubmit={onSubmit} />);
    await fillAndSubmit("Untitled but glyph’d");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].icon).toEqual({ type: "bloom", value: "star-bloom" });
  });

  it("upgrades a legacy catalogue emoji to its twin glyph on re-save", async () => {
    const onSubmit = vi.fn<(h: AddHabitPayload) => void>();
    render(
      <AddHabitModal
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        prefill={{ name: "Grow something", icon: { type: "emoji", value: "🌱" } }}
      />,
    );
    // the twin is already the selected tile before anything is touched
    expect(screen.getByRole("button", { name: "grow" }).className).toContain("selected");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].icon).toEqual({ type: "bloom", value: "sprout" });
  });

  it("keeps a free-pasted emoji as itself when editing", async () => {
    const onSubmit = vi.fn<(h: AddHabitPayload) => void>();
    render(
      <AddHabitModal
        open
        onClose={() => {}}
        onSubmit={onSubmit}
        prefill={{ name: "Unicorn time", icon: { type: "emoji", value: "🦄" } }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].icon).toEqual({ type: "emoji", value: "🦄" });
  });

  it("still searches the catalogue by the original keywords", () => {
    render(<AddHabitModal open onClose={() => {}} onSubmit={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Search icons…"), {
      target: { value: "laundry" },
    });
    expect(screen.getByRole("button", { name: "laundry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "grow" })).toBeNull();
  });
});
