/**
 * The evidence catalogue — small, and every entry checked.
 *
 * Deliberately tiny. Two sources with verified licensing and a locator are worth
 * more than a thousand imported rows nobody can defend, and this phase's brief
 * asks for a carefully verified collection rather than a large one.
 *
 * Every bibliographic fact below was read from the publisher's own page or PDF
 * on 2026-11-05, and `locator` on each citation says where in the source the
 * claim can be found. If a reviewer cannot follow a locator, that row is wrong.
 *
 * What the licensing investigation found, and why it shaped this file:
 *
 *   • USDA FoodData Central — CC0 1.0, public domain. Usable.
 *   • Dietary Guidelines for Americans (HHS/USDA) — US federal work, public
 *     domain. Usable, with the publisher's request that altered content not be
 *     attributed back to them.
 *   • FAO/WHO/UNU Human Energy Requirements (2004) — FAO copyright. Non-
 *     commercial reuse is authorised with acknowledgement; resale or other
 *     commercial use needs written permission. Recorded, not used.
 *   • ICMR-NIN Dietary Guidelines for Indians (2024) and Indian Food
 *     Composition Tables (2017) — © National Institute of Nutrition. Both permit
 *     personal reproduction with acknowledgement but forbid storing or
 *     reproducing the material in electronic form to create a product without
 *     prior written permission. Not usable, and the IFCT dataset in particular
 *     must not be imported until that permission exists in writing.
 *
 * So the only claim that is product-ready today rests on the US public-domain
 * guidelines. That is the honest state of this registry, and the tests assert it
 * rather than a more flattering picture.
 */

import type { EvidenceRegistry } from "./types";

const RETRIEVED = "2026-11-05";

