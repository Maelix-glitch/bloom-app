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

/**
 * The Coach "Log this" handoff (W4-3 N5, design §4.4).
 *
 * The discipline under test is the Coach north star: Coach proposes,
 * the user disposes. Detection must be strict (a recorded photo
 * identification AND a clean ≈ totals line — never a guess about a
 * guess), the confirm sheet's prefill must be digit-for-digit what
 * Coach said, the write must go through the estimate path only, and
 * one message must never log twice.
 */

import { COACH_ESTIMATE_LABEL } from "./entries";
import {
  COACH_LOG_KEY,
  coachEstimateForMessage,
  coachPhotoEstimate,
  dishNameFromPhotoNote,
  logCoachEstimate,
  loggedEntryIdFor,
  mealForHour,
  parseCoachEstimateTotals,
  parseCoachLogValue,
  parseEditedTotals,
  readCoachLogRecord,
  type CoachThreadMessageLike,
} from "./coachLog";
import { deleteLogEntry } from "./log";
import { readFoodLog } from "./store";

const PHOTO_NOTE =
  "That looks like a classic chicken biryani served with a side of cucumber raita.";
const ESTIMATE_LINE = "≈ 680 kcal · 42 g protein · 75 g carbs · 24 g fat";
const REPLY = [PHOTO_NOTE, ESTIMATE_LINE];
const TOTALS = { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 };
const DAY = "2026-11-15";
const NOW = "2026-11-15T07:30:00.000Z";

beforeEach(() => {
  mockDoc.clear();
});

/* ------------------------------ totals parsing ----------------------------- */

describe("parseCoachEstimateTotals", () => {
  it("parses the canonical ≈ line exactly as Coach states it", () => {
    expect(parseCoachEstimateTotals(REPLY)).toEqual(TOTALS);
  });

  it("finds the line inside a multi-line paragraph", () => {
    expect(parseCoachEstimateTotals([`Some prose first.\n${ESTIMATE_LINE}`])).toEqual(TOTALS);
  });

  it("reads grouped thousands and decimals as written", () => {
    expect(
      parseCoachEstimateTotals(["≈ 1,200 kcal · 30 g protein · 40 g carbs · 20 g fat"]),
    ).toEqual({ kcal: 1200, proteinG: 30, carbsG: 40, fatG: 20 });
    expect(
      parseCoachEstimateTotals(["≈ 540.5 kcal · 32 g protein · 61 g carbs · 19 g fat"]),
    ).toEqual({ kcal: 540.5, proteinG: 32, carbsG: 61, fatG: 19 });
  });

  it("accepts zero macros — a photo of olive oil has no protein to invent", () => {
    expect(
      parseCoachEstimateTotals(["≈ 884 kcal · 0 g protein · 0 g carbs · 100 g fat"]),
    ).toEqual({ kcal: 884, proteinG: 0, carbsG: 0, fatG: 100 });
  });

  it("refuses a line missing a macro — never a guess about a guess", () => {
    expect(parseCoachEstimateTotals(["≈ 680 kcal · 42 g protein · 75 g carbs"])).toBeNull();
  });

  it("refuses a hedged range rather than picking one end of it", () => {
    expect(
      parseCoachEstimateTotals(["≈ 500–600 kcal · 30 g protein · 40 g carbs · 20 g fat"]),
    ).toBeNull();
  });

  it("refuses prose that merely mentions ≈ mid-line", () => {
    expect(
      parseCoachEstimateTotals([`Roughly ${ESTIMATE_LINE}, give or take`]),
    ).toBeNull();
  });

  it("refuses totals beyond the engine's entry caps", () => {
    expect(
      parseCoachEstimateTotals(["≈ 20000 kcal · 30 g protein · 40 g carbs · 20 g fat"]),
    ).toBeNull();
  });

  it("refuses a zero-calorie line and a reply with no estimate line at all", () => {
    expect(
      parseCoachEstimateTotals(["≈ 0 kcal · 0 g protein · 0 g carbs · 0 g fat"]),
    ).toBeNull();
    expect(parseCoachEstimateTotals(["That looks like soup."])).toBeNull();
    expect(parseCoachEstimateTotals([])).toBeNull();
  });
});

/* --------------------------- visibility (detection) ------------------------ */

describe("coachPhotoEstimate — the visibility rule", () => {
  it("a photo reply with a clean estimate offers it — totals verbatim, name derived short", () => {
    expect(coachPhotoEstimate(REPLY, PHOTO_NOTE)).toEqual({
      name: "Classic chicken biryani",
      totals: TOTALS,
    });
  });

  it("no recorded identification → no offer, however clean the numbers", () => {
    expect(coachPhotoEstimate(REPLY, undefined)).toBeNull();
    expect(coachPhotoEstimate(REPLY, "   ")).toBeNull();
  });

  it("an identification with no parseable estimate → no offer", () => {
    expect(coachPhotoEstimate(["I can see a plate, but I can't estimate it."], PHOTO_NOTE)).toBeNull();
  });
});

/* --------------------------- dish-name derivation -------------------------- */

