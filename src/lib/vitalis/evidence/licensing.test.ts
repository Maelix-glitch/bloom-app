import { describe, expect, it } from "vitest";

import {
  LICENSE_TERMS,
  attributionFor,
  blockedByPermissionOnly,
  isLicenseId,
  licenseIssues,
  productUseAllowed,
  termsOf,
} from "./licensing";

describe("licence registry", () => {
  it("allows product use only for the permissive licences", () => {
    expect(productUseAllowed("us-public-domain")).toBe(true);
    expect(productUseAllowed("cc0-1.0")).toBe(true);
    expect(productUseAllowed("cc-by-4.0")).toBe(true);

    expect(productUseAllowed("fao-noncommercial")).toBe(false);
    expect(productUseAllowed("nin-copyright-restricted")).toBe(false);
    expect(productUseAllowed("proprietary-permission-required")).toBe(false);
    expect(productUseAllowed("unknown")).toBe(false);
  });

  it("fails closed on a licence it does not recognise", () => {
    expect(isLicenseId("cc-by-sa-4.0")).toBe(false);
    expect(termsOf("cc-by-sa-4.0")).toBe(LICENSE_TERMS.unknown);
    expect(productUseAllowed("cc-by-sa-4.0")).toBe(false);
  });

  it("distinguishes permission-required from outright prohibition", () => {
    // FAO permits non-commercial use: the only obstacle is written permission.
    expect(blockedByPermissionOnly("fao-noncommercial")).toBe(true);
    // NIN forbids electronic storage for a product even with acknowledgement.
    expect(blockedByPermissionOnly("nin-copyright-restricted")).toBe(false);
    expect(termsOf("nin-copyright-restricted").redistributable).toBe(false);
  });

  it("reports a stored flag that claims more permission than the licence grants", () => {
    const overstated = {
      id: "ifct-2017",
      license: "nin-copyright-restricted",
      productUseAllowed: true,
      permissionRequired: false,
      licenseNote:
        "Copyright National Institute of Nutrition; permission required for product use.",
    };
    const issues = licenseIssues(overstated);
    expect(issues).toHaveLength(2);
    expect(issues.join(" ")).toContain("productUseAllowed is true");
    expect(issues.join(" ")).toContain("permissionRequired is false");
  });

  it("requires the note to state what the terms actually say", () => {
    const thin = {
      id: "example",
      license: "cc0-1.0",
      productUseAllowed: true,
      permissionRequired: false,
      licenseNote: "public domain",
    };
    expect(licenseIssues(thin).join(" ")).toContain("must state what the terms actually say");
  });

  it("accepts a correctly recorded restricted source", () => {
    expect(
      licenseIssues({
        id: "fao-2004",
        license: "fao-noncommercial",
        productUseAllowed: false,
        permissionRequired: true,
        licenseNote: "FAO copyright; commercial reuse requires written permission.",
      }),
    ).toEqual([]);
  });

  it("builds an attribution line a reader can act on", () => {
    const line = attributionFor({
      authors: ["World Health Organization"],
      publisher: "WHO",
      title: "Guideline",
      publicationYear: 2024,
      url: "https://example.org/guideline",
    });
    expect(line).toBe(
      "World Health Organization (2024). Guideline. WHO. https://example.org/guideline",
    );
  });
});