export const CATALOG: EvidenceRegistry = {
  sources: [
    {
      id: "dga-2025-2030",
      title: "Dietary Guidelines for Americans, 2025-2030",
      kind: "guideline",
      publisher: "U.S. Department of Health and Human Services and U.S. Department of Agriculture",
      authors: ["U.S. Department of Health and Human Services", "U.S. Department of Agriculture"],
      publicationYear: 2026,
      url: "https://realfood.gov/",
      license: "us-public-domain",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      licenseNote:
        "Work of the U.S. federal government, in the public domain. The Departments ask that content they did not create, and photographs in particular, not be treated as public domain, and that altered content not be sourced back to the Dietary Guidelines.",
      productUseAllowed: true,
      permissionRequired: false,
      peerReviewed: false,
      retrievedOn: RETRIEVED,
      publishedOn: "2026-01-07",
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 60,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "Released 7 January 2026; the current edition. Review interval follows the statutory five-year cycle, so it is next due when the 2030-2035 edition is expected.",
    },
    {
      id: "dga-2020-2025",
      title: "Dietary Guidelines for Americans, 2020-2025 (9th edition)",
      kind: "guideline",
      publisher: "U.S. Department of Agriculture and U.S. Department of Health and Human Services",
      authors: ["U.S. Department of Agriculture", "U.S. Department of Health and Human Services"],
      publicationYear: 2020,
      url: "https://www.dietaryguidelines.gov/",
      license: "us-public-domain",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      licenseNote:
        "Work of the U.S. federal government, in the public domain. Graphs, figures and tables may be used without permission; photographs are not public domain.",
      productUseAllowed: true,
      permissionRequired: false,
      peerReviewed: false,
      retrievedOn: RETRIEVED,
      publishedOn: "2020-12-29",
      reviewedOn: "2026-01-07",
      reviewIntervalMonths: 60,
      reviewStatus: "superseded",
      version: 2,
      supersededBy: "dga-2025-2030",
      notes:
        "Retained for history only. Superseded on 7 January 2026 when HHS and USDA released the 2025-2030 edition. Claims resting on this edition must be re-checked against the new one, not carried forward.",
    },
    {
      id: "usda-fooddata-central",
      title: "FoodData Central",
      kind: "dataset",
      publisher:
        "U.S. Department of Agriculture, Agricultural Research Service, Beltsville Human Nutrition Research Center",
      authors: ["U.S. Department of Agriculture, Agricultural Research Service"],
      publicationYear: 2019,
      url: "https://fdc.nal.usda.gov/",
      license: "cc0-1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      licenseNote:
        "USDA states that FoodData Central data are in the public domain, published under CC0 1.0. No permission is needed; USDA requests that FoodData Central be named as the source.",
      productUseAllowed: true,
      permissionRequired: false,
      peerReviewed: false,
      retrievedOn: RETRIEVED,
      publishedOn: null,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 12,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "Composition dataset, registered for a later phase's food matching. No claim cites it yet, and none should until a specific food entry and data type (Foundation, FNDDS, SR Legacy, Branded) has been checked.",
    },
    {
      id: "fao-who-unu-2004-energy",
      title:
        "Human Energy Requirements: Report of a Joint FAO/WHO/UNU Expert Consultation (FAO Food and Nutrition Technical Report Series 1)",
      kind: "government_report",
      publisher:
        "Food and Agriculture Organization of the United Nations, on behalf of FAO, WHO and UNU",
      authors: [
        "Food and Agriculture Organization of the United Nations",
        "World Health Organization",
        "United Nations University",
      ],
      publicationYear: 2004,
      url: "https://www.fao.org/4/y5686e/y5686e00.htm",
      license: "fao-noncommercial",
      licenseUrl: "https://www.fao.org/contact-us/terms/en",
      licenseNote:
        "FAO copyright, all rights reserved. Reproduction for educational or other non-commercial purposes is authorised without permission provided the source is fully acknowledged; reproduction for resale or other commercial purposes is prohibited without written permission of the copyright holders.",
      productUseAllowed: false,
      permissionRequired: true,
      peerReviewed: false,
      retrievedOn: RETRIEVED,
      publishedOn: null,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 60,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "Bibliographic details and licensing verified; the content may be read and summarised, but nothing derived from it may ship commercially without written permission from FAO. ISBN 92-5-105212-3.",
    },
    {
      id: "icmr-nin-dgi-2024",
      title: "Dietary Guidelines for Indians - 2024 (Revised Edition)",
      kind: "guideline",
      publisher:
        "ICMR-National Institute of Nutrition, Indian Council of Medical Research, Ministry of Health and Family Welfare, Government of India",
      authors: ["ICMR-NIN Expert Committee"],
      publicationYear: 2024,
      url: "https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf",
      license: "nin-copyright-restricted",
      licenseUrl: "https://www.nin.res.in/",
      licenseNote:
        "Copyright ICMR-National Institute of Nutrition. The publisher states that use and dissemination of the data is encouraged and that the publication may be reproduced for personal use with full acknowledgement, but that no part may be stored or reproduced in electronic form for creating a product without prior written permission.",
      productUseAllowed: false,
      permissionRequired: true,
      peerReviewed: false,
      retrievedOn: RETRIEVED,
      publishedOn: null,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 60,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "The most relevant guidance for an Indian audience, and currently unusable in a product. Written permission from NIN is a prerequisite before any of its content is reproduced. Cited here so the gap is visible rather than quietly filled with a US source.",
    },
    {
      id: "icmr-nin-ifct-2017",
      title: "Indian Food Composition Tables 2017",
      kind: "dataset",
      publisher:
        "National Institute of Nutrition, Indian Council of Medical Research, Hyderabad, India",
      authors: ["T. Longvah", "R. Ananthan", "K. Bhaskarachary", "K. Venkaiah"],
      publicationYear: 2017,
      url: "https://www.nin.res.in/ebooks/IFCT2017.pdf",
      license: "nin-copyright-restricted",
      licenseUrl: "https://www.nin.res.in/",
      licenseNote:
        "Copyright 2017 National Institute of Nutrition. The publisher encourages use and dissemination and permits personal reproduction with full acknowledgement, but states that no part of the publication may be stored or reproduced in any electronic format for creating a product without the prior written permission of NIN, Hyderabad.",
      productUseAllowed: false,
      permissionRequired: true,
      peerReviewed: false,
      retrievedOn: RETRIEVED,
      publishedOn: null,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 12,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "Import blocked. 528 key foods and 151 components, and the closest thing to an authoritative Indian composition table, but the terms forbid loading it into a product's electronic database without written permission. Not imported in this phase; see the methodology document.",
    },
  ],

  claims: [
    {
      id: "dga-whole-foods-emphasis",
      statement:
        "US federal dietary guidance for 2025-2030 emphasises whole, nutrient-dense foods and limiting highly processed foods, added sugars and refined carbohydrates.",
      topic: "dietary_pattern",
      grade: "moderate",
      confidence: 0.8,
      population:
        "The United States general population; the guidance is not clinical advice for treating disease",
      uncertainty: [
        "This is a qualitative emphasis, not a numeric target, so it cannot be used to derive calories or macros.",
        "The edition is new; how its recommendations are operationalised in federal programmes is still being published.",
      ],
      limitations: [
        "Written for US dietary patterns. Applicability to Indian or other cuisines is not established by this source.",
        "The publisher asks that altered or excerpted content not be attributed back to the Dietary Guidelines.",
      ],
      contraindications: [
        "Not a substitute for individual clinical nutrition advice where a medical condition is present.",
      ],
      sources: [
        {
          sourceId: "dga-2025-2030",
          direction: "supports",
          locator:
            "USDA Food and Nutrition Service, Dietary Guidelines for Americans page (updated 13 April 2026), summary of the 2025-2030 edition",
        },
      ],
      reviewStatus: "approved",
      version: 1,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "fao-energy-requirement-components",
      statement:
        "Human energy requirements are estimated from measured energy expenditure plus the additional energy needs for growth, pregnancy and lactation.",
      topic: "energy_requirement",
      grade: "strong",
      confidence: 0.95,
      population:
        "Populations across the life cycle, as assessed by the 2001 joint expert consultation",
      uncertainty: [
        "The report estimates requirements for populations; individual requirements vary around those estimates.",
      ],
      limitations: [
        "Published in 2004 from a consultation held in 2001; newer evidence may since have refined the figures.",
        "Cannot be reproduced in a commercial product without written permission from FAO.",
      ],
      contraindications: [
        "Population estimates must not be applied as an individual's clinical energy prescription.",
      ],
      sources: [
        {
          sourceId: "fao-who-unu-2004-energy",
          direction: "supports",
          locator: "Chapter 2, Principles and definitions, opening paragraph",
        },
      ],
      // Verified against the source, but the licence blocks product use, so it
      // stays out of the approved set on purpose. See the methodology document.
      reviewStatus: "in_review",
      version: 1,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "icmr-dgi-food-variety",
      statement:
        "ICMR-NIN's first dietary guideline for Indians is to eat a variety of foods to ensure a balanced diet.",
      topic: "dietary_pattern",
      grade: "moderate",
      confidence: 0.85,
      population: "The Indian general population",
      uncertainty: [
        "The guideline states a principle; it does not specify quantities, which the document handles in later sections.",
      ],
      limitations: [
        "The document is copyright ICMR-NIN and may not be stored or reproduced electronically in a product without written permission.",
      ],
      contraindications: [
        "Not a prescription for individuals with a medical condition requiring therapeutic dietetics.",
      ],
      sources: [
        {
          sourceId: "icmr-nin-dgi-2024",
          direction: "supports",
          locator: "Guideline 1 - Eat a variety of foods to ensure a balanced diet",
        },
      ],
      reviewStatus: "in_review",
      version: 1,
      reviewedOn: RETRIEVED,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "rate-cap-1kg-per-week",
      statement: "Bloom caps planned weight change at 1 kg per week.",
      topic: "weight_change_rate",
      grade: "insufficient",
      confidence: 0,
      population: "Anyone using Bloom's body-target calculator",
      uncertainty: [
        "No source has been verified for this cap. It is a Phase 1 product safety constant, not a finding from the literature.",
        "Whether 1 kg per week is the right ceiling for this population, and how it should differ by body size, is unresolved.",
      ],
      limitations: [
        "Deliberately recorded with no citation rather than attaching a plausible-looking reference to a number nobody checked.",
        "Until a source is verified, this claim must not be presented to a person as evidence-based.",
      ],
      contraindications: [
        "A cap does not make an aggressive target safe for someone with a history of disordered eating; the safety classifier handles that separately.",
      ],
      sources: [],
      // Draft, not approved: nothing backs it. The registry reports this as an
      // untraceable claim, which is the point of having the check at all.
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
  ],

  recommendations: [
    {
      recommendationId: "vitalis.guidance.whole-foods",
      claimIds: ["dga-whole-foods-emphasis"],
      rationale:
        "Any future dietary-pattern copy should rest on this claim and carry its citation, so the wording can be traced to a public-domain source a reviewer can open.",
    },
    {
      recommendationId: "vitalis.safety.rate-cap",
      claimIds: ["rate-cap-1kg-per-week"],
      rationale:
        "The Phase 1 classifier clamps requested pace to this constant. Phase 2 records the rule and the fact that its evidence is missing, rather than inventing support for a number that was chosen as a safety margin.",
    },
  ],

  revisions: [
    {
      entityType: "source",
      entityId: "dga-2025-2030",
      version: 1,
      changedOn: RETRIEVED,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 2025-2030 edition, released 7 January 2026, after confirming public-domain status and the publisher's attribution request.",
    },
    {
      entityType: "source",
      entityId: "dga-2020-2025",
      version: 2,
      changedOn: "2026-01-07",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Marked superseded by dga-2025-2030 when HHS and USDA released the new edition; retained for history, no longer citable as current.",
    },
    {
      entityType: "claim",
      entityId: "dga-whole-foods-emphasis",
      version: 1,
      changedOn: RETRIEVED,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Approved against the current edition with an explicit locator, after the earlier edition was found to be superseded during verification.",
    },
    {
      entityType: "claim",
      entityId: "rate-cap-1kg-per-week",
      version: 1,
      changedOn: RETRIEVED,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Recorded the Phase 1 rate cap as an assumption with no verified source, so it cannot be presented as evidence-based until one is found.",
    },
  ],
};

/** The registry the app will read once a data source replaces this bundle. */
export const EVIDENCE_CATALOG = CATALOG;
