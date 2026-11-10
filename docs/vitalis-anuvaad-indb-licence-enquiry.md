# Licensing enquiry — Indian Nutrient Databank (INDB)

**Status: DRAFT. Not sent. Requires review and signature before it leaves this
repository.**

This enquiry does not assert that any licence has been granted. It exists because
the licensing position of the INDB _dataset file_ is unstated, and the only
written licence anyone has found attaches to a manuscript rather than to the data.

---

## What we established before writing

These findings are why the enquiry is needed, and are recorded here so a reviewer
can check the premise rather than take it on trust.

| Finding                                                                                                                                                                                                                                         | Status                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The INDB is described in Vijayakumar A, Dubasi HB, Awasthi A, Jaacks LM, _Development of an Indian Food Composition Database_, Current Developments in Nutrition 2024;8(7):103790, doi:10.1016/j.cdnut.2024.103790 (PMID 39071807; PMC11277795) | Verified                                                         |
| The article is open access under CC BY 4.0                                                                                                                                                                                                      | Verified                                                         |
| The article's CC BY statement is scoped to _"any Author Accepted Manuscript version arising from this submission"_                                                                                                                              | Verified — it is a manuscript licence, not a data licence        |
| The dataset is distributed as `Anuvaad_INDB_2024.11.xlsx` from the Anuvaad/INDB site and described there as "open-access"                                                                                                                       | Verified                                                         |
| The dataset page states no licence, no terms of use, no attribution requirement and no redistribution or commercial-use condition                                                                                                               | Verified                                                         |
| The INDB is built primarily on IFCT 2017 and IFCT 2004, with gaps filled from UK CoFID and USDA FoodData Central                                                                                                                                | Verified from the publication's method                           |
| Two independent open-source nutrition projects describe the INDB as "CC BY 4.0"                                                                                                                                                                 | Verified as third-party statements; **not** a licensor statement |
| Whether a CC BY grant on the manuscript extends to the XLSX dataset                                                                                                                                                                             | **Assumption, unresolved**                                       |
| Whether IFCT-derived values inside the INDB remain subject to ICMR-NIN's restriction                                                                                                                                                            | **Assumption, unresolved — and the central question**            |

Because of the last two rows, nothing from the INDB is imported, and the registry
holds no INDB source row. This enquiry is the route to changing that.

---

## Recipients

| Role                                         | Address                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Anuvaad (INDB maintainers)                   | **Confirm the current contact address from the Anuvaad site before sending** — do not send to a guessed mailbox |
| Copy: corresponding author of the 2024 paper | Via the correspondence address printed in the article                                                           |

The specific mailbox is deliberately left unstated here rather than invented. An
enquiry that reaches the wrong desk is worse than one that is a day late.

---

## The enquiry

> **Subject: Licensing terms for the Indian Nutrient Databank dataset file
> (Anuvaad_INDB_2024.11.xlsx)**
>
> Dear **[NAME / Anuvaad team]**,
>
> I am writing on behalf of **[LEGAL ENTITY NAME]**, **[registered address]**,
> about the Indian Nutrient Databank. We would like to use it in a software
> product for Indian users and want to do so on terms you have actually granted,
> rather than on an assumption.
>
> **What we have read.** We have read the 2024 paper describing the INDB and
> downloaded the dataset file `Anuvaad_INDB_2024.11.xlsx` from your site. The
> paper is CC BY 4.0 and we note that its licence statement applies to the
> accepted manuscript. The dataset page describes the database as open-access but
> does not state a licence for the file itself. We would rather ask than
> interpret.
>
> **What we would like to do.** Each of the following is a separate act, and we
> would be grateful for an answer on each:
>
> | #   | Question                                                                                                                                                                                               |
> | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | 1   | What licence or terms of use apply to the **dataset file** itself, as distinct from the paper? If a licence exists, may we have a copy of its text or a link to it?                                    |
> | 2   | May the dataset be used in a **commercial** product? Please answer for both a free product and a paid one, since we may offer both.                                                                    |
> | 3   | May the data be **stored electronically** in our database, hosted on infrastructure operated by our hosting provider?                                                                                  |
> | 4   | May we **display** individual food and nutrient values to an end user, per 100 g and per typical serving?                                                                                              |
> | 5   | May we **compute and display recipe- and dish-level values** by combining ingredient-level values — that is, may we create and use derivative values, and does that permission extend to showing them? |
> | 6   | May we **redistribute** the tables as data, for example as a downloadable file? (We do not currently intend to, and are asking so that our terms are clear.)                                           |
> | 7   | Is **sublicensing** required for our hosting provider to process and transmit the data on our behalf, and if so, on what terms?                                                                        |
> | 8   | What **attribution** wording do you require, and where should it appear?                                                                                                                               |
> | 9   | If permission is time-limited or revocable, what notice period applies?                                                                                                                                |
>
> **The question we most need answered.** The INDB's composition values are drawn
> primarily from ICMR-NIN's Indian Food Composition Tables (2017 and 2004), with
> some values from UK CoFID and USDA FoodData Central. NIN's own terms require
> written permission before their material is stored or reproduced electronically
> to create a product.
>
> So: **does Anuvaad hold, and can Anuvaad grant, rights over the IFCT-derived
> values in the INDB — or does use of those values still require permission from
> ICMR-NIN?** If the latter, we will approach NIN directly, and would be grateful
> for your view on which values in the dataset are affected.
>
> **What we will do with your answer.** If you grant a licence, we will record its
> exact wording in our evidence registry, display the attribution you specify,
> and stay within the scope you set. If the answer is that IFCT-derived values
> cannot be sublicensed by you, we will not import the dataset, and we will record
> that outcome too. If you would prefer a formal data licence agreement, we are
> willing to sign one, and to discuss a fee.
>
> **What we will not do in the meantime.** We are not importing the dataset, and
> will not, until we hold terms in writing. We would also ask you to consider
> stating a licence on the dataset page itself: the paper's CC BY is widely read
> as covering the data, and we do not believe that reading is safe.
>
> Thank you for your time.
>
> Yours faithfully,
>
> **[NAME]**, **[ROLE]**, **[LEGAL ENTITY NAME]**
> **[email]** · **[telephone]** · **[date]**

---

## Recording the outcome

| Response                                              | Registry change                                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A stated dataset licence (e.g. CC BY 4.0 on the file) | Add the licence to `licensing.ts`, record it verbatim, and revisit the IFCT-derivation question separately before importing |
| A grant that explicitly covers IFCT-derived values    | Add a licence id for the grant and set the source usable, with its attribution and expiry recorded                          |
| "Ask NIN"                                             | Import nothing. Pursue the ICMR-NIN request as the primary route                                                            |
| No reply                                              | **No change.** Availability is not permission.                                                                              |

The second row is the only one that unlocks Indian composition data, and it
requires the grant to address derivatives explicitly. A CC BY label on the dataset
alone would still leave the NIN question open.

---

## Notes for the reviewer before signing

- Confirm the recipient address from the Anuvaad site. Do not send to a guessed
  mailbox.
- Keep question 4 and question 5 separate in any reply you receive. Conflating
  "may you show a nutrient value" with "may you compute a dish from several
  ingredients" is the exact ambiguity that makes the dataset unusable today.
- If Anuvaad answers that the file is CC BY 4.0, ask for that in writing with a
  link and a date, and file it. A third-party project's README is not a grant.
- This enquiry runs in parallel with the ICMR-NIN request. Neither one substitutes
  for the other, and permission from one does not imply permission from the other.
