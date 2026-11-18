// @vitest-environment jsdom
/**
 * Trust & security — the evidence block under the claims list.
 *
 * Pinned here: the expanded view shows one row per recommendation in
 * the evidence catalogue, the row's line is the registry claim's own
 * statement, and the state wording follows the registry's reported
 * state — the component holds no copy of either, so the surface cannot
 * drift from (or flatter) the ledger.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CATALOG } from "@/lib/vitalis/evidence/catalog";
import { evidenceCoverage } from "@/lib/vitalis/evidence/registry";

import { TrustSection } from "./TrustSection";

describe("TrustSection — evidence coverage block", () => {
  it("renders every registry recommendation with its statement and state", () => {
    render(<TrustSection />);
    fireEvent.click(screen.getByTestId("pf-row-trust"));

    const block = screen.getByTestId("pf-evidence-detail");
    const rows = evidenceCoverage(CATALOG);
    expect(rows.length).toBe(CATALOG.recommendations.length);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(block.textContent).toContain(row.statement);
    }
    // The two states the catalogue actually contains today, worded as
    // the component words them — both must appear, so neither the ready
    // rules nor the honest drafts can silently vanish from the surface.
    expect(block.textContent).toContain("Checked against its source");
    expect(block.textContent).toContain("Recorded honestly");
  });
});
