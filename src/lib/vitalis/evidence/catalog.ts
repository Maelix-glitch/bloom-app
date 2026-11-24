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
 * So the only claims that are product-ready today rest on US public-domain
 * sources. That is the honest state of this registry, and the tests assert it
 * rather than a more flattering picture.
 *
 * The 2026-11-18 registration (Evidence Registry v1) adds the rules the
 * nutrition engine actually runs — its equations, factors, bands, floors and
 * thresholds — each as a claim plus a recommendation link naming the code
 * that implements it. A rule whose citation nobody has verified is recorded
 * exactly the way the rate cap was: a draft claim with no source, grade
 * `insufficient`, confidence 0. The registry would rather report a rule as
 * untraceable than let it borrow a citation it has not earned.
 */

import type { EvidenceRegistry } from "./types";

const RETRIEVED = "2026-11-05";

/** When the engine-rule registration (Evidence Registry v1) was checked
 *  against the code it describes. */
const REGISTERED_V1 = "2026-11-18";

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
      version: 2,
      supersededBy: null,
      notes:
        "Composition dataset. The shipped reference set (src/lib/nutrition/data/usdaReferenceData.ts) has since been checked entry by entry: every food carries its FoodData Central id and data type, Foundation and SR Legacy only. Branded and FNDDS are not shipped. Claim usda-fdc-composition-source cites this source for the dataset's provenance and licence only, not for the accuracy of any individual value.",
    },
    {
      id: "uk-cofid-2021",
      title: "McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID)",
      kind: "dataset",
      publisher: "Public Health England",
      authors: ["Public Health England"],
      publicationYear: 2021,
      url: "https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid",
      license: "ogl-3.0",
      licenseUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
      licenseNote:
        "The CoFID workbook is published under the Open Government Licence v3.0: it may be copied, published, distributed and adapted, including commercially, free of charge, provided the source is acknowledged. Bloom acknowledges Public Health England / McCance and Widdowson's CoFID wherever these values are shown.",
      productUseAllowed: true,
      permissionRequired: false,
      peerReviewed: false,
      retrievedOn: "2026-11-23",
      publishedOn: "2021-03-19",
      reviewedOn: "2026-11-23",
      reviewIntervalMonths: 12,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "UK national food-composition database (the McCance and Widdowson tables, maintained for the UK government). Registered for ONE shipped food (M-229, 2026-11-23): paneer, CoFID food code 12-495 ('Cheese, Paneer'), in src/lib/nutrition/data/cofidReferenceData.ts, the row's own data reference is 'LGC, Nutrient analysis of cheese, 1999' (9 samples, sampled in spring and autumn). USDA FoodData Central carries no paneer entry, and the Indian IFCT paneer row stays unusable until ICMR-NIN grants written permission, so CoFID is the licence-clean source for this food. Caveat recorded honestly: CoFID's paneer is a UK retail product, harder-pressed than typical Indian market paneer (46.8 g water per 100 g against roughly 54-57 g), so its protein, fat and energy run higher per 100 g; the values are CoFID's own and are labelled as such, never as USDA or IFCT values.",
    },
    {
      id: "au-afcd-release-3",
      title: "Australian Food Composition Database (AFCD), Release 3",
      kind: "dataset",
      publisher: "Food Standards Australia New Zealand (FSANZ)",
      authors: ["Food Standards Australia New Zealand"],
      publicationYear: 2025,
      url: "https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/about-afcd",
      license: "fsanz-data-user-licence",
      licenseUrl:
        "https://www.foodstandards.gov.au/science-data/monitoringnutrients/afcd/datauserlicenceagreement",
      licenseNote:
        "The AFCD is published under FSANZ's Data User Licence Agreement (modelled on CC BY-SA 3.0 AU): the data may be reproduced, adapted and distributed, including commercially, provided FSANZ is attributed, the licence is linked, the Limitation of Data Statement travels with the data, and the data are identified as Australian data that may not be appropriate for use in other countries. Bloom attributes Food Standards Australia New Zealand / the Australian Food Composition Database wherever these values are shown, and carries the statement: this data is based on Australian data, and Australian data may not be appropriate for use in other countries.",
      productUseAllowed: true,
      permissionRequired: false,
      peerReviewed: false,
      retrievedOn: "2026-11-23",
      publishedOn: null,
      reviewedOn: "2026-11-23",
      reviewIntervalMonths: 12,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "Australian national food-composition database. Registered for SIX shipped foods (M-230, 2026-11-24), all with AFCD Derivation 'Analysed', the majority of each row's data from Australian laboratory analysis of representative samples, in src/lib/nutrition/data/afcdReferenceData.ts: lupin splits (F005249), broad beans dried (F000416), split peas dried (F006543), amaranth grain (F000061), chia seeds (F008209) and flaxseed/linseed (F008210). AFCD publishes energy in kilojoules only; Bloom's kcal figure is the pinned kJ value divided by 4.184 and rounded, and the generator pins the kJ so the derivation is checkable. Fields AFCD's own sampling notes attribute to another database are NOT shipped: vitamin C is omitted for lupin splits (borrowed from Kohajkova et al. 2011) and for broad beans (borrowed from USDA SR28) rather than letting a borrowed value wear an AFCD label. Limitation of Data Statement (FSANZ): there are limitations associated with food composition databases, the data represent an average of the nutrient content of a particular sample of foods, determined at a particular time, and composition can vary substantially between batches and brands with season, processing, ingredient source and methods of calculation.",
    },
    {
      id: "ca-cnf-2026",
      title: "Canadian Nutrient File (CNF)",
      kind: "dataset",
      publisher: "Health Canada",
      authors: ["Health Canada"],
      publicationYear: 2026,
      url: "https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109",
      license: "ogl-canada-2.0",
      licenseUrl: "https://open.canada.ca/en/open-government-licence-canada",
      licenseNote:
        "The Canadian Nutrient File is published by Health Canada through the Government of Canada's open data portal under the Open Government Licence – Canada v2.0: the data may be copied, modified, published, translated, adapted and distributed for commercial or non-commercial purposes, with attribution to the source and no suggestion of official endorsement. Bloom attributes Health Canada's Canadian Nutrient File wherever these values are shown.",
      productUseAllowed: true,
      permissionRequired: false,
      peerReviewed: false,
      retrievedOn: "2026-11-23",
      publishedOn: null,
      reviewedOn: "2026-11-23",
      reviewIntervalMonths: 12,
      reviewStatus: "approved",
      version: 1,
      supersededBy: null,
      notes:
        "Canadian national food-composition database. Registered for THREE shipped foods (M-230, 2026-11-24) in src/lib/nutrition/data/cnfReferenceData.ts: quark (food code 6995), kefir plain low fat (6999) and unsweetened fortified soy beverage (6330). Every shipped row carries CNF Food Source Code 37. Health Canada's own CNF Sampling and Analysis Program (SNAP-CAN). CNF rows whose food source is code 0 ('based on data from USDA: no changes') were deliberately NOT shipped from this wave: natto, lupins, amaranth, spirulina and broad beans exist in the CNF only as USDA data under a Canadian label, and lifting them would mislabel USDA values as Canadian, the same honesty rule that keeps IFCT values out until ICMR-NIN grants written permission.",
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
      // Superseded 2026-11-22 (M-219): the cap itself changed — see
      // rate-cap-0-75kg-per-week. Retained for history.
      reviewStatus: "superseded",
      version: 2,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: "rate-cap-0-75kg-per-week",
    },
    {
      id: "rate-cap-0-75kg-per-week",
      statement: "Bloom caps planned weight change at 0.75 kg per week.",
      topic: "weight_change_rate",
      grade: "insufficient",
      confidence: 0,
      population: "Anyone using Bloom's body-target calculator",
      uncertainty: [
        "The M-219 engine evidence audit (2026-11-22) set this cap against the published ranges it verified. CDC's 1-2 lb per week and the AHA/ACC/TOS 500-750 kcal/day prescription the old 1 kg/week cap exceeded. Those sources are not yet registered in this catalogue, so the claim stays a draft: TO VERIFY, TO REGISTER.",
        "How the ceiling should differ by body size remains unresolved.",
      ],
      limitations: [
        "Deliberately recorded with no citation rather than attaching a plausible-looking reference to a number nobody checked.",
        "Until a source is verified, this claim must not be presented to a person as evidence-based.",
      ],
      contraindications: [
        "A cap does not make an aggressive target safe for someone with a history of disordered eating; the safety classifier handles that separately.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },

    /* ------------------------------------------------------------------ */
    /* Evidence Registry v1 (2026-11-18): the rules the engine runs.       */
    /* Every entry below was checked against the code named in its         */
    /* recommendation link. Unverified citations stay drafts with no       */
    /* source — see the file header.                                       */
    /* ------------------------------------------------------------------ */

    {
      id: "usda-fdc-composition-source",
      statement:
        "Bloom's reference food values come from USDA FoodData Central, the Foundation and SR Legacy datasets, each food carrying its FoodData Central id and data type, published under CC0 1.0 (public domain).",
      topic: "food_composition",
      grade: "moderate",
      confidence: 0.9,
      population: "Anyone using Bloom's food search, dish library or meal plans",
      uncertainty: [
        "FoodData Central is a living dataset and values can change between releases, which is why every shipped food records the release its values came from.",
      ],
      limitations: [
        "This entry covers the dataset's provenance and licence only. It does not certify any individual food value; each value's standing rests on the dataset and on the per-food provenance the app shows.",
      ],
      contraindications: [
        "USDA values describe foods as analysed in the United States; a local variety or preparation can differ, so values are reference data, never a measurement of the food on a person's plate.",
      ],
      sources: [
        {
          sourceId: "usda-fooddata-central",
          direction: "supports",
          locator:
            "FoodData Central (fdc.nal.usda.gov). USDA publishes the data under CC0 1.0 and asks that FoodData Central be named as the source",
        },
      ],
      reviewStatus: "approved",
      version: 1,
      reviewedOn: REGISTERED_V1,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "mifflin-st-jeor-bmr",
      statement:
        "Bloom estimates resting energy (BMR) with the Mifflin–St Jeor equation: 10 × weight in kg + 6.25 × height in cm − 5 × age, plus 5 for men or −161 for women (−78, the midpoint, when sex is not stated).",
      topic: "energy_requirement",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's body targets and plan generation",
      uncertainty: [
        "The equation is named in the code (src/lib/health/body.ts, bmrOf), but its bibliographic citation has not been verified against the publication, so no source is linked.",
        "Any predictive equation estimates a population average; an individual's measured expenditure can differ materially.",
      ],
      limitations: [
        "An estimate, never a measurement: BMR and everything derived from it must be presented as estimated.",
      ],
      contraindications: [
        "Not a clinical energy prescription; the safety classifier, not this equation, decides who should not receive a self-directed target.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "activity-factor-table",
      statement:
        "Bloom turns BMR into a daily energy estimate with activity factors: 1.2 (sedentary), 1.375 (light), 1.55 (moderate), 1.725 (active) and 1.9 (very active).",
      topic: "energy_requirement",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's body targets and plan generation",
      uncertainty: [
        "No source is stated in the code for this factor table (src/lib/health/body.ts, ACTIVITY_FACTOR); the values are recorded as TO VERIFY rather than dressed up with a citation nobody checked.",
      ],
      limitations: [
        "Five coarse bands cannot capture an individual's real activity; the engine's calibration from logged days and weigh-ins exists because this table is only a starting estimate.",
      ],
      contraindications: [
        "A misclassified activity level moves the whole energy target, so the result is an estimate to be corrected by observed weight trend, not a fact.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "protein-recomp-2-2",
      statement:
        "For body recomposition, fat loss and muscle gain at the same weight. Bloom sets the protein target at 2.2 g per kg of body weight, the highest of its four goal bands.",
      topic: "protein",
      grade: "insufficient",
      confidence: 0,
      population: "Adults with a recomposition goal who pass Bloom's safety screening",
      uncertainty: [
        "The figure's citations are recorded in the code comment (src/lib/health/body.ts) as Morton et al.'s 2018 meta-analysis of protein and lean mass (BJSM) and the ISSN position stand's range for maximising lean mass; they have not yet been verified against those publications, so no source is linked.",
      ],
      limitations: [
        "The code describes 2.2 g/kg as the upper confidence bound in the cited meta-analysis, the top of a range, chosen deliberately for the most protein-demanding goal, not a typical requirement.",
      ],
      contraindications: [
        "The safety classifier blocks this band from reaching anyone for whom a high-protein target needs a clinician (chronic kidney disease, pregnancy, eating-disorder history).",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "protein-bands-by-goal",
      statement:
        "Bloom's other protein bands are 1.8 g per kg for weight loss, 1.6 g per kg for weight gain and 1.4 g per kg for maintenance. Above a BMI of 23 the bands multiply a reference weight, the healthy-ceiling weight for the person's height (22.9 × height²), instead of current body weight; at or below it they apply to current body weight. (Corrected at version 2, M-219: the statement previously said the bands apply to current body weight throughout, which stopped being true when the dosing basis changed.)",
      topic: "protein",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's body targets who pass Bloom's safety screening",
      uncertainty: [
        "No source is stated in the code for these three bands (src/lib/health/body.ts, bodyTargetsOf); recorded as TO VERIFY.",
      ],
      limitations: [
        "Per-kilogram bands scale linearly with body weight, which overstates needs at high body weights; since M-219 the engine doses on the healthy-ceiling reference weight above a BMI of 23, but that reference is a BMI ceiling, not a measured lean-mass figure.",
      ],
      contraindications: [
        "Planning targets for the classifier's cleared set, not therapeutic protein prescriptions.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 2,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "energy-per-kg-7700",
      statement:
        "Bloom's energy-balance maths treats a kilogram of body-mass change as about 7,700 kcal, in the goal delta (rate × 7,700 ÷ 7) and in the expenditure estimate that learns from a person's own weigh-ins and logged days.",
      topic: "energy_balance",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's goal timelines, targets or expenditure estimate",
      uncertainty: [
        "The constant is a stated approximation in the code (src/lib/nutrition/expenditure.ts, ENERGY_KCAL_PER_KG); its formal citation is TO VERIFY.",
        "The real energy density of weight change varies with body composition and over time; the figure is a modelling assumption, not a measured constant.",
      ],
      limitations: [
        "Estimates built on it, maintenance calories, goal timelines, inherit the approximation and are labelled estimates wherever they are shown.",
      ],
      contraindications: [
        "A projected weight or date is arithmetic on an approximation, never a promise.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "calorie-floors",
      statement:
        "Bloom never sets a daily calorie target below a floor: 1,500 kcal for men, 1,200 kcal for women and 1,350 kcal when sex is not stated. When the floor is what sets the target, the app says so.",
      topic: "energy_requirement",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's body targets and plan generation",
      uncertainty: [
        "The code describes these as commonly used minimums (src/lib/health/body.ts, calorieFloor) with no source stated; recorded as TO VERIFY.",
      ],
      limitations: [
        "A floor is a guardrail, not a finding that the resulting target is right for a given person.",
      ],
      contraindications: [
        "The floor does not make a target safe for someone the safety classifier flags; those people are directed to professional assessment instead.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "spectrum-rda-2020-references",
      statement:
        "The Nutrition tab's micronutrient panel judges a day against reference intakes the code names as ICMR-NIN Recommended Dietary Allowances 2020: fibre 30 g, potassium 3,500 mg, magnesium 440 mg (370 mg for women), calcium 1,000 mg, iron 19 mg (29 mg for women), vitamin C 80 mg (65 mg for women), and sodium as a 2,000 mg ceiling rather than a goal. (Corrected at version 2, M-219: the magnesium figures previously recorded here were the ICMR-NIN estimated average requirements, not the RDA, and vitamin C was recorded as a single value where the RDA is sex-specific.)",
      topic: "dietary_pattern",
      grade: "insufficient",
      confidence: 0,
      population: "Adults reading the Nutrition tab's daily micronutrient panel",
      uncertainty: [
        "The values are stated in the code (src/lib/nutrition/dayView.ts, spectrumReferences) with the ICMR-NIN RDA 2020 attribution, but the registry has not verified them against the publication, so no source is linked.",
      ],
      limitations: [
        "OPEN OWNER DECISION: this registry permission-gates ICMR-NIN publications for reproduction in a product (see icmr-nin-dgi-2024 and icmr-nin-ifct-2017). Whether stating RDA numeric values as reference intakes falls under the written permission Bloom is seeking is unresolved. The values stay in the product while the owner decides; this entry records the question and does not settle it.",
      ],
      contraindications: [
        "A day under a reference is a statement about the logged foods that report the nutrient, never a deficiency diagnosis, and no surface may word it as one.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 2,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "plan-composition-derivations",
      statement:
        "The plan composer's portion caps and day floors (for example 90 g dry grain and 60 g dry pulses per meal, and 120 g egg portions) are engine derivations recorded in the code from ICMR-NIN's My Plate framework, British Nutrition Foundation portion sizes and ISSN protein-distribution guidance, not reproduced guideline text.",
      topic: "dietary_pattern",
      grade: "insufficient",
      confidence: 0,
      population: "Adults receiving a generated meal plan",
      uncertainty: [
        "The derivations are stated in src/lib/nutrition/plan.ts and in the composition research notes behind it; the BNF and ISSN citations are TO VERIFY against the publications, so no source is linked.",
      ],
      limitations: [
        "ICMR-NIN's Dietary Guidelines are licence-blocked in this registry (icmr-nin-dgi-2024): the composer uses figures it derived and must not present them as ICMR-NIN's published guidance.",
      ],
      contraindications: [
        "Caps are composition guardrails for plan realism, not intake recommendations to present to a person as health advice.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "water-35ml-per-kg",
      statement:
        "Bloom's hydration target is 35 ml per kg of body weight plus an activity allowance of 0 to 1,000 ml, capped between 1,500 and 4,500 ml a day.",
      topic: "hydration",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's hydration tracker",
      uncertainty: [
        "The code calls 35 ml/kg the common adult maintenance estimate (src/lib/health/body.ts) with no source stated; recorded as TO VERIFY.",
      ],
      limitations: [
        "A single per-kilogram figure ignores climate, illness and medication; heat alone can move real needs well past it.",
      ],
      contraindications: [
        "People whose condition or medication restricts fluid must follow their clinician, not this target.",
      ],
      sources: [],
      // Superseded 2026-11-22 (M-219): the formula itself was
      // replaced — see water-efsa-drinking-share. Retained for
      // history.
      reviewStatus: "superseded",
      version: 2,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: "water-efsa-drinking-share",
    },
    {
      id: "water-efsa-drinking-share",
      statement:
        "Bloom's daily water target is a drinking-water figure: a base of 1,900 ml for men, 1,500 ml for women and 1,700 ml when sex is unstated, plus an activity allowance of 0 to 700 ml, clamped between 1,200 and 3,000 ml. The base is set at roughly three quarters of EFSA's total-water adequate intake (2.5 L a day for men, 2.0 L for women), the share ordinarily drunk rather than taken in food.",
      topic: "hydration",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's hydration tracker",
      uncertainty: [
        "The EFSA adequate-intake basis was verified by the M-219 engine evidence audit (2026-11-22) against EFSA's 2010 opinion; the source is not yet registered in this catalogue, so the claim stays a draft: TO VERIFY, TO REGISTER.",
        "The roughly-three-quarters drinking share is an estimate of how total water ordinarily splits between drink and food moisture, not an EFSA figure.",
      ],
      limitations: [
        "EFSA's adequate intake assumes a temperate climate; heat, illness and medication can move real needs well past any fixed figure.",
      ],
      contraindications: [
        "People whose condition or medication restricts fluid must follow their clinician, not this target.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "who-healthy-diet-principles",
      statement:
        "Bloom's plan design follows the healthy-diet principles of adequacy, balance, moderation and diversity.",
      topic: "dietary_pattern",
      grade: "insufficient",
      confidence: 0,
      population: "Everyone Bloom designs plans for",
      uncertainty: [
        "The principles are recorded from the World Health Organization's healthy-diet fact sheet as cited in the product vision; the registry has not verified the citation against the fact sheet, so no source is linked and the principles must not be presented as a verified WHO endorsement.",
      ],
      limitations: [
        "Principles, not numeric rules: they shape design and review, and no plan figure is derived from them directly.",
      ],
      contraindications: [
        "A design principle never overrides a person's recorded restrictions or the safety classifier.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "nice-ng246-individualisation",
      statement:
        "Bloom individualises plans around the person's cultural preferences, finances and recorded health circumstances, and it never generates a very-low-energy diet: its calorie floors and rate cap keep self-directed targets out of that territory.",
      topic: "energy_requirement",
      grade: "insufficient",
      confidence: 0,
      population: "Adults using Bloom's plan generation",
      uncertainty: [
        "Recorded from NICE guideline NG246 as cited in the product vision; not verified against the guideline, and Bloom must not claim NICE conformance until it is.",
      ],
      limitations: [
        "The engine's floors and classifier are consistent with the principle that very-low-energy diets belong in specialist programmes; consistency is not conformance, and this entry does not claim it.",
      ],
      contraindications: [
        "People whose recorded circumstances trigger the safety classifier are directed to professional assessment instead of a plan; that pathway, not this entry, is the protection.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "budget-tier-cost-bands",
      statement:
        "Dish budget tiers are an engine derivation, labelled an estimate: ingredient costs from stated 2026 urban-Indian retail approximations (₹ per gram by food group) put a serving at tier 1 (up to ₹20), tier 2 (up to ₹45) or tier 3 (above).",
      topic: "dietary_pattern",
      grade: "insufficient",
      confidence: 0,
      population: "Adults who state a meal budget in their Assessment",
      uncertainty: [
        "The prices are approximations recorded in src/lib/nutrition/dishes.ts, not a price survey; they drift with season and city and are re-stated, not verified, at each release.",
      ],
      limitations: [
        "A tier is a planning filter the person chooses; it is not a claim about what a dish costs any particular household.",
      ],
      contraindications: [
        "Never present a tier as a measured price, or as a judgement of what a person should spend.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "dish-region-markers",
      statement:
        "Whether a dish counts as North or South Indian for the cuisine preference is derived by Bloom's own curated marker tables over the dish library's cuisine tags, names and ids; a dish matching both regions, or neither, is recorded as neither.",
      topic: "dietary_pattern",
      grade: "insufficient",
      confidence: 0,
      population: "Adults who state a North or South Indian preference in their Assessment",
      uncertainty: [
        "Curated data, not a citation: the tables in src/lib/nutrition/regions.ts are Bloom's own classification, maintained alongside the dish library.",
      ],
      limitations: [
        "The preference only ranks dishes; it never filters one out, so a wrong marker costs variety, not access.",
      ],
      contraindications: [
        "A regional label describes the kitchen tradition the library records for a dish; it is not a claim about authenticity.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "micro-gap-threshold",
      statement:
        "A nutrient counts as a gap when at least 4 of the last 7 logged days report it and those days average under 70% of its Spectrum reference; the plan then favours dishes whose computed panels are rich in that nutrient.",
      topic: "dietary_pattern",
      grade: "insufficient",
      confidence: 0,
      population: "Adults whose food log the plan learns from",
      uncertainty: [
        "The 70% threshold and the 4-of-7-days minimum are engine constants (MICRO_GAP_RATIO and MICRO_MIN_DAYS in src/lib/nutrition/planAdaptation.ts) with no source stated in the code; recorded as TO VERIFY.",
      ],
      limitations: [
        "Averages rest only on days whose logged foods report the nutrient, and sodium, a ceiling, not a goal, is never counted as a gap.",
      ],
      contraindications: [
        "A gap is never a deficiency diagnosis, and no surface may word it as one or recommend a supplement from it.",
      ],
      sources: [],
      reviewStatus: "draft",
      version: 1,
      reviewedOn: null,
      reviewIntervalMonths: 12,
      supersededBy: null,
    },
    {
      id: "adaptation-ratios",
      statement:
        "When the last two or three logged days average under 85% of the protein target, the plan leans protein-first; when they average over 110% of the energy target, energy top-ups are left out. The targets themselves never move.",
      topic: "energy_balance",
      grade: "insufficient",
      confidence: 0,
      population: "Adults whose food log the plan learns from",
      uncertainty: [
        "The 85% and 110% thresholds are engine constants (PROTEIN_SHORTFALL_RATIO and ENERGY_OVERSHOOT_RATIO in src/lib/nutrition/planAdaptation.ts) with no source stated in the code; recorded as TO VERIFY.",
      ],
      limitations: [
        "Two or three days is a small sample by design: the bias is a nudge inside the composer's own rules, and fewer than two logged days means no adaptation at all.",
      ],
      contraindications: [
        "Adaptation describes the log, not the person's effort, and must never be worded as them falling short.",
      ],
      sources: [],
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
      claimIds: ["rate-cap-0-75kg-per-week"],
      rationale:
        "The Phase 1 classifier clamps requested pace to this constant. Phase 2 records the rule and the fact that its evidence is missing, rather than inventing support for a number that was chosen as a safety margin. Implemented in src/lib/vitalis/domain/safety.ts. MIN_RATE_KG_PER_WEEK / MAX_RATE_KG_PER_WEEK.",
    },
    {
      recommendationId: "vitalis.nutrition.composition-source",
      claimIds: ["usda-fdc-composition-source"],
      rationale:
        "Implemented in src/lib/nutrition/usdaReference.ts: its licence gate resolves the usda provenance kind to this registry's usda-fooddata-central source and fails closed for any source that is not product-allowed, which is what keeps IFCT and INDB values out of the product until written permission exists.",
    },
    {
      recommendationId: "vitalis.body.bmr-equation",
      claimIds: ["mifflin-st-jeor-bmr"],
      rationale:
        "Implemented in src/lib/health/body.ts, bmrOf (Mifflin–St Jeor; sex constants +5 / −161 / −78). The Vitalis calculation path consumes the same figures via src/lib/vitalis/calc/body.ts (targetsFor).",
    },
    {
      recommendationId: "vitalis.body.activity-factors",
      claimIds: ["activity-factor-table"],
      rationale:
        "Implemented in src/lib/health/body.ts. ACTIVITY_FACTOR, applied in bodyTargetsOf as TDEE = BMR × factor.",
    },
    {
      recommendationId: "vitalis.body.protein-recomp",
      claimIds: ["protein-recomp-2-2"],
      rationale:
        "Implemented in src/lib/health/body.ts, bodyTargetsOf sets proteinPerKg to 2.2 when the goal is recomp; the comment there carries the citations this claim records as unverified.",
    },
    {
      recommendationId: "vitalis.body.protein-bands",
      claimIds: ["protein-bands-by-goal"],
      rationale:
        "Implemented in src/lib/health/body.ts, bodyTargetsOf proteinPerKg: 1.8 (lose), 1.6 (gain), 1.4 (maintain).",
    },
    {
      recommendationId: "vitalis.body.energy-per-kg",
      claimIds: ["energy-per-kg-7700"],
      rationale:
        "Implemented in src/lib/nutrition/expenditure.ts. ENERGY_KCAL_PER_KG = 7700; the same figure appears as the 7700 literal in src/lib/health/body.ts, where bodyTargetsOf turns a weekly rate into a daily delta.",
    },
    {
      recommendationId: "vitalis.body.calorie-floor",
      claimIds: ["calorie-floors"],
      rationale:
        "Implemented in src/lib/health/body.ts, calorieFloor(sex) returns 1500 / 1200 / 1350; bodyTargetsOf clamps the target to at least the floor and records floorApplied so the surface can say the floor did the work.",
    },
    {
      recommendationId: "vitalis.nutrition.spectrum-references",
      claimIds: ["spectrum-rda-2020-references"],
      rationale:
        "Implemented in src/lib/nutrition/dayView.ts, spectrumReferences(sex) returns the seven reference rows the panel and the gap detection judge against.",
    },
    {
      recommendationId: "vitalis.plan.composition-caps",
      claimIds: ["plan-composition-derivations"],
      rationale:
        "Implemented in src/lib/nutrition/plan.ts, the portion-cap constants (CAP_GRAIN_DRY_G, CAP_DRY_PULSES_G, CAP_EGGS_G and their family) and the day-floor checks of the layered composer.",
    },
    {
      recommendationId: "vitalis.body.hydration-target",
      claimIds: ["water-efsa-drinking-share"],
      rationale:
        "Implemented in src/lib/health/body.ts, bodyTargetsOf computes waterMl as weightKg × 35 plus the activity bonus, clamped to [1500, 4500] and rounded to 50 ml.",
    },
    {
      recommendationId: "vitalis.guidance.healthy-diet-principles",
      claimIds: ["who-healthy-diet-principles"],
      rationale:
        "Design principles for plan composition and review. Where they bite in code is the composer's variety and adequacy behaviour in src/lib/nutrition/plan.ts; no numeric target derives from them.",
    },
    {
      recommendationId: "vitalis.safety.no-vlcd",
      claimIds: ["nice-ng246-individualisation"],
      rationale:
        "Enforced by construction: calorieFloor in src/lib/health/body.ts plus the rate cap in src/lib/vitalis/domain/safety.ts (MIN_RATE_KG_PER_WEEK / MAX_RATE_KG_PER_WEEK) keep self-directed targets out of very-low-energy territory, and the safety classifier directs the people it flags to professional assessment.",
    },
    {
      recommendationId: "vitalis.plan.budget-tiers",
      claimIds: ["budget-tier-cost-bands"],
      rationale:
        "Implemented in src/lib/nutrition/dishes.ts. BUDGET_TIER_1_MAX_PER_SERVING = 20 and BUDGET_TIER_2_MAX_PER_SERVING = 45 (₹ per serving) over the stated ₹-per-gram group bands.",
    },
    {
      recommendationId: "vitalis.plan.dish-regions",
      claimIds: ["dish-region-markers"],
      rationale:
        "Implemented in src/lib/nutrition/regions.ts, the curated north/south marker tables; the plan composer applies the result as a ranking bonus, never a filter.",
    },
    {
      recommendationId: "vitalis.plan.micro-gap-bias",
      claimIds: ["micro-gap-threshold"],
      rationale:
        "Implemented in src/lib/nutrition/planAdaptation.ts, microGapsFor applies MICRO_GAP_RATIO = 0.7 with MICRO_MIN_DAYS = 4 reporting days inside MICRO_WINDOW_DAYS = 7, and the composer favours dishes rich in a gap nutrient (MICRO_RICH_SHARE).",
    },
    {
      recommendationId: "vitalis.plan.log-adaptation",
      claimIds: ["adaptation-ratios"],
      rationale:
        "Implemented in src/lib/nutrition/planAdaptation.ts, planAdaptationFor applies PROTEIN_SHORTFALL_RATIO = 0.85 and ENERGY_OVERSHOOT_RATIO = 1.1 over the last two to three logged days; targets are read, never written.",
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
    {
      entityType: "source",
      entityId: "usda-fooddata-central",
      version: 2,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Notes updated: the shipped reference set has been checked entry by entry (FDC id and data type per food, Foundation and SR Legacy only), and claim usda-fdc-composition-source now cites this source for provenance and licence. Bibliographic details unchanged.",
    },
    {
      entityType: "claim",
      entityId: "usda-fdc-composition-source",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the engine's composition-source rule (Evidence Registry v1): approved against the CC0 dataset record after the shipped set's per-food FDC ids and data types were checked in code.",
    },
    {
      entityType: "claim",
      entityId: "mifflin-st-jeor-bmr",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the BMR equation as implemented in src/lib/health/body.ts (Evidence Registry v1). Draft with no source: the equation is named in code, its bibliographic citation is TO VERIFY.",
    },
    {
      entityType: "claim",
      entityId: "activity-factor-table",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the ACTIVITY_FACTOR table as implemented (Evidence Registry v1). Draft with no source: no citation is stated in the code.",
    },
    {
      entityType: "claim",
      entityId: "protein-recomp-2-2",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 2.2 g/kg recomposition band (Evidence Registry v1). Draft: the Morton et al. 2018 (BJSM) and ISSN citations are recorded as they appear in the code comment, unverified against the publications.",
    },
    {
      entityType: "claim",
      entityId: "protein-bands-by-goal",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 1.8 / 1.6 / 1.4 g/kg protein bands (Evidence Registry v1). Draft with no source: none is stated in the code.",
    },
    {
      entityType: "claim",
      entityId: "energy-per-kg-7700",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 7,700 kcal/kg constant as a stated approximation (Evidence Registry v1). Draft: formal citation TO VERIFY.",
    },
    {
      entityType: "claim",
      entityId: "calorie-floors",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 1500 / 1200 / 1350 kcal floors (Evidence Registry v1). Draft with no source: the code calls them commonly used minimums and cites nothing.",
    },
    {
      entityType: "claim",
      entityId: "spectrum-rda-2020-references",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the Spectrum reference intakes with their in-code ICMR-NIN RDA 2020 attribution (Evidence Registry v1). Draft with no source, and the ICMR licence question recorded in its limitations as an open owner decision.",
    },
    {
      entityType: "claim",
      entityId: "plan-composition-derivations",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the composer's portion caps and day floors as engine derivations from the My Plate framework, BNF portions and ISSN distribution guidance (Evidence Registry v1). Draft: derivations recorded, BNF/ISSN citations TO VERIFY, no guideline text reproduced.",
    },
    {
      entityType: "claim",
      entityId: "water-35ml-per-kg",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 35 ml/kg hydration target (Evidence Registry v1). Draft with no source: none is stated in the code.",
    },
    {
      entityType: "claim",
      entityId: "who-healthy-diet-principles",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the WHO healthy-diet principles (adequacy, balance, moderation, diversity) as design principles (Evidence Registry v1). Draft: the fact-sheet citation is recorded as cited in the product vision, TO VERIFY / TO REGISTER as a source.",
    },
    {
      entityType: "claim",
      entityId: "nice-ng246-individualisation",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the individualisation and no-very-low-energy-diet rule (Evidence Registry v1). Draft: NICE NG246 recorded as cited in the product vision; no conformance claimed.",
    },
    {
      entityType: "claim",
      entityId: "budget-tier-cost-bands",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the dish budget tiers as an engine derivation from stated 2026 retail approximations, labelled an estimate (Evidence Registry v1). No external citation applies.",
    },
    {
      entityType: "claim",
      entityId: "dish-region-markers",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the North/South dish-region marker tables as curated engine data (Evidence Registry v1), so the absence of an external citation is deliberate and visible.",
    },
    {
      entityType: "claim",
      entityId: "micro-gap-threshold",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the micronutrient gap threshold (70% of reference, at least 4 of 7 logged days) (Evidence Registry v1). Draft with no source: none is stated in the code.",
    },
    {
      entityType: "claim",
      entityId: "adaptation-ratios",
      version: 1,
      changedOn: REGISTERED_V1,
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the log-adaptation ratios (protein under 85%, energy over 110% of target) (Evidence Registry v1). Draft with no source: none is stated in the code.",
    },
    {
      entityType: "claim",
      entityId: "rate-cap-1kg-per-week",
      version: 2,
      changedOn: "2026-11-22",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Marked superseded by rate-cap-0-75kg-per-week: the M-219 engine evidence audit found the 1 kg/week cap exceeds the CDC and AHA/ACC/TOS ranges, and the engine's cap changed with it. Retained for history, no longer the live rule.",
    },
    {
      entityType: "claim",
      entityId: "rate-cap-0-75kg-per-week",
      version: 1,
      changedOn: "2026-11-22",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the 0.75 kg/week rate cap (M-219). Draft: the audit's CDC and AHA/ACC/TOS sources are recorded in the claim's uncertainty as TO VERIFY / TO REGISTER, not yet linked.",
    },
    {
      entityType: "claim",
      entityId: "water-35ml-per-kg",
      version: 2,
      changedOn: "2026-11-22",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Marked superseded by water-efsa-drinking-share: the M-219 audit found the 35 ml/kg rule produced a drinking schedule above EFSA's total-water adequate intake, and the engine's formula changed with it. Retained for history.",
    },
    {
      entityType: "claim",
      entityId: "water-efsa-drinking-share",
      version: 1,
      changedOn: "2026-11-22",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Registered the drinking-share hydration target (M-219). Draft: the EFSA 2010 adequate-intake basis is recorded in the claim's uncertainty as TO VERIFY / TO REGISTER, not yet linked.",
    },
    {
      entityType: "claim",
      entityId: "protein-bands-by-goal",
      version: 2,
      changedOn: "2026-11-22",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Statement corrected (M-219, audit F-05): above a BMI of 23 the bands now multiply the healthy-ceiling reference weight, not current body weight. The bands themselves are unchanged.",
    },
    {
      entityType: "claim",
      entityId: "spectrum-rda-2020-references",
      version: 2,
      changedOn: "2026-11-22",
      changedBy: "vitalis-evidence-registry",
      summary:
        "Statement corrected (M-219, audit F-09): magnesium is the ICMR-NIN RDA 2020 (440 mg men / 370 mg women), not the EAR figures previously recorded, and vitamin C is sex-specific (80 mg men / 65 mg women). The OPEN OWNER DECISION limitation is unchanged.",
    },
  ],
};

/** The registry the app will read once a data source replaces this bundle. */
export const EVIDENCE_CATALOG = CATALOG;
