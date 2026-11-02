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
| `revenue_government_donors.csv` | Reported government donor detail |
| `revenue_non_gov_donors.csv` | Reported non-government detail, with partial historical coverage |
| `revenue_contrib_type.csv` | Reported contributor-category controls where available |
| `revenue_by_financing_instruments_and_government_contributors.csv` | Source detail retained for independent checks |

Revenue controls are the sums of reported amounts in `revenue.csv`, grouped by
organization, year and main financing type. Source blanks remain unchanged;
a group with no reported amount fails validation. Signed adjustments retain
their signs. Source-only observations before system-wide revenue controls remain
partial records and are not published as complete system totals.

## Organization identity and reporting scope

The shared organization map uses adjusted labels consistently: `UN` → **UN
Secretariat**; `UN-DPO`/`DPKO` → **Peacekeeping Operations**; `UNHABITAT`/
`UN-HABITAT` → **UN-Habitat**; `UNWOMEN`/`UN-Women` → **UN Women**;
`UNWTO` → **UN Tourism**. Raw source codes remain available.

CEB's `DPO` alias resolves to the peacekeeping aggregate only in the relevant
CEB paths. The Secretariat department code `DPO` has a different scope and is
not globally renamed. Contributor detail is joined to the explicitly reported
recipient and same-year revenue controls. For the UN Secretariat, the donor
source recipient is `UN`. Independently reported units retain their own identity.
Source category totals explicitly reported under `UN` supply the category
controls, and missing contributor detail is reconciled through signed balances.
Full reporting-unit detail remains available in the tracked raw files.

The source includes department-level contributor records. In 2025 these total
**$10,430,932.67**, compared with **$6,520,304,634.20** explicitly labelled `UN`
(0.16% of their combined reported amount), excluding calculated balances. The
small latest-year amount and unverified overlap between recipient presentations
favour the simpler explicit-recipient scope. Historical coverage varies: the
separately labelled records total $831,915,130 in 2022, or 13.0% of the combined
reported contributor amount. These source-label shares describe available
records rather than the units' full income. The same scope is used across years.

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

In the current CEB contributor file, the generic private donor label is
**Private Donors** in 2015–2021 and 2023–2024, **Private donor** in 2022, and
**Private Sector** in 2025. These labels share the display name above while
reported amounts and observation-level contributor categories are preserved.

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
found no authoritative crosswalk for historical R05/R07–R12 contributor codes.
Their original amounts and codes remain intact and are displayed as a fifth
**Other financing instrument** financing category in contributor views, using consistent gray.
Filters and legend entries appear only when the displayed data contains it.

For affected organization-years, the additive contributor ledger comprises
classified donor amounts, unresolved donor amounts, and a signed Unattributed
balance also marked Other financing instrument. That balance is organization revenue minus all
reported contributor amounts. No financing type is guessed for these amounts.
The entity revenue export's `by_type` comes independently from CEB's main revenue
file and retains its four reported types; donor rows include the fifth display
category. Both presentations retain the same organization revenue total. The
All contributors financing trend uses the four main revenue controls directly;
filtered contributor/group financing trends use the additive contributor ledger.
The internal `Unresolved` key remains stable; its user-facing label is
**Other financing instrument**. Source-code records remain in the exports and
raw data, but are not displayed in separate explanatory tables.

## Signed reconciliation

For organization-years without unresolved contributor financing, within each
controlled entity × year × main financing type:

1. Retain known reported government and non-government detail.
2. Where a CEB contributor-category control exists but no contributor records
   identify that category for the organization/year, retain the source total
   under its category name as a reported aggregate, e.g. **No contributor**.
   Check presence of detail across financing types, including zero, blank and
   unresolved records; a net-zero breakdown is still a breakdown.
3. Where category detail exists, calculate **Other {category}** as the category
   control minus all resolved reported detail in that category, including
   reported generic aggregates.
4. Calculate **Unattributed** as the remaining signed difference to the main
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
records. Finite known records for eligible reporting units remain included;
source missingness and unavailable reports are disclosed. Independent source tests must test classifications as well
as numerical reconciliation: a balancing residual alone cannot prove attribution.

Rebuild CEB inputs and dependent exports through steps 02, 03, 05 and the relevant
expense/flow stages, followed by 99 when coverage changes. Run
`uv run python -m unittest discover -s python/tests` and the applicable frontend
checks after changing the export contract.
