// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * MemberBadges — the pills beside the verified tick (M-209). The
 * component is a pure rendering of the derived list from
 * lib/profile/badges: it holds no truth of its own, so these pins are
 * about the rendering contract every surface relies on:
 *
 *   · An empty list renders NOTHING — no empty shell, no placeholder.
 *   · Each held badge renders once, labelled exactly Founder /
 *     Trainer / Tester, in the derivation's order.
 *   · The small size is the same pills, tighter — used where space is
 *     tight (search rows, the rail).
 */

import { MemberBadges } from "./MemberBadges";
import { memberBadgesOf } from "@/lib/profile/badges";

afterEach(() => cleanup());

describe("MemberBadges", () => {
  it("renders nothing for a member with no badges", () => {
    const { container } = render(
      <MemberBadges badges={memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: [] })} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("member-badges")).toBeNull();
  });

  it("renders the held badges labelled, in founder → trainer → tester order", () => {
    render(
      <MemberBadges
        badges={memberBadgesOf({ hasTrainerRow: true, memberBadgeKinds: ["tester", "founder"] })}
      />,
    );
    const pills = screen.getByTestId("member-badges").querySelectorAll("[data-badge]");
    expect([...pills].map((p) => p.getAttribute("data-badge"))).toEqual([
      "founder",
      "trainer",
      "tester",
    ]);
    expect([...pills].map((p) => p.textContent)).toEqual(["Founder", "Trainer", "Tester"]);
  });

  it("renders a single badge on its own", () => {
    render(
      <MemberBadges badges={memberBadgesOf({ hasTrainerRow: true, memberBadgeKinds: [] })} />,
    );
    expect(screen.getByText("Trainer")).toBeTruthy();
    expect(screen.queryByText("Founder")).toBeNull();
    expect(screen.queryByText("Tester")).toBeNull();
  });

  it("marks the small size on the group", () => {
    render(
      <MemberBadges
        badges={memberBadgesOf({ hasTrainerRow: false, memberBadgeKinds: ["founder"] })}
        size="sm"
      />,
    );
    expect(screen.getByTestId("member-badges").className).toContain("mb-badges--sm");
  });
});
