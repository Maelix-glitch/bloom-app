// @vitest-environment jsdom
/**
 * Condition Modes honesty (senior diagnosis M-28): the thyroid-aware
 * mode is information-only BY DESIGN — Bloom's food data carries no
 * iodine or selenium, so the mode can check nothing. It must not
 * present a live switch: it renders disabled and off, badged
 * "Not available yet", with the line naming the missing data — even
 * when an older stored prefs value claims it is on. The working modes
 * keep their live switches.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeModes } from "@/lib/modes/modes";
import { resetPrefCache } from "@/lib/prefsStore";
import { ModesSection } from "./ModesSection";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

describe("ModesSection", () => {
  it("renders the thyroid mode as unavailable — disabled switch, badge, reason", () => {
    render(<ModesSection />);
    const thyroid = screen.getByRole("switch", { name: /Thyroid aware/ });
    expect(thyroid.getAttribute("data-disabled")).not.toBeNull();
    expect(thyroid.getAttribute("data-state")).toBe("unchecked");
    expect(screen.getByText("Not available yet")).toBeTruthy();
    expect(screen.getByText(/iodine or selenium/)).toBeTruthy();
  });

  it("keeps the working modes' switches live", () => {
    render(<ModesSection />);
    const sugar = screen.getByRole("switch", { name: "Blood-sugar aware mode" });
    expect(sugar.getAttribute("data-disabled")).toBeNull();
    const pressure = screen.getByRole("switch", { name: "Blood-pressure aware mode" });
    expect(pressure.getAttribute("data-disabled")).toBeNull();
  });

  it("rules render as chips and every filtering mode states its effect, on or off", () => {
    const { container } = render(<ModesSection />);
    /* The rule data as chips (anti-document slice 4, M-68). */
    expect(screen.getByText("Added sugar")).toBeTruthy();
    expect(screen.getByText("Carbs > 75 g")).toBeTruthy();
    expect(screen.getByText("Sodium > 800 mg")).toBeTruthy();
    /* Both filtering modes carry the "Would hide N of 1,202 dishes"
       footer while OFF — the effect is a fact about the rules and
       the library, not about the switch. (The count is a <strong>
       inside the footer line, so match on the footers' full text.) */
    const footers = [...container.querySelectorAll(".tile__foot")].map((f) => f.textContent ?? "");
    expect(footers.filter((t) => /Would hide [\d,]+ of [\d,]+ dishes/.test(t))).toHaveLength(2);
  });

  it("a stored 'thyroid on' still renders disabled and off — the display never lies", () => {
    writeModes(["thyroid"]);
    resetPrefCache();
    render(<ModesSection />);
    const thyroid = screen.getByRole("switch", { name: /Thyroid aware/ });
    expect(thyroid.getAttribute("data-disabled")).not.toBeNull();
    expect(thyroid.getAttribute("data-state")).toBe("unchecked");
  });
});
