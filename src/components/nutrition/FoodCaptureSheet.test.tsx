// @vitest-environment jsdom
/**
 * FoodCaptureSheet, end to end at the component seam (SYSTEM 7).
 *
 * The lib suites pin the machine, the adapter and the write path;
 * these pin the part only the component can break: opening the sheet
 * writes nothing, a finished analysis writes nothing, the estimate
 * form opens digit-for-digit with what the analysis returned, and
 * only the explicit "Log it" confirm lands an entry — labelled an
 * estimate — in the day's log. Discarding and failing are equally
 * write-free. The analysis adapter is mocked at its module boundary;
 * the write path and the log are the real ones.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockDoc = new Map<string, unknown>();

vi.mock("@/lib/prefs", () => ({
  getPref: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
    if (!mockDoc.has(key)) return fallback;
    const parsed = parse(mockDoc.get(key));
    return parsed === null ? fallback : parsed;
  },
  setPref: (key: string, value: unknown) => {
    mockDoc.set(key, value);
  },
  clearPref: (key: string) => {
    mockDoc.delete(key);
  },
}));

const analyseMock = vi.fn();
vi.mock("@/lib/capture/analyse", () => ({
  analyseCapturePhoto: (...args: unknown[]) => analyseMock(...args),
}));

import { readFoodLog } from "@/lib/nutrition/store";

import { FoodCaptureSheet } from "./FoodCaptureSheet";

const DAY = "2026-11-18";
const ESTIMATE = {
  name: "Chicken biryani",
  totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
};

function choosePhoto() {
  const input = screen.getByLabelText("Choose a meal photo");
  const file = new File(["photo"], "lunch.jpg", { type: "image/jpeg" });
  fireEvent.change(input, { target: { files: [file] } });
}

async function analyseToEstimate() {
  choosePhoto();
  fireEvent.click(screen.getByRole("button", { name: /Analyse photo/ }));
  /* The form seeds from the estimate in an effect — wait for the
     seeded name, not just for the field to exist. */
  await screen.findByDisplayValue(ESTIMATE.name);
}

beforeEach(() => {
  mockDoc.clear();
  analyseMock.mockReset();
  analyseMock.mockResolvedValue({ ok: true, estimate: ESTIMATE });
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

describe("FoodCaptureSheet", () => {
  it("opens on the photo step and writes nothing", () => {
    render(<FoodCaptureSheet open onClose={() => {}} day={DAY} />);
    expect(screen.getByRole("button", { name: /Choose a photo/ })).toBeTruthy();
    expect(readFoodLog()).toEqual([]);
  });

  it("shows the estimate digit-for-digit, still writes nothing, then logs only on confirm", async () => {
    render(<FoodCaptureSheet open onClose={() => {}} day={DAY} />);
    await analyseToEstimate();

    /* Prefill is exactly what the analysis returned. */
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Chicken biryani");
    expect((screen.getByLabelText("kcal") as HTMLInputElement).value).toBe("680");
    expect((screen.getByLabelText("Protein (g)") as HTMLInputElement).value).toBe("42");
    expect((screen.getByLabelText("Carbs (g)") as HTMLInputElement).value).toBe("75");
    expect((screen.getByLabelText("Fat (g)") as HTMLInputElement).value).toBe("24");
    expect(screen.getByText(/Estimate, based on your photo/)).toBeTruthy();

    /* Confirm-first: a ready estimate is not a logged one. */
    expect(readFoodLog()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Lunch" }));
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));

    expect(await screen.findByText("Logged as an estimate")).toBeTruthy();
    const logged = readFoodLog();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      name: "Chicken biryani",
      meal: "lunch",
      day: DAY,
      source: "coach_photo",
      nutrients: ESTIMATE.totals,
    });
    expect(logged[0]!.provenance.kind).toBe("coach_estimate");
  });

  it("discarding a ready estimate writes nothing and returns to the photo step", async () => {
    render(<FoodCaptureSheet open onClose={() => {}} day={DAY} />);
    await analyseToEstimate();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByRole("button", { name: /Choose a photo/ })).toBeTruthy();
    expect(readFoodLog()).toEqual([]);
  });

  it("a billing refusal is shown plainly, offers no retry, and writes nothing", async () => {
    analyseMock.mockResolvedValue({ ok: false, reason: "premium_required" });
    render(<FoodCaptureSheet open onClose={() => {}} day={DAY} />);
    choosePhoto();
    fireEvent.click(screen.getByRole("button", { name: /Analyse photo/ }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Premium feature/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(readFoodLog()).toEqual([]);
  });

  it("a retryable failure offers Try again and a second analysis can succeed", async () => {
    analyseMock
      .mockResolvedValueOnce({ ok: false, reason: "timeout" })
      .mockResolvedValue({ ok: true, estimate: ESTIMATE });
    render(<FoodCaptureSheet open onClose={() => {}} day={DAY} />);
    choosePhoto();
    fireEvent.click(screen.getByRole("button", { name: /Analyse photo/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByDisplayValue(ESTIMATE.name);
    expect(readFoodLog()).toEqual([]);
  });
});
