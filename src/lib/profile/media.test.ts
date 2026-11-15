import { describe, expect, it } from "vitest";

import {
  avatarObjectPath,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  storagePathFor,
  validateImageDimensions,
  validateImageFile,
} from "./media";

/**
 * The upload gate: everything a picked file must pass before Bloom decodes,
 * crops, or uploads it. These run on stubs shaped like Files — the validator
 * only ever reads `type`, `size`, and `name`.
 */

const file = (over: Partial<{ type: string; size: number; name: string }>): File =>
  ({ type: "image/jpeg", size: 2048, name: "photo.jpg", ...over }) as File;

describe("validateImageFile", () => {
  it("accepts the supported still-image types", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(validateImageFile(file({ type }))).toBeNull();
    }
  });

  it("rejects non-images with an honest, specific error", () => {
    expect(validateImageFile(file({ type: "application/pdf", name: "cv.pdf" }))).toMatch(
      /isn't an image/,
    );
    expect(validateImageFile(file({ type: "image/heic", name: "photo.heic" }))).toMatch(
      /isn't an image/,
    );
  });

  it("accepts an empty MIME type when the extension is a known image one", () => {
    /* Some Android pickers report no type at all; the decode is the gate. */
    expect(validateImageFile(file({ type: "", name: "IMG_2041.JPEG" }))).toBeNull();
    expect(validateImageFile(file({ type: "", name: "photo.png" }))).toBeNull();
    expect(validateImageFile(file({ type: "", name: "notes.txt" }))).toMatch(/isn't an image/);
  });

  it("enforces the byte ceiling and the empty-file floor", () => {
    expect(validateImageFile(file({ size: MAX_UPLOAD_BYTES }))).toBeNull();
    expect(validateImageFile(file({ size: MAX_UPLOAD_BYTES + 1 }))).toMatch(/too large/);
    expect(validateImageFile(file({ size: 42 }))).toMatch(/looks empty/);
  });
});

describe("validateImageDimensions", () => {
  it("accepts ordinary camera dimensions", () => {
    expect(validateImageDimensions(4032, 3024)).toBeNull();
    expect(validateImageDimensions(512, 512)).toBeNull();
  });

  it("rejects decode bombs the byte cap cannot see", () => {
    expect(validateImageDimensions(MAX_IMAGE_EDGE + 1, 100)).toMatch(/enormous/);
    /* Under the edge cap on both sides, over the pixel cap in area. */
    const side = Math.ceil(Math.sqrt(MAX_IMAGE_PIXELS)) + 1;
    expect(validateImageDimensions(side, side)).toMatch(/enormous/);
  });

  it("rejects an unreadable image", () => {
    expect(validateImageDimensions(0, 0)).toMatch(/could not be read/);
  });
});

describe("avatarObjectPath", () => {
  it("is versioned per upload, inside the user's own prefix", () => {
    const a = avatarObjectPath("user-1", 1700000000000);
    const b = avatarObjectPath("user-1", 1700000001000);
    expect(a).toBe("user-1/avatar-1700000000000.jpg");
    /* A new upload is a new URL — no cache can serve the previous photo. */
    expect(a).not.toBe(b);
    expect(a.startsWith(storagePathFor("user-1", ""))).toBe(true);
  });
});
