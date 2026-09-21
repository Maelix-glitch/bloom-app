// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The overlay's contract, as far as a DOM can prove it:
 *
 *   · it paints the highlight from the target's real rect (the frame loop ran,
 *     geometry reached the DOM — not React state, not a 300ms timer);
 *   · the hole wears the target's own corner radius;
 *   · a step whose control never appears moves the tour on by itself instead of
 *     parking on a warning card;
 *   · Esc closes, the arrow keys travel.
 */

import { TourOverlay } from "./TourOverlay";
import type { TourStep } from "@/lib/tour/types";

const STEP: TourStep = {
  id: "s-1",
  target: "demo-target",
  title: "Today — your home base",
  body: "This is where your day lands.",
  tip: "Open Bloom here first thing.",
  good: "Check Today morning and evening.",
  bad: "Don't treat it like a feed.",
};

const rectOf = (x: number, y: number, width: number, height: number) =>
  ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  }) as DOMRect;

function mountTarget(rect: DOMRect, radius = "999px") {
  const el = document.createElement("button");
  el.setAttribute("data-tour", STEP.target);
  el.getBoundingClientRect = () => rect;
  el.scrollIntoView = () => {};
  document.body.appendChild(el);
  window.getComputedStyle = ((node: Element) => {
    if (node === el) {
      return { borderTopLeftRadius: radius } as unknown as CSSStyleDeclaration;
    }
    return {} as CSSStyleDeclaration;
  }) as typeof window.getComputedStyle;
  return el;
}

function mount(props: Partial<Parameters<typeof TourOverlay>[0]> = {}) {
  const handlers = {
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onSkip: vi.fn(),
    onClose: vi.fn(),
  };
  const view = render(
    <TourOverlay step={STEP} index={0} total={3} direction={1} {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1440, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 900, writable: true });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("TourOverlay", () => {
  it("shows the step's copy", () => {
    mountTarget(rectOf(40, 300, 220, 56));
    mount();
    expect(screen.getByText("Today — your home base")).toBeTruthy();
    expect(screen.getByText(/Open Bloom here first thing/)).toBeTruthy();
  });

  it("paints the highlight from the target's rect, wearing its radius", async () => {
    mountTarget(rectOf(40, 300, 220, 56), "16px");
    const { container } = mount();

    await waitFor(() => {
      const veil = container.querySelector<HTMLElement>(".tour-veil");
      expect(veil?.style.width).toBe("240px"); // 220 + 2 × 10px of air
      expect(veil?.style.height).toBe("76px");
      expect(veil?.style.borderRadius).toBe("26px"); // the target's 16 + the pad
      expect(veil?.style.transform).toContain("translate3d(30px, 290px");
      expect(veil?.classList.contains("is-up")).toBe(true);
    });
  });

  it("keeps the highlight glued to the target while the page moves", async () => {
    const rect = rectOf(40, 300, 220, 56);
    mountTarget(rect);
    const { container } = mount();
    const veil = () => container.querySelector<HTMLElement>(".tour-veil")!;

    await waitFor(() => expect(veil().style.width).toBe("240px"));

    /* Let the step's own glide window close first: a scroll *the person*
       starts must pin the hole to the element, not chase it with a spring. */
    await new Promise((resolve) => setTimeout(resolve, 950));

    const moved = rectOf(40, 180, 220, 56);
    (document.querySelector("[data-tour]") as HTMLElement).getBoundingClientRect = () => moved;
    window.dispatchEvent(new Event("scroll"));

    await waitFor(() => expect(veil().style.transform).toBe("translate3d(30px, 170px, 0)"));
    void rect;
  });

  it("moves the tour on when the control never appears", async () => {
    const { onNext } = mount(); // no target in the document at all
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1), { timeout: 3_000 });
  }, 8_000);

  it("travels with the keys and leaves on Escape", async () => {
    mountTarget(rectOf(40, 300, 220, 56));
    const { onNext, onPrev, onClose } = mount();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(onNext).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(onPrev).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes focus into the card, so the tour can be walked without a mouse", async () => {
    mountTarget(rectOf(40, 300, 220, 56));
    mount();
    await waitFor(() => {
      const card = document.querySelector<HTMLElement>("[data-tour-card]");
      expect(card).toBeTruthy();
      expect(card?.contains(document.activeElement)).toBe(true);
    });
  });
});