describe("dishNameFromPhotoNote — the sheet's name prefill", () => {
  it("strips the framing and keeps the head dish (the live-sweep shape)", () => {
    expect(
      dishNameFromPhotoNote(
        "That is chicken biryani served with a side of cucumber raita. You can see spiced basmati rice topped with crispy fried onions.",
      ),
    ).toBe("Chicken biryani");
    expect(dishNameFromPhotoNote(PHOTO_NOTE)).toBe("Classic chicken biryani");
  });

  it("cuts a bare accompaniment with no framing phrase", () => {
    expect(dishNameFromPhotoNote("Chicken biryani with cucumber raita")).toBe("Chicken biryani");
  });

  it("keeps a one-word dish, with or without its sentence end", () => {
    expect(dishNameFromPhotoNote("Samosa")).toBe("Samosa");
    expect(dishNameFromPhotoNote("Samosa.")).toBe("Samosa");
  });

  it("keeps a note with no framing phrase whole up to its sentence end", () => {
    expect(dishNameFromPhotoNote("Grilled paneer tikka, charred at the edges.")).toBe(
      "Grilled paneer tikka, charred at the edges",
    );
  });

  it("strips every framing shape, case-insensitively, article included", () => {
    expect(dishNameFromPhotoNote("This is a masala dosa with coconut chutney and sambar")).toBe(
      "Masala dosa",
    );
    expect(dishNameFromPhotoNote("It's a Margherita pizza")).toBe("Margherita pizza");
    expect(dishNameFromPhotoNote("It is pho bo")).toBe("Pho bo");
    expect(dishNameFromPhotoNote("that looks like tomato soup")).toBe("Tomato soup");
  });

  it("stops at the first sentence even when later sentences add sides", () => {
    expect(
      dishNameFromPhotoNote("That is tomato soup. It comes with a grilled cheese sandwich."),
    ).toBe("Tomato soup");
  });

  it("caps an over-long head at a word boundary, never mid-word", () => {
    const name = dishNameFromPhotoNote(
      "Oven roasted Mediterranean vegetable and halloumi platter generously drizzled",
    );
    expect(name).toBe("Oven roasted Mediterranean vegetable and halloumi platter");
    expect(name.length).toBeLessThanOrEqual(60);
  });

  it("empty and whitespace notes derive nothing", () => {
    expect(dishNameFromPhotoNote("")).toBe("");
    expect(dishNameFromPhotoNote("   ")).toBe("");
  });

  it("falls back to the trimmed note when derivation leaves nothing usable", () => {
    // The head before the first sentence end is empty — the note itself,
    // verbatim, is the name rather than an invented one.
    expect(dishNameFromPhotoNote(". Biryani")).toBe(". Biryani");
  });
});

describe("coachEstimateForMessage — thread wiring", () => {
  const user = (over: Partial<CoachThreadMessageLike> = {}): CoachThreadMessageLike => ({
    role: "user",
    paragraphs: ["What is this dish?"],
    ...over,
  });
  const coach = (paragraphs: string[]): CoachThreadMessageLike => ({
    role: "coach",
    paragraphs,
  });

  it("the reply that read the photo offers its estimate", () => {
    const messages = [user({ photoNote: PHOTO_NOTE }), coach(REPLY)];
    expect(coachEstimateForMessage(messages, 1)).toEqual({
      name: "Classic chicken biryani",
      totals: TOTALS,
    });
  });

  it("a plain text reply with an ≈ line offers nothing — no photo behind it", () => {
    const messages = [user(), coach(REPLY)];
    expect(coachEstimateForMessage(messages, 1)).toBeNull();
  });

  it("a follow-up reply does not re-offer the earlier photo's estimate", () => {
    const messages = [
      user({ photoNote: PHOTO_NOTE }),
      coach(REPLY),
      user({ paragraphs: ["And the totals again?"] }),
      coach([ESTIMATE_LINE]),
    ];
    expect(coachEstimateForMessage(messages, 3)).toBeNull();
  });

  it("user messages and the thread head offer nothing", () => {
    const messages = [user({ photoNote: PHOTO_NOTE }), coach(REPLY)];
    expect(coachEstimateForMessage(messages, 0)).toBeNull();
    expect(coachEstimateForMessage([coach(REPLY)], 0)).toBeNull();
  });
});

/* -------------------------------- meal default ----------------------------- */

describe("mealForHour", () => {
  it("defaults the slot by time of day, boundaries included", () => {
    expect(mealForHour(4)).toBe("snack");
    expect(mealForHour(5)).toBe("breakfast");
    expect(mealForHour(10)).toBe("breakfast");
    expect(mealForHour(11)).toBe("lunch");
    expect(mealForHour(15)).toBe("lunch");
    expect(mealForHour(16)).toBe("dinner");
    expect(mealForHour(21)).toBe("dinner");
    expect(mealForHour(22)).toBe("snack");
    expect(mealForHour(0)).toBe("snack");
  });
});

/* ------------------------------ edited totals ------------------------------ */

