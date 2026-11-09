// @vitest-environment jsdom
/**
 * The points toast's contract (PR #59): a POINTS_EARNED ledger event
 * becomes exactly one bespoke card — gold disc, amount, the earner's
 * label — wearing the shared toast shell, while its sonner wrapper is
 * stripped so the shell never double-paints. Silent for zero/negative
 * awards and on the Journey page, whose claim float owns the moment.
 */

import type { ReactElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ custom: vi.fn() }));

vi.mock("sonner", () => ({ toast: { custom: mocks.custom } }));

import { TOAST_SHELL_STYLE } from "@/components/system/toastShell";
import { POINTS_EARNED } from "@/lib/points/ledger";
import { PointsAwardToast } from "./PointsAwardToast";

function earned(points: unknown, label?: unknown) {
  window.dispatchEvent(new CustomEvent(POINTS_EARNED, { detail: { points, label } }));
}

beforeEach(() => {
  mocks.custom.mockReset();
  window.history.pushState({}, "", "/");
});

afterEach(cleanup);

describe("PointsAwardToast", () => {
  it("turns an earning into one card with the amount, the label and the shared shell", () => {
    render(<PointsAwardToast />);
    earned(30, "Drink water");
    expect(mocks.custom).toHaveBeenCalledTimes(1);
    const [renderCard, options] = mocks.custom.mock.calls[0] as [
      () => ReactElement,
      { duration: number; style: Record<string, unknown> },
    ];
    const card = render(renderCard());
    expect(card.getByText("+30 Bloom Points")).toBeTruthy();
    expect(card.getByText("Drink water")).toBeTruthy();
    const shell = card.container.firstElementChild as HTMLElement;
    expect(shell.style["background"]).toBe(TOAST_SHELL_STYLE["background"]);
    expect(shell.style.borderRadius).toBe("24px");
    /* The wrapper is stripped to nothing — the card wears the shell. */
    expect(options.style["background"]).toBe("transparent");
    expect(options.style["boxShadow"]).toBe("none");
    expect(options.duration).toBe(2600);
  });

  it("stays silent for a zero award", () => {
    render(<PointsAwardToast />);
    earned(0, "Nothing");
    expect(mocks.custom).not.toHaveBeenCalled();
  });

  it("stays silent on the Journey page, where the claim float owns the moment", () => {
    window.history.pushState({}, "", "/rewards");
    render(<PointsAwardToast />);
    earned(50, "Goal complete");
    expect(mocks.custom).not.toHaveBeenCalled();
  });

  it("omits the label line when the event carries none", () => {
    render(<PointsAwardToast />);
    earned(10);
    const [renderCard] = mocks.custom.mock.calls[0] as [() => ReactElement];
    const card = render(renderCard());
    expect(card.getByText("+10 Bloom Points")).toBeTruthy();
    expect(card.container.querySelectorAll("span")).toHaveLength(3); // disc, text column, amount
  });
});
