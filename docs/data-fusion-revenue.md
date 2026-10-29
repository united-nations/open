# CEB revenue processing

The shared user-facing methodology is maintained in
[data/ceb-methodology.json](../data/ceb-methodology.json). See the
[central methodology contract](ceb-methodology.md) for source scope and the
original CEB notes. This document describes the current implementation; dated
investigations under `docs/research/` and `docs/data-quality/` describe their own
historical snapshots.

## Inputs and authoritative totals

All available historical years use the current CEB release. The source register
`public/data/ceb-source.json` records the actual retrieval information, hashes,
coverage, missing amount cells and differences between source presentations.
Available export years come from validated inputs and the manifest, not fixed
year constants.

| File | Use |
| --- | --- |
| `revenue.csv` | Entity × year × main-financing-type controls |
| `revenue_sub_agency.csv` | Complete matching control only when the summary control is incomplete |
| `revenue_government_donors.csv` | Reported government donor detail |
| `revenue_non_gov_donors.csv` | Reported non-government detail, with partial historical coverage |
| `revenue_contrib_type.csv` | Reported contributor-category controls where available |
| `revenue_by_financing_instruments_and_government_contributors.csv` | Source reporting-unit relationships and independent detail checks |

A complete `revenue.csv` control retains precedence when another complete CEB
presentation disagrees about financing classification. The other presentation
fills missing controls only; it does not replace the whole series. Blanks remain
unknown, signed adjustments remain signed, and missing donor observations are
not fabricated as zeros. Source-only observations before system-wide revenue
controls remain partial records and are not published as complete system totals.

## Organization identity and reporting scope

The shared organization map uses adjusted labels consistently: `UN` → **UN
Secretariat**; `UN-DPO`/`DPKO` → **Peacekeeping Operations**; `UNHABITAT`/
`UN-HABITAT` → **UN-Habitat**; `UNWOMEN`/`UN-Women` → **UN Women**;
`UNWTO` → **UN Tourism**. Raw source codes remain available.

CEB's `DPO` alias resolves to the peacekeeping aggregate only in the relevant
CEB paths. The Secretariat department code `DPO` has a different scope and is
not globally renamed. A unit's contributor records are included under its
same-year CEB reporting parent only where it lacks a standalone control and
source parentage or the explicit Standard I reporting-unit list establishes a
unique relationship. Unknown or ambiguous parentage fails validation. Adding
child detail fills out the parent's total; it does not add a second child total.

## Contributor identities and categories

Consolidation is limited to confirmed name aliases and the user-approved generic
private label:

| Source labels | Common label |
| --- | --- |
| World Bank Group; The World Bank Group | World Bank Group |
| Gavi Alliance; GAVI, The Vaccine Alliance | GAVI, The Vaccine Alliance |
| Global Fund to Fight; The Global Fund | The Global Fund |
| Multi Donor Trust Funds; Multi Donor trust funds | Multi Donor Trust Funds |
| Private Donors; Private donor; Private Sector | Private Donors / Private Sector |
| UNDP; United Nations Development Programme | United Nations Development Programme |
| BLOOMBERG PHILANTHROPIES; Bloomberg Philanthropies | Bloomberg Philanthropies |

**USA National Committee** remains one contributor across recipients. Qualifiers
such as **Global Environment Facility (thru UNDP or UNEP)** are retained; that
label is not silently merged with **Global Environment Facility**. Other source
names are retained when no consolidation is needed. Parentheses are preserved.
Known Taiwan aliases use **Taiwan Province of China**. The known `Kosovo**`
marker is removed from the contributor name, with CEB's Kosovo note reproduced
in the shared methodology; unfamiliar asterisks are not removed indiscriminately.
Contributor and location wording are not otherwise forced to match.

Every explicit contributor category stays attached to its source observation.
There are no donor-name-based category overrides or historical category
inferences. Missing detailed categories remain unspecified, while the broad
source government/non-government scope is retained. One contributor may span
several categories, and the export must preserve those separate category amounts
instead of overwriting a donor-level category field. Category display labels use
CEB wording rather than portal-created abbreviations.

## Four financing types and historical code limits

The portal uses the four main financing types reported by CEB: **Assessed
contributions**, **Voluntary core (un-earmarked) contributions**, **Voluntary
non-core (earmarked) contributions**, and **Revenue from other activities**.
Subtype detail remains in downloaded sources rather than forming additional
portal financing types.

The [legacy-code investigation](research/ceb-legacy-revenue-codes/README.md)
found no authoritative crosswalk for R05/R07–R12 in the 2015–2017 non-government
records. The previous blanket assignments are unsupported, especially
R08/R08B/R08b → unearmarked. Preserve the original code and donor amount as an
unresolved financing observation. Do not infer financing from contributor name,
category, numerical prefix, or an aggregate reconciliation that happens to balance.
Known donor totals remain inspectable separately from their unavailable financing
split. Unresolved amounts must not be added on top of already-balanced four-type
controls, which would count them twice.

## Signed reconciliation

Within each controlled entity × year × main financing type:

1. Retain known reported government and non-government detail.
2. Where a CEB contributor-category control exists, calculate **Other {category}**
   as the category control minus all resolved reported detail in that category,
   including reported generic aggregates.
3. Calculate **Unattributed** as the remaining signed difference to the main
   entity/financing control.

The approach preserves reported totals, not a claim that every source
presentation agrees. A negative balance is a reconciliation difference and is
not clipped or asserted to be negative missing funding. **Private Donors /
Private Sector** contains reported records; **Other Private Sector** is the
calculated C06 balance. Do not infer category or financing allocations to erase a
source discrepancy.

Reported named contributors, reported aggregate buckets, and calculated balances
are represented distinctly. Aggregate records remain visible and explorable by
recipient and year. Calculated balances remain visible with an explanation and
are not presented as named institutions. Per-category contributor amounts and
unresolved-financing observations are retained in exports so that a shared donor
identity cannot overwrite source classification.

## Validation and exports

The pipeline validates controlled totals, signed balances, source categories,
financing coverage, reporting-unit relationships and observed years. The donor
contract preserves `categories` and `categoryContributions` per source category,
`record_kind` for reported named/aggregate/calculated entries, and separate
`unresolvedContributions`, `unresolvedTotal`, `financingIncomplete` and
`unresolvedFinancingRecords` where a known donor amount has no supported main
financing allocation. Unresolved records retain source code, source entity,
amount, category and source-row reference. Category-specific trend series remain
separate from whole-contributor series. Donor,
entity-revenue and contributor-trend exports derive from the same validated
records. Finite known records remain included; source missingness and unavailable
reports are disclosed. Independent source tests must test classifications as well
as numerical reconciliation: a balancing residual alone cannot prove attribution.

Rebuild CEB inputs and dependent exports through steps 02, 03, 05 and the relevant
expense/flow stages, followed by 99 when coverage changes. Run
`uv run python -m unittest discover -s python/tests` and the applicable frontend
checks after changing the export contract.
