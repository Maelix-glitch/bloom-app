// @vitest-environment jsdom
/**
 * HouseholdSection (audit slice B): members are compact divider rows
 * with a Remove action (no Edit exists — the store exposes add/remove
 * only), the owner's Assessment pointer is explicit, and the "Cooks
 * for everyone" preview is a count + three chips + one Browse action
 * carrying the real library count — not an eight-name list.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { resetPrefCache } from "@/lib/prefsStore";
import {
  EMPTY_HOUSEHOLD,
  addHouseholdMember,
  writeHouseholdValue,
} from "@/lib/household/household";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { HouseholdSection } from "./HouseholdSection";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

describe("HouseholdSection", () => {
  it("points the owner at the Assessment to change their own preferences", () => {
    render(<HouseholdSection />);
    expect(screen.getByText(/update your preferences in the Assessment/)).toBeTruthy();
  });

  it("renders a stored member as a compact row with a Remove action", () => {
    const withMember = addHouseholdMember(EMPTY_HOUSEHOLD, {
      name: "Amma",
      pattern: "vegetarian",
      allergies: [],
      dislikes: [],
    });
    expect(withMember).not.toBeNull();
    writeHouseholdValue(withMember!);

    const { container } = render(<HouseholdSection />);
    expect(screen.getByText("Amma")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
    const row = screen.getByText("Amma").closest(".hh-member");
    expect(row?.classList.contains("hh-member--row")).toBe(true);
    expect(container.querySelectorAll(".hh-member--row").length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the dish preview to three chips plus one Browse action with the real count", () => {
    const { container } = render(<HouseholdSection />);
    expect(container.querySelectorAll(".hh-chip").length).toBe(3);
    const browse = screen.getByRole("link", {
      name: `Browse all ${DISH_LIBRARY.length.toLocaleString("en-IN")} dishes`,
    });
    expect(browse.getAttribute("href")).toBe("/nutrition");
    expect(screen.queryByText(/more\. The Dishes tab/)).toBeNull();
  });

  it("states the count honestly for a table of one: All, and 'you', not 'everyone'", () => {
    /* No stored members and no Assessment answers: nothing is filtered
       out, and the table is the owner alone — the sentence must say
       both plainly (rulebook D-T7), with the count grouped. */
    render(<HouseholdSection />);
    expect(screen.getByText("Cooks for you")).toBeTruthy();
    expect(
      screen.getByText(`All ${DISH_LIBRARY.length.toLocaleString("en-IN")} dishes`),
    ).toBeTruthy();
    expect(screen.getByText(/suit you — your pattern from your Assessment/)).toBeTruthy();
    expect(screen.queryByText(/suit everyone at your table/)).toBeNull();
  });
});
