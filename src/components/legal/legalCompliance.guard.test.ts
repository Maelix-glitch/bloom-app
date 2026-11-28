import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Legal compliance guard (M-262 — the India legal phase, owner order
 * 2026-11-28: "clear all the legal sides from here in India").
 *
 * India's rules ask an app that hosts user content and sells subscriptions
 * to publish, where anyone can read them: a named Grievance Officer with
 * the statutory timelines (acknowledge within 24 hours, resolve within
 * 15 days — IT Rules 2021 / DPDP Act 2023), the seller's identity and
 * postal address (Consumer Protection (E-Commerce) Rules 2020), and a
 * copyright notice-and-takedown route (Copyright Act 1957 / IT Act s.79).
 * These pins keep those facts on the public legal pages: if a redesign
 * drops one, this guard fails before a user or a regulator notices.
 *
 * The accessibility statement is pinned the same way: the page must exist
 * and must be reachable from the legal footer.
 */

const SRC = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

describe("legal compliance — India (M-262)", () => {
  it("terms name the Grievance Officer, the timelines and the place of business", () => {
    const terms = read("routes/terms.tsx");
    expect(terms).toContain("Grievance Officer");
    expect(terms).toContain("Said Ali");
    expect(terms).toContain("within 24 hours");
    expect(terms).toContain("within 15 days");
    expect(terms).toContain("Varkala, Thiruvananthapuram, Kerala, India");
    /* The full home postal address is deliberately NOT published (owner
       decision 2026-11-28): name, town and the grievance email are the
       public contact; the full address lives on payment records only. */
    expect(terms).not.toContain("Raseena Manzil");
  });

  it("terms carry the copyright notice-and-takedown route", () => {
    const terms = read("routes/terms.tsx");
    expect(terms).toContain("infringes your copyright");
    expect(terms).toContain("Copyright Act, 1957");
  });

  it("privacy names the officer under the DPDP Act and states the breach duty", () => {
    const privacy = read("routes/privacy.tsx");
    expect(privacy).toContain("Grievance Officer");
    expect(privacy).toContain("DPDP Act");
    expect(privacy).toContain("Data Protection Board of India");
    expect(privacy).toContain("will not build a calorie plan for anyone under 18");
  });

  it("contact routes grievances to the named officer with the timelines", () => {
    const contact = read("routes/contact.tsx");
    expect(contact).toContain("Grievance Officer is Said Ali");
    expect(contact).toContain("within 24 hours");
    expect(contact).toContain("within 15 days");
  });

  it("the accessibility statement exists and the legal footer links it", () => {
    expect(existsSync(join(SRC, "routes/accessibility.tsx"))).toBe(true);
    const page = read("routes/accessibility.tsx");
    expect(page).toContain("reduced motion");
    expect(page).toContain("Where we know we fall short");
    const legalPage = read("components/legal/LegalPage.tsx");
    expect(legalPage).toContain('to="/accessibility"');
  });

  it("the orphan mock that loaded Google Fonts is gone", () => {
    expect(existsSync(join(SRC, "..", "public/bloom/bloom-add-habit-modal-v3-latest.html"))).toBe(
      false,
    );
  });
});