describe("parseEditedTotals — the sheet's forgiving fields", () => {
  it("reads plain values exactly", () => {
    expect(parseEditedTotals({ kcal: "680", proteinG: "42", carbsG: "75", fatG: "24" })).toEqual(
      TOTALS,
    );
  });

  it("reads grouping commas and a decimal comma the way they were meant", () => {
    expect(
      parseEditedTotals({ kcal: "1,200", proteinG: "30", carbsG: "40", fatG: "20" }),
    ).toEqual({ kcal: 1200, proteinG: 30, carbsG: 40, fatG: 20 });
    expect(
      parseEditedTotals({ kcal: "300", proteinG: "1,5", carbsG: "40", fatG: "20" }),
    ).toEqual({ kcal: 300, proteinG: 1.5, carbsG: 40, fatG: 20 });
  });

  it("refuses empty, garbage, negative and out-of-cap fields", () => {
    const base = { kcal: "680", proteinG: "42", carbsG: "75", fatG: "24" };
    expect(parseEditedTotals({ ...base, kcal: "" })).toBeNull();
    expect(parseEditedTotals({ ...base, proteinG: "abc" })).toBeNull();
    expect(parseEditedTotals({ ...base, fatG: "-3" })).toBeNull();
    expect(parseEditedTotals({ ...base, kcal: "0" })).toBeNull();
    expect(parseEditedTotals({ ...base, kcal: "20000" })).toBeNull();
    expect(parseEditedTotals({ ...base, proteinG: "1001" })).toBeNull();
  });
});

/* ------------------------------ the write path ----------------------------- */

describe("logCoachEstimate", () => {
  const input = {
    messageId: "coach-msg-1",
    name: PHOTO_NOTE,
    totals: TOTALS,
    meal: "lunch" as const,
    day: DAY,
    now: NOW,
  };

  it("creates the entry through the estimate path, labelled forever", () => {
    const entry = logCoachEstimate(input);
    expect(entry).not.toBeNull();
    const stored = readFoodLog();
    expect(stored).toHaveLength(1);
    const [saved] = stored;
    expect(saved!.id).toBe(entry!.id);
    expect(saved!.source).toBe("coach_photo");
    expect(saved!.provenance).toEqual({ kind: "coach_estimate", label: COACH_ESTIMATE_LABEL });
    expect(saved!.foodId).toBeNull();
    expect(saved!.snapshot).toEqual({ name: PHOTO_NOTE, totals: TOTALS });
    expect(saved!.nutrients).toEqual(TOTALS);
    expect(saved!.day).toBe(DAY);
    expect(saved!.meal).toBe("lunch");
    // No reusable Food was created from the estimate.
    expect(mockDoc.has("health.foods.v1")).toBe(false);
  });

  it("user-edited totals land as edited — still an estimate, still labelled", () => {
    const edited = { ...TOTALS, proteinG: 50 };
    const entry = logCoachEstimate({ ...input, totals: edited });
    expect(entry).not.toBeNull();
    const [saved] = readFoodLog();
    expect(saved!.nutrients).toEqual(edited);
    expect(saved!.snapshot!.totals).toEqual(edited);
    expect(saved!.provenance.kind).toBe("coach_estimate");
  });

  it("logging the same message twice creates one entry, not two", () => {
    const first = logCoachEstimate(input);
    const second = logCoachEstimate({ ...input, totals: { ...TOTALS, kcal: 999 } });
    expect(second!.id).toBe(first!.id);
    expect(readFoodLog()).toHaveLength(1);
    // The second call's different numbers did not overwrite the first log.
    expect(readFoodLog()[0]!.nutrients).toEqual(TOTALS);
  });

  it("once the entry is deleted from the log, the message can be logged again", () => {
    const first = logCoachEstimate(input);
    expect(loggedEntryIdFor("coach-msg-1", readFoodLog())).toBe(first!.id);
    deleteLogEntry(first!.id);
    expect(loggedEntryIdFor("coach-msg-1", readFoodLog())).toBeNull();
    const again = logCoachEstimate(input);
    expect(again).not.toBeNull();
    expect(again!.id).not.toBe(first!.id);
    expect(readFoodLog()).toHaveLength(1);
  });

  it("totals the factory refuses write nothing and record nothing", () => {
    const entry = logCoachEstimate({ ...input, totals: { ...TOTALS, kcal: 50000 } });
    expect(entry).toBeNull();
    expect(readFoodLog()).toEqual([]);
    expect(readCoachLogRecord()).toEqual({});
    expect(mockDoc.has(COACH_LOG_KEY)).toBe(false);
  });
});

/* ------------------------------ record parsing ----------------------------- */

describe("parseCoachLogValue", () => {
  it("round-trips a well-formed record", () => {
    expect(parseCoachLogValue({ version: 1, logged: { m1: "e1" } })).toEqual({ m1: "e1" });
  });

  it("refuses wrong envelopes and drops malformed pairs", () => {
    expect(parseCoachLogValue(null)).toBeNull();
    expect(parseCoachLogValue({ version: 2, logged: {} })).toBeNull();
    expect(parseCoachLogValue({ version: 1, logged: [] })).toBeNull();
    expect(parseCoachLogValue({ version: 1, logged: { m1: 42, m2: "e2", "": "e3" } })).toEqual({
      m2: "e2",
    });
  });
});
