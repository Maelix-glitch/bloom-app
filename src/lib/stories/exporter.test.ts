// @vitest-environment jsdom
/**
 * Exporter tests. jsdom has no real 2d context, so the context is a recorder:
 * every call is logged, which is enough to prove the paint order, that hidden
 * layers are skipped and that each element kind actually reaches the painter.
 * Pixel fidelity is manual QA — this is the wiring.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXPORT_HEIGHT, EXPORT_WIDTH, exportStory, clearExportCache } from "./exporter";
import { makePhotoElement, makeShapeElement, makeTextElement, makeDataElement } from "./elements";
import { solidBackground } from "./canvas/backgrounds";

interface Call {
  name: string;
  args: unknown[];
}

function makeCtx(log: Call[]): CanvasRenderingContext2D {
  const noop = () => undefined;
  const target: Record<string, unknown> = {
    canvas: null,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    filter: "none",
    lineCap: "butt",
    lineJoin: "miter",
    shadowColor: "rgba(0,0,0,0)",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    rect: noop,
    roundRect: noop,
    ellipse: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    setLineDash: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    measureText: (s: string) => ({ width: s.length * 8 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop,
    drawImage: noop,
    fillText: noop,
    strokeText: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
  };
  return new Proxy(target, {
    get(t, prop: string) {
      const value = t[prop];
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          log.push({ name: prop, args });
          return (value as (...a: unknown[]) => unknown)(...args);
        };
      }
      return value;
    },
    set(t, prop: string, value: unknown) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

let log: Call[] = [];
let created: { width: number; height: number } | null = null;

beforeEach(() => {
  log = [];
  created = null;
  clearExportCache();
  // jsdom ships no Path2D; every browser that can give us a 2d context does.
  if (typeof globalThis.Path2D === "undefined") {
    vi.stubGlobal("Path2D", class Path2D {});
  }
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    if (tag !== "canvas") return document.createElement.call(document, tag);
    const node = {
      width: 0,
      height: 0,
      getContext: () => makeCtx(log),
      toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type: "image/png" })),
    };
    created = node;
    return node as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
  vi.stubGlobal("URL", { createObjectURL: () => "blob:mock" });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const loadStub = async () => {
  const img = { naturalWidth: 800, naturalHeight: 600, width: 800, height: 600 };
  return img as unknown as HTMLImageElement;
};

describe("exportStory", () => {
  it("renders at 1080×1920", async () => {
    await exportStory({
      elements: [],
      background: solidBackground("#221D33"),
      loadImage: loadStub,
    });
    expect(created).not.toBeNull();
    expect(created!.width).toBe(EXPORT_WIDTH);
    expect(created!.height).toBe(EXPORT_HEIGHT);
    expect(EXPORT_HEIGHT / EXPORT_WIDTH).toBeCloseTo(16 / 9, 6);
  });

  it("paints the background before any layer", async () => {
    await exportStory({
      elements: [makeTextElement("Hello", { preset: "editorial", color: "#fff", z: 1 })],
      background: solidBackground("#221D33"),
      loadImage: loadStub,
    });
    const firstFill = log.findIndex((c) => c.name === "fillRect");
    const firstText = log.findIndex((c) => c.name === "fillText");
    expect(firstFill).toBeGreaterThanOrEqual(0);
    expect(firstText).toBeGreaterThan(firstFill);
  });

  it("paints every visible kind and skips hidden layers", async () => {
    const text = makeTextElement("Layer one", { preset: "editorial", color: "#fff", z: 3 });
    const photo = makePhotoElement({ x: 0.5, y: 0.5, w: 0.5, h: 0.3, z: 1, mask: "arch" });
    const shape = makeShapeElement("heart", {
      x: 0.5,
      y: 0.2,
      w: 0.2,
      h: 0.2,
      z: 2,
      fill: "#E0A3B8",
    })!;
    const data = makeDataElement("sleep", {
      x: 0.5,
      y: 0.8,
      z: 4,
      variant: "ring",
      accent: "#EED9A4",
    })!;
    const hidden = makeTextElement("Never painted", {
      preset: "editorial",
      color: "#fff",
      z: 5,
      visible: false,
    });

    await exportStory({
      elements: [text, { ...photo, src: "data:image/png;base64,AAA" }, shape, data, hidden],
      background: solidBackground("#221D33"),
      data: null,
      loadImage: loadStub,
    });

    const painted = log.filter((c) => c.name === "fillText").map((c) => String(c.args[0]));
    expect(painted).toContain("Layer one");
    expect(painted.join(" ")).not.toContain("Never painted");
    // the photo clip and the shape path both ran
    expect(log.some((c) => c.name === "clip")).toBe(true);
    expect(log.some((c) => c.name === "drawImage")).toBe(true);
  });

  it("paints in z order, not array order", async () => {
    const late = makeTextElement("PAINTED-LAST", { preset: "editorial", color: "#fff", z: 9 });
    const early = makeTextElement("PAINTED-FIRST", { preset: "editorial", color: "#fff", z: 1 });

    await exportStory({
      elements: [late, early],
      background: solidBackground("#221D33"),
      loadImage: loadStub,
    });

    const order = log
      .filter((c) => c.name === "fillText")
      .map((c) => String(c.args[0]))
      .filter((t) => t.startsWith("PAINTED-"));
    expect(order).toEqual(["PAINTED-FIRST", "PAINTED-LAST"]);
  });

  it("survives a photo that fails to load", async () => {
    const photo = makePhotoElement({ x: 0.5, y: 0.5, w: 0.5, h: 0.3, z: 1 });
    const text = makeTextElement("Still here", { preset: "editorial", color: "#fff", z: 2 });

    const result = await exportStory({
      elements: [{ ...photo, src: "https://example.invalid/broken.png" }, text],
      background: solidBackground("#221D33"),
      loadImage: async () => {
        throw new Error("nope");
      },
    });

    expect(result.blob.size).toBeGreaterThan(0);
    const painted = log.filter((c) => c.name === "fillText").map((c) => String(c.args[0]));
    expect(painted).toContain("Still here");
  });

  it("prints an honest empty state instead of a made-up reading", async () => {
    const data = makeDataElement("water", {
      x: 0.5,
      y: 0.5,
      z: 1,
      variant: "card",
      accent: "#9FB6CF",
      hideWhenEmpty: false,
    })!;

    await exportStory({
      elements: [data],
      background: solidBackground("#221D33"),
      data: null,
      loadImage: loadStub,
    });

    const painted = log.filter((c) => c.name === "fillText").map((c) => String(c.args[0]));
    expect(painted.join(" ")).toContain("Nothing logged yet");
  });

  it("hides the widget entirely when the author asked it to", async () => {
    const data = makeDataElement("water", {
      x: 0.5,
      y: 0.5,
      z: 1,
      variant: "card",
      accent: "#9FB6CF",
      hideWhenEmpty: true,
    })!;

    await exportStory({
      elements: [data],
      background: solidBackground("#221D33"),
      data: null,
      loadImage: loadStub,
    });

    const painted = log.filter((c) => c.name === "fillText").map((c) => String(c.args[0]));
    expect(painted).toHaveLength(0);
  });
});
