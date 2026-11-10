# Request for written permission — ICMR-National Institute of Nutrition

**Status: DRAFT. Not sent. Requires review and signature before it leaves this
repository.**

Nothing in this document is a claim that permission has been granted, offered,
implied or discussed. As of the date below, no permission exists, and the
registry records `icmr-nin-ifct-2017` and `icmr-nin-dgi-2024` as
`permissionRequired` with product use disallowed.

---

## Recipients

| Role                                           | Address                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Director, ICMR-National Institute of Nutrition | `director.nin@icmr.gov.in`                                                                                                          |
| NIN general / publications desk                | `nin@nic.in`                                                                                                                        |
| IFCT-specific correspondence                   | `ifct2017@gmail.com`                                                                                                                |
| Postal                                         | Director, ICMR-National Institute of Nutrition, Beside Tarnaka Metro Station, Jamai-Osmania PO, Hyderabad 500 007, Telangana, India |

A postal copy is recommended alongside email, because a written grant is the
only thing that changes the registry entry, and physical correspondence produces
one more reliably than email silence.

---

## The request

> **Subject: Request for written permission to reproduce Indian Food Composition
> Tables 2017 data and Dietary Guidelines for Indians 2024 content in a software
> product**
>
> Dear Director,
>
> I am writing on behalf of **[LEGAL ENTITY NAME]**, **[registered address]**,
> to request written permission under the terms stated in the National Institute
> of Nutrition's publications.
>
> **The product.** Bloom is a personal wellbeing application that helps an
> individual record habits, mood, sleep and study, and — in the version under
> development — to see nutrition information that is relevant to them. It is
> available in **[free / a free tier and a paid tier / paid tiers]**. It is not a
> medical device, does not diagnose or treat any condition, and does not provide
> clinical nutrition advice.
>
> **What we are asking for.** Written permission to use the following, for the
> purposes described, within the product:
>
> 1. Selected food entries and nutrient values from the **Indian Food
>    Composition Tables 2017**, specifically: food code, food name, and the
>    energy and macronutrient values for a defined subset of foods. We are not
>    seeking the whole publication, and we are not seeking the micronutrient
>    tables at this stage.
> 2. Selected content from the **Dietary Guidelines for Indians – 2024**, in
>    particular the numbered guidelines and their short explanatory statements,
>    to be paraphrased where possible and quoted where paraphrasing would change
>    the meaning.
>
> **What we would do with it.** Please treat each of these as a separate act we
> are asking you to authorise, and indicate which you are able to grant:
>
> | #   | Act                                  | Detail                                                                                                                                                          |
> | --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | a   | Electronic storage                   | Values stored in our database, on infrastructure operated by our hosting provider                                                                               |
> | b   | Display                              | Values shown to an individual user, per 100 g and per typical serving                                                                                           |
> | c   | Computation — recipe and dish values | Ingredient-level values combined to compute the nutrient content of a dish, using standard yield and retention factors where available                          |
> | d   | Derivative data                      | The computed dish values in (c) stored and displayed; we understand these are derived from your tables and are asking whether you regard them as your copyright |
> | e   | Attribution                          | Your required citation displayed in the app and on a credits page, in wording you approve                                                                       |
>
> **What we are not asking for.** We are not asking to redistribute the tables
> as data, to publish them in bulk, to make them available for download, or to
> sublicense them to a third party for their own use. Our intention is to show an
> individual a nutrient value for a food, with the source named.
>
> **Sublicensing, limited and necessary.** Our product is served from
> infrastructure operated by a hosting provider, which necessarily processes and
> transmits the data on our behalf. We ask that any permission extend to that
> processing and transmission, and to no other third party. If you would prefer a
> specific form of wording for this, we will adopt it.
>
> **Commercial terms.** We are willing to enter a formal agreement, to pay a
> licence fee, or to accept conditions you specify — including a restriction to
> non-commercial use if that is the only basis on which permission can be given.
> Please tell us which terms apply and what the process is.
>
> **Scope and duration.** We are requesting a non-exclusive, worldwide permission
> for the life of the product, and we will record whatever duration you specify.
> If permission is time-limited, we will diarise the renewal and stop displaying
> the material if it lapses.
>
> **Attribution wording we propose** (to be replaced with yours):
>
> > Food composition data: Indian Food Composition Tables 2017, National
> > Institute of Nutrition, Indian Council of Medical Research, Hyderabad.
> > Reproduced with permission.
>
> **Our current position.** We have not loaded IFCT 2017 or the 2024 Dietary
> Guidelines into our product, and will not do so until we hold your written
> permission. Our internal registry records both as unusable for product purposes
> for exactly this reason. If permission is refused, we will continue to record
> that refusal and will not use the material.
>
> **What would help us most.** A written reply — even a short one — stating
> whether permission is granted, which of (a) to (e) it covers, any conditions,
> and a named contact for follow-up. If a different office or a formal application
> form is the correct route, please tell me and I will follow it.
>
> Thank you for considering this request.
>
> Yours faithfully,
>
> **[NAME]**, **[ROLE]**, **[LEGAL ENTITY NAME]**
> **[email]** · **[telephone]** · **[date]**

---

## Recording the outcome

Whatever comes back changes the registry, and nothing else does:

| Response          | Registry change                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Written grant     | Add a licence id for the grant, set `productUseAllowed` for the covered sources, store the grant's exact wording in `licenseNote`, and file the reply beside this document |
| Conditional grant | Same, with the conditions written into `licenseNote` and any expiry into the review interval                                                                               |
| Refusal           | Keep `productUseAllowed = false`, record the refusal in `licenseNote` and in a revision entry                                                                              |
| No reply          | **No change.** Silence is not permission, and is not recorded as one                                                                                                       |

No agent, contributor or script may flip these flags on the strength of a verbal
assurance, an email from an intermediary, or a third party's description of the
licence.

---

## Notes for the reviewer before signing

- Fill in the legal entity, address, signatory, contact details, dates and the
  commercial model. The commercial statement must be accurate: describing a paid
  product as free would undermine the whole request.
- Item (d) is the one that matters most, and it is deliberately explicit. If NIN
  regards computed dish values as their copyright, the recipe feature depends on
  that answer, not merely on the ingredient tables.
- If the entity is not yet incorporated, say so plainly and give the individual's
  name and address instead. A request from an unnamed party is unlikely to be
  answered.
- Consider asking, in the same letter, whether NIN publishes any composition data
  on `data.gov.in` under the Government Open Data Licence — if such a
  publication exists or is planned, it would answer the question more cleanly
  than an individual grant.
