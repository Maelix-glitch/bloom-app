// @vitest-environment jsdom
/**
 * Trust & security — the Profile Privacy row that renders the claims
 * registry. Pinned here:
 *   · the row renders every claim from `src/lib/trust/claims`, in order,
 *     each with the surface that backs it — the component holds no copy
 *     of the words, so the UI cannot drift from the verified registry;
 *   · collapsed by default, like the consent row beside it.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TRUST_CLAIMS } from "@/lib/trust/claims";

import { TrustSection } from "./TrustSection";

describe("TrustSection", () => {
  it("is collapsed by default and expands to the registry's claims", () => {
    render(<TrustSection />);
    expect(screen.getByTestId("pf-row-trust")).toBeTruthy();
    expect(screen.queryByTestId("pf-trust-detail")).toBeNull();

    fireEvent.click(screen.getByTestId("pf-row-trust"));

    const detail = screen.getByTestId("pf-trust-detail");
    for (const claim of TRUST_CLAIMS) {
      expect(detail.textContent).toContain(claim.line);
      expect(detail.textContent).toContain(claim.surface);
    }
    /* One list item per claim — no more, no fewer. */
    expect(detail.querySelectorAll("li")).toHaveLength(TRUST_CLAIMS.length);
  });
});
