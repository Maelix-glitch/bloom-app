// @vitest-environment jsdom
/**
 * The Mood moment sheet — behaviour, not pixels.
 *
 * This suite exists because the composer is the one input in Bloom people use
 * every day, and its previous shape was rebuilt from a form into a moment
 * capture. These tests pin the contract the three call sites depend on:
 *   · a new entry needs a feeling before it can be saved,
 *   · saving emits a real MoodEntry carrying the face's readings,
 *   · editing keeps the id (no duplicate row),
 *   · a rejected save keeps the sheet open and says so — never a fake success,
 *   · the tracker prefill still fills the hidden context section,
 *   · delete asks first and only fires once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import dayjs from "dayjs";

import { Composer } from "./Composer";
import type { MoodEntry } from "@/lib/mood/types";

/*
 * vitest runs with `globals: false`, so Testing Library's automatic
 * `afterEach(cleanup)` never registers — without this, each test renders into
 * the previous test's DOM and every query finds two of everything.
 */
afterEach(cleanup);

/* jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
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
});

const saved = () => screen.getByTestId("mood-composer-save") as HTMLButtonElement;
const clickFace = (face: string) =>
  fireEvent.click(screen.getByTestId(`mood-composer-face-${face}`));

function makeEntry(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: "m-existing",
    timestamp: dayjs().subtract(1, "day").toISOString(),
    mood: 3.5,
    energy: 3,
    stress: 5,
    emotions: ["sad"],
    tags: [],
    ...overrides,
  };
}

describe("mood composer", () => {
  it("does not render when closed", () => {
    render(<Composer open={false} initial={null} onClose={() => {}} onSave={() => {}} />);
    expect(screen.queryByTestId("mood-composer-save")).toBeNull();
  });

  it("asks for a feeling first — save is disabled until one is chosen", () => {
    render(<Composer open initial={null} onClose={() => {}} onSave={() => {}} />);
    expect(saved().disabled).toBe(true);
    clickFace("calm");
    expect(saved().disabled).toBe(false);
  });

  it("saves a real entry carrying the chosen face's readings and note", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Composer open initial={null} onClose={() => {}} onSave={onSave} />);

    clickFace("anxious");
    fireEvent.change(screen.getByLabelText("Anything you'd like to remember?"), {
      target: { value: "Deadline day" },
    });
    await act(async () => {
      fireEvent.click(saved());
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const entry = onSave.mock.calls[0]![0] as MoodEntry;
    expect(entry.mood).toBe(4.5);
    expect(entry.energy).toBe(6);
    expect(entry.stress).toBe(8);
    expect(entry.emotions).toContain("anxious");
    expect(entry.note).toBe("Deadline day");
    /* Nothing the person didn't give us: no invented sleep, steps or weather. */
    expect(entry.sleep).toBeUndefined();
    expect(entry.steps).toBeUndefined();
    expect(entry.weather).toBeUndefined();
  });

  it("editing keeps the same id, so it updates instead of stacking a second row", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Composer open initial={makeEntry()} onClose={() => {}} onSave={onSave} />);

    /* The face belonging to the entry being edited is already selected. */
    expect(screen.getByTestId("mood-composer-face-sad").getAttribute("aria-pressed")).toBe("true");
    clickFace("happy");

    await act(async () => {
      fireEvent.click(saved());
    });
    expect((onSave.mock.calls[0]![0] as MoodEntry).id).toBe("m-existing");
    expect((onSave.mock.calls[0]![0] as MoodEntry).emotions).toContain("happy");
  });

  it("a failed save keeps the sheet open and says so — never a silent success", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("network"));
    const onClose = vi.fn();
    render(<Composer open initial={null} onClose={onClose} onSave={onSave} />);

    clickFace("calm");
    await act(async () => {
      fireEvent.click(saved());
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(saved().disabled).toBe(false);
  });

  it("a second click while saving cannot produce a duplicate entry", async () => {
    let release: () => void = () => {};
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    render(<Composer open initial={null} onClose={() => {}} onSave={onSave} />);
    clickFace("calm");

    await act(async () => {
      fireEvent.click(saved());
    });
    expect(saved().disabled).toBe(true);
    await act(async () => {
      fireEvent.click(saved());
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
    });
  });

  it("fills the hidden context section from the day's trackers", async () => {
    const today = dayjs().format("YYYY-MM-DD");
    window.localStorage.setItem(
      "bloom.trackers.days.v1",
      JSON.stringify([
        {
          date: today,
          sleepMinutes: 450,
          movementMinutes: 42,
          screenMinutes: 180,
          sessions: [],
        },
      ]),
    );
    render(<Composer open initial={null} onClose={() => {}} onSave={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /more detail/i }));
    await waitFor(() => expect(screen.getByTestId("mood-context-prefill")).toBeTruthy());

    const sleep = screen.getByRole("spinbutton", { name: "Sleep" }) as HTMLInputElement;
    expect(sleep.value).toBe("7.5");
  });

  it("keeps context values the person typed when the day changes", async () => {
    render(<Composer open initial={null} onClose={() => {}} onSave={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /more detail/i }));

    const steps = screen.getByRole("spinbutton", { name: "Steps" }) as HTMLInputElement;
    fireEvent.change(steps, { target: { value: "8400" } });
    expect(steps.value).toBe("8400");
  });

  it("delete asks first, and only deletes once the person confirms", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <Composer
        open
        initial={makeEntry()}
        onClose={onClose}
        onSave={() => {}}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId("mood-composer-delete"));
    expect(onDelete).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "m-existing" }));
  });

  it("hides delete when the caller cannot delete", () => {
    render(<Composer open initial={makeEntry()} onClose={() => {}} onSave={() => {}} />);
    expect(screen.queryByTestId("mood-composer-delete")).toBeNull();
  });
});
