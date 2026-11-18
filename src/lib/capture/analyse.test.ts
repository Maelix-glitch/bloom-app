/**
 * The capture analysis adapter, pinned.
 *
 * The adapter's whole job is fidelity to the existing pipeline: the
 * photo goes through the Coach's own media prep and edge invocation,
 * the estimate comes out of the Coach's own strict detector, and every
 * failure — including the billing refusals — arrives as an honest
 * reason, never a substitute answer. These tests mock only the two
 * transport seams (media prep, edge call); the detector is the real
 * `coachPhotoEstimate`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const askEdgeMock = vi.fn();
vi.mock("@/lib/coach/edge", () => ({
  askEdge: (...args: unknown[]) => askEdgeMock(...args),
}));

const fileToPhotoMediaMock = vi.fn();
vi.mock("@/lib/coach/media", () => ({
  fileToPhotoMedia: (...args: unknown[]) => fileToPhotoMediaMock(...args),
}));

import type { CoachMedia, EdgeRequest } from "@/lib/coach/edge";

import { CAPTURE_MESSAGE, analyseCapturePhoto } from "./analyse";

const MEDIA: CoachMedia = { mediaType: "image/jpeg", dataBase64: "aGVsbG8=" };
const FILE = new File(["photo"], "lunch.jpg", { type: "image/jpeg" });

const GOOD_REPLY = {
  ok: true as const,
  paragraphs: [
    "That is chicken biryani served with a side of cucumber raita. You can see spiced basmati rice topped with fried onions.",
    "≈ 680 kcal · 42 g protein · 75 g carbs · 24 g fat",
  ],
  provider: "gemini",
};

beforeEach(() => {
  mockDoc.clear();
  askEdgeMock.mockReset();
  fileToPhotoMediaMock.mockReset();
  fileToPhotoMediaMock.mockResolvedValue(MEDIA);
});

describe("analyseCapturePhoto — the pipeline, reused exactly", () => {
  it("sends the prepared photo through askEdge once, with no chat history", async () => {
    askEdgeMock.mockResolvedValue(GOOD_REPLY);
    const result = await analyseCapturePhoto(FILE);
    expect(result.ok).toBe(true);

    expect(askEdgeMock).toHaveBeenCalledTimes(1);
    const request = askEdgeMock.mock.calls[0]![0] as EdgeRequest;
    expect(request.image).toBe(MEDIA);
    expect(request.history).toEqual([]);
    expect(request.message).toBe(CAPTURE_MESSAGE);
    expect(request.topic).toBe("food");
  });

  it("extracts the estimate with the Coach's own detector: dish first, totals as stated", async () => {
    askEdgeMock.mockResolvedValue(GOOD_REPLY);
    const result = await analyseCapturePhoto(FILE);
    expect(result).toEqual({
      ok: true,
      estimate: {
        name: "Chicken biryani",
        totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
      },
    });
  });
});

describe("analyseCapturePhoto — honest failures, nothing substituted", () => {
  it("an unreadable photo file never reaches the edge function", async () => {
    fileToPhotoMediaMock.mockResolvedValue(null);
    expect(await analyseCapturePhoto(FILE)).toEqual({ ok: false, reason: "unreadable_photo" });
    expect(askEdgeMock).not.toHaveBeenCalled();

    fileToPhotoMediaMock.mockRejectedValue(new Error("decode failed"));
    expect(await analyseCapturePhoto(FILE)).toEqual({ ok: false, reason: "unreadable_photo" });
    expect(askEdgeMock).not.toHaveBeenCalled();
  });

  it("edge failures pass through as their own reasons", async () => {
    for (const reason of ["timeout", "unconfigured", "error"] as const) {
      askEdgeMock.mockResolvedValue({ ok: false, reason });
      expect(await analyseCapturePhoto(FILE)).toEqual({ ok: false, reason });
    }
  });

  it("billing refusals pass through untouched — a retry cannot fix them", async () => {
    for (const reason of ["insufficient_credits", "premium_required"] as const) {
      askEdgeMock.mockResolvedValue({ ok: false, reason });
      expect(await analyseCapturePhoto(FILE)).toEqual({ ok: false, reason });
    }
  });

  it("a reply with no usable estimate line is no_estimate, not a guess", async () => {
    askEdgeMock.mockResolvedValue({
      ok: true,
      paragraphs: ["That is a green salad with grilled paneer.", "It looks fresh and light."],
      provider: "gemini",
    });
    expect(await analyseCapturePhoto(FILE)).toEqual({ ok: false, reason: "no_estimate" });

    /* A hedged range is not an estimate Bloom can log, either. */
    askEdgeMock.mockResolvedValue({
      ok: true,
      paragraphs: [
        "That is a green salad with grilled paneer.",
        "≈ 500–600 kcal · 30 g protein · 40 g carbs · 20 g fat",
      ],
      provider: "gemini",
    });
    expect(await analyseCapturePhoto(FILE)).toEqual({ ok: false, reason: "no_estimate" });
  });
});
