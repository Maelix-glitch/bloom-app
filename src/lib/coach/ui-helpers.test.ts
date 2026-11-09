import { describe, expect, it } from "vitest";

import { attachmentDisplayName, savedDateLabel } from "./ui-helpers";

describe("savedDateLabel", () => {
  it("renders a human date, never the raw ISO string", () => {
    const label = savedDateLabel("2026-11-09T18:09:35.459Z");
    /* Locale-ordered ("9 Nov 2026" or "Nov 9, 2026"); the day may shift by
       one across the UTC midnight depending on the reader's timezone. */
    expect(label).toMatch(/(9|10) Nov 2026|Nov (9|10), 2026/);
    expect(label).not.toContain("T18:09");
  });

  it("renders nothing for missing or unparseable input", () => {
    expect(savedDateLabel(undefined)).toBe("");
    expect(savedDateLabel("not a date")).toBe("");
  });
});

describe("attachmentDisplayName", () => {
  it("keeps the person's own filenames", () => {
    expect(attachmentDisplayName("thali-at-home.jpg", "image/jpeg")).toBe("thali-at-home.jpg");
    expect(attachmentDisplayName("lab-results.pdf", "application/pdf")).toBe("lab-results.pdf");
  });

  it("replaces pipeline-generated names with what the file is", () => {
    expect(attachmentDisplayName("media-generation-coach-food-thali.png", "image/png")).toBe(
      "Photo",
    );
    expect(attachmentDisplayName("generated-voice-123.m4a", "audio/mp4")).toBe("Voice note");
    expect(attachmentDisplayName("", "application/pdf")).toBe("File");
  });
});
