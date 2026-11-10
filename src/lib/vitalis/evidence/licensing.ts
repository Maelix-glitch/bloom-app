/**
 * Licence registry for scientific sources.
 *
 * This exists because the alternative — assuming "it's published by a government
 * body, so it's fine" — is wrong often enough to matter. Two of the sources this
 * phase looked at are Indian government publications that explicitly forbid
 * storing their data in an electronic product without written permission, while
 * two US federal publications are public domain.
 *
 * So a source carries two independent facts:
 *
 *   authority  — should we believe it? (`authority.ts`)
 *   licence    — may we ship it?    (here)
 *
 * A source can be tier A and still be unusable. `productUseAllowed` is what
 * gates a claim from reaching a shipped surface, and it is derived from the
 * licence rather than typed by hand, so it cannot drift from the terms.
 */

export const LICENSE_IDS = [
  "us-public-domain",
  "cc0-1.0",
  "cc-by-4.0",
  "fao-noncommercial",
  "nin-copyright-restricted",
  "proprietary-permission-required",
  "unknown",
] as const;

export type LicenseId = (typeof LICENSE_IDS)[number];

export interface LicenseTerms {
  readonly id: LicenseId;
  readonly label: string;
  readonly url: string | null;
  /** May the data be reproduced inside a distributed product at all? */
  readonly redistributable: boolean;
  /** May it be used in a commercial product without further permission? */
  readonly commercialUse: boolean;
  /** Must written permission be obtained before product use? */
  readonly permissionRequired: boolean;
  readonly attributionRequired: boolean;
  readonly note: string;
}

/**
 * Terms as they were read from each publisher, recorded rather than inferred.
 * `note` is the summary a reviewer checks against; the source row carries the
 * same statement so the two can be compared.
 */
export const LICENSE_TERMS: Record<LicenseId, LicenseTerms> = {
  "us-public-domain": {
    id: "us-public-domain",
    label: "U.S. public domain",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    redistributable: true,
    commercialUse: true,
    permissionRequired: false,
    attributionRequired: false,
    note: "A work of the U.S. federal government: not subject to domestic copyright.",
  },
  "cc0-1.0": {
    id: "cc0-1.0",
    label: "CC0 1.0 Universal",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    redistributable: true,
    commercialUse: true,
    permissionRequired: false,
    attributionRequired: false,
    note: "Dedicated to the public domain; attribution is requested but not required.",
  },
  "cc-by-4.0": {
    id: "cc-by-4.0",
    label: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    redistributable: true,
    commercialUse: true,
    permissionRequired: false,
    attributionRequired: true,
    note: "Reusable, including commercially, provided the source is attributed.",
  },
  "fao-noncommercial": {
    id: "fao-noncommercial",
    label: "FAO — non-commercial reuse only",
    url: "https://www.fao.org/contact-us/terms/en",
    redistributable: true,
    commercialUse: false,
    permissionRequired: true,
    attributionRequired: true,
    note: "Reproduction for educational or other non-commercial purposes is authorised with full acknowledgement; resale or other commercial use needs written permission.",
  },
  "nin-copyright-restricted": {
    id: "nin-copyright-restricted",
    label: "ICMR-NIN copyright — product use needs permission",
    url: "https://www.nin.res.in/",
    redistributable: false,
    commercialUse: false,
    permissionRequired: true,
    attributionRequired: true,
    note: "© National Institute of Nutrition. Use and dissemination is encouraged and personal reproduction is allowed with acknowledgement, but no part may be stored or reproduced in electronic form to create a product without prior written permission.",
  },
  "proprietary-permission-required": {
    id: "proprietary-permission-required",
    label: "Proprietary — permission required",
    url: null,
    redistributable: false,
    commercialUse: false,
    permissionRequired: true,
    attributionRequired: true,
    note: "No reuse right has been granted; written permission is a precondition for any use.",
  },
  unknown: {
    id: "unknown",
    label: "Unknown",
    url: null,
    redistributable: false,
    commercialUse: false,
    permissionRequired: true,
    attributionRequired: true,
    note: "Terms have not been established. Treated as unusable until they are.",
  },
};

export function isLicenseId(value: unknown): value is LicenseId {
  return typeof value === "string" && (LICENSE_IDS as readonly string[]).includes(value);
}

/**
 * Fails closed: an unrecognised licence is not treated as permissive.
 *
 * This is the single place the product-use decision is made, so a typo in a
 * source row cannot accidentally license something we may not ship.
 */
export function termsOf(license: string): LicenseTerms {
  return isLicenseId(license) ? LICENSE_TERMS[license] : LICENSE_TERMS.unknown;
}

export function productUseAllowed(license: string): boolean {
  const terms = termsOf(license);
  return terms.redistributable && terms.commercialUse && !terms.permissionRequired;
}

export function attributionRequired(license: string): boolean {
  return termsOf(license).attributionRequired;
}

/** True when the only thing standing between us and use is written permission. */
export function blockedByPermissionOnly(license: string): boolean {
  const terms = termsOf(license);
  return terms.permissionRequired && terms.redistributable && !terms.commercialUse;
}

/**
 * Problems with a source's licence fields. Compares the stored
 * `productUseAllowed` against the licence, so a hand-edited row that claims
 * more permission than its licence grants is reported instead of honoured.
 */
export function licenseIssues(source: {
  readonly id: string;
  readonly license: string;
  readonly productUseAllowed: boolean;
  readonly permissionRequired: boolean;
  readonly licenseNote: string;
}): string[] {
  const issues: string[] = [];
  if (!isLicenseId(source.license)) {
    issues.push(`${source.id}: unknown licence "${source.license}"`);
    return issues;
  }
  const terms = LICENSE_TERMS[source.license];
  const allowed = productUseAllowed(source.license);
  if (source.productUseAllowed !== allowed) {
    issues.push(
      `${source.id}: productUseAllowed is ${source.productUseAllowed} but licence ${terms.id} gives ${allowed}`,
    );
  }
  if (source.permissionRequired !== terms.permissionRequired) {
    issues.push(
      `${source.id}: permissionRequired is ${source.permissionRequired} but licence ${terms.id} requires ${terms.permissionRequired}`,
    );
  }
  if (source.licenseNote.trim().length < 20) {
    issues.push(`${source.id}: licenseNote must state what the terms actually say`);
  }
  if (terms.attributionRequired && source.licenseNote.trim().length === 0) {
    issues.push(`${source.id}: licence requires attribution, so the note must say so`);
  }
  return issues;
}

/** Human-readable attribution line, for anywhere a claim is shown. */
export function attributionFor(source: {
  readonly authors: readonly string[];
  readonly publisher: string;
  readonly title: string;
  readonly publicationYear: number;
  readonly url: string;
}): string {
  const who = source.authors.length > 0 ? source.authors.join(", ") : source.publisher;
  return `${who} (${source.publicationYear}). ${source.title}. ${source.publisher}. ${source.url}`;
}
