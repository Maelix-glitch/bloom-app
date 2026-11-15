/**
 * Publish-time inline-photo resolution.
 *
 * Canvas photos used to be stored as the data URLs the editor produced —
 * up to ~900k characters of base64 per photo inside the story row, decoded
 * from scratch on every view. createStory now uploads each unique inline
 * payload to storage and stores its https URL instead. These tests pin the
 * pure pieces of that swap: decoding, collecting and replacing.
 */

import { describe, expect, it } from "vitest";

import {
  dataUrlToBlob,
  inlinePhotoSrcs,
  replaceCanvasPhotoSrc,
  replaceInlinePhotoSrcs,
} from "./storyService";
import { makePhotoElement, makeTextElement } from "@/lib/stories/elements";
import { photoBackground, solidBackground } from "@/lib/stories/canvas/backgrounds";
import type { StoryElement } from "@/lib/stories/types";

const JPEG_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";
const STORED_URL = "https://storage.test/u/stories/el-1.jpg";

describe("dataUrlToBlob", () => {
  it("decodes a base64 image payload with its mime type", async () => {
    const blob = dataUrlToBlob(JPEG_DATA_URL);
    expect(blob).not.toBeNull();
    expect(blob!.type).toBe("image/jpeg");
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
  });

  it("decodes a plain (non-base64) data URL", async () => {
    const blob = dataUrlToBlob("data:text/plain,hello%20bloom");
    expect(blob!.type).toBe("text/plain");
    expect(await blob!.text()).toBe("hello bloom");
  });

  it("returns null for anything that is not a data URL", () => {
    expect(dataUrlToBlob("https://storage.test/x.jpg")).toBeNull();
    expect(dataUrlToBlob("")).toBeNull();
    expect(dataUrlToBlob("data:image/png;base64,!!!not-base64!!!")).toBeNull();
  });
});

describe("inline photo collection and replacement", () => {
  const photo = (src: string): StoryElement => ({ ...makePhotoElement({}), src });
  const elements: StoryElement[] = [
    photo(JPEG_DATA_URL),
    makeTextElement("a caption", {}),
    photo(STORED_URL),
    photo(PNG_DATA_URL),
    photo(JPEG_DATA_URL),
  ];

  it("collects only inline photo payloads, in order, duplicates included", () => {
    expect(inlinePhotoSrcs(elements)).toEqual([JPEG_DATA_URL, PNG_DATA_URL, JPEG_DATA_URL]);
  });

  it("replaces resolved srcs and leaves everything else untouched", () => {
    const urls = new Map([
      [JPEG_DATA_URL, "https://storage.test/u/stories/el-1.jpg"],
      [PNG_DATA_URL, "https://storage.test/u/stories/el-2.png"],
    ]);
    const out = replaceInlinePhotoSrcs(elements, urls);
    const srcs = out.map((el) => (el.kind === "photo" ? el.src : el.kind));
    expect(srcs).toEqual([
      "https://storage.test/u/stories/el-1.jpg",
      "text",
      STORED_URL,
      "https://storage.test/u/stories/el-2.png",
      "https://storage.test/u/stories/el-1.jpg",
    ]);
    // The input is not mutated — the editor keeps its own copy.
    expect(elements[0]).toMatchObject({ src: JPEG_DATA_URL });
  });

  it("swaps a background photo layer the same way", () => {
    const bg = photoBackground(JPEG_DATA_URL, "#ECE8E1");
    const urls = new Map([[JPEG_DATA_URL, STORED_URL]]);
    const out = replaceCanvasPhotoSrc(bg, urls);
    expect(out?.photo?.src).toBe(STORED_URL);
    expect(bg.photo?.src).toBe(JPEG_DATA_URL);
  });

  it("leaves a photoless or unresolved canvas alone", () => {
    const flat = solidBackground("#0A0B0E", "#ECE8E1");
    expect(replaceCanvasPhotoSrc(flat, new Map())).toBe(flat);
    expect(replaceCanvasPhotoSrc(null, new Map())).toBeNull();
    const bg = photoBackground(JPEG_DATA_URL, "#ECE8E1");
    expect(replaceCanvasPhotoSrc(bg, new Map())).toBe(bg);
  });
});
