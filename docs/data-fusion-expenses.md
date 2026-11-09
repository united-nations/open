# CEB expense, function, geography and SDG processing

The shared user-facing methodology is maintained in
[data/ceb-methodology.json](../data/ceb-methodology.json). See the
[central methodology contract](ceb-methodology.md) and the source register
`public/data/ceb-source.json` for current release and coverage information.

## CEB-only system expenses

System organization totals use CEB `expenses_sub_agency.csv`. They do not replace
`UN`/`UN-DPO` with separately reconstructed Secretariat expenses, and they do not
add Secretariat-assessed amounts for UNEP or UNODC. Step 06
(`python/06-export_ceb_expenses.py`) exports CEB organization totals directly;
there is no Secretariat fusion mode. Secretariat and UNINFO views remain
separately sourced; their scopes and accounting bases are not interchangeable with CEB.

Adjusted organization labels and explicit parent relationships follow the shared
maps described in [revenue processing](data-fusion-revenue.md#organization-identity-and-reporting-scope).
A reporting parent and its detail are not added together as separate totals.
Signed source amounts remain included. The portal does not independently remove
inter-agency transfers or infer an alternative consolidated accounting basis.

## Selecting expense observations

- Geography uses **E06** total-expense records. E06A/B/C are overlapping components
  and are excluded from the geographic total.
- Goals includes **EXP** accrual expenses and **BUD** / historical **BUG**
  budgetary-basis expenditure. These represent reported spending under different
  accounting bases, not planned budgets. Preserve the original codes in goal
  exports (`financialInformationTypes`), including mixed-basis entity-years.
- Function totals use the CEB function classification on organization expenses.
- The function × geography chart uses the dimensions jointly reported in the
  geographic source. It does not estimate the intersection from separate totals.

Do not sum independent source presentations as if they supplied additional money.
Each view retains its own available source years. Missing reports and unavailable
breakdowns are not zeros and are not filled by another year. Updated source
coverage is derived from the current inputs rather than hardcoded in prose.

## SDG reconciliation

Reported allocations to SDGs 1–17 are retained. Two separate non-goal entries
preserve reported classification versus calculated coverage:

- **Non-SDG** (`non_sdg`) is CEB's explicitly reported **x00** actual expenditure.
- **Not specified** (`sdg_not_specified`) is total CEB entity expenditure minus
  reported SDGs 1–17 and reported Non-SDG actual expenditure.

The signed calculated difference includes missing reporting and source
reconciliation differences. It does not establish whether expenditure is relevant
to an SDG and is not distributed among individual goals. Source-provided x00 is
never added twice. A blank SDG year is unavailable; do not create an empty year
to match the organization dataset's selector.

CEB Standard V (March 2024 edition, printed p. 38) permits a budgetary-basis
exception to accrual reporting, subject to reconciliation with financial
statements, full operational coverage, donor-reporting consistency and consistent
use over time. The February 2026 code list's Miscellaneous sheet defines EXP as
"Expense (IPSAS/IFRS)" and BUG as "Budgetary expenditure"; the SDG CSV uses BUD
as well as historical BUG. BUD is treated as the source's budgetary-expenditure
variant. An entity may have both bases in one year (IMO in 2021); retain all
reported amounts rather than assuming the two codes duplicate each other.

Sources: [CEB Standard V](https://unsceb.org/assets/media/pages/UN-Data-Standards-for-system-wide-reporting-of-financial-data.pdf#page=39)
and [CEB code lists](https://unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data/).
Small net system balances can conceal offsetting entity discrepancies. Keep
signed Not specified balances; do not discard or redistribute them as rounding.
Run `uv run python python/sdg_reconciliation.py` for all available SDG years:
it reports separate revenue and expenditure gaps and the gross entity differences
before positive and negative balances offset. Revenue sums known source amounts
using the portal's financing controls and reports missing source cells separately.

## Historical functions

Retain the exact source category **Other (combined Normative and Technical
Cooperation)** separately from the current four CEB functions. Historical totals
and trends include that category without redistribution. Comparisons spanning
the classification change are qualified. Source name variants differing only in
Specialised/Specialized spelling can share a matching key while source wording
is retained for display and traceability.

## Geographic reporting levels

The reviewed `GEOGRAPHIC_AREA_TYPES` list corrects known regions/subregions that
CEB coded **COU**. Matching permits whitespace and case variants of explicit
reviewed names; it does not fuzzy-match arbitrary locations. This prevents
**Southern Africa** and **Micronesia** from being assigned to the individual
countries South Africa and the Federated States of Micronesia.

Raw CSV files are unchanged. Prepared records retain the original reporting code
in `source_location_type`; geographic exports retain source labels/codes and
correction information. The correction changes the reporting-level breakdown,
not the signed total. Existing classifications outside the reviewed correction
remain source observations. Conflicting parent-region labels are preserved with
source-region metadata and a conflict note. When country records merge by ISO3,
`sourceRegions` retains every parent with its signed total and entity amounts.
Competing parents leave `sourceRegion` null and place the country in
**Unresolved geographic classification**, rather than assigning the combined
amount to the first parent. Unresolved display grouping does not silently
reassign the record to another named region. Ambiguous and unresolved locations retain their
money without being guessed into a country. Regional and global amounts are
not distributed among countries.

Country labels are resolved to ISO3 using `country_converter` for map/sidebar
lookup. Country-only exports use the converter’s short names and round aggregate
amounts to cents; geographic marker exports retain source labels apart from
explicit encoding, terminology and reviewed region-name normalization. The agreed Taiwan terminology override
also applies to geographic labels. Contributor and location naming conventions
otherwise remain separate. Display marker positions are navigation aids, not
source evidence for expenditure at a coordinate or territorial boundaries.
Existing regional/global/fallback placements remain illustrative display metadata.

## Independent dimensions and presentation

Organization revenue by contributor and organization expenditure by location,
function and goal remain independent reported dimensions. A flow chart does not
trace a donor's money to a country or SDG. No donor × country, donor × SDG or
SDG × country allocation is constructed through proportional splitting. UNINFO
cross-dimensional information is separately identified as UNINFO.

All displayed source amounts are nominal USD; CPI adjustment is disabled. Shared
CEB source notes and the processing summary appear on About. Data pages link to
that section and keep selected-year data details locally. The general
CEB note includes the source's Kosovo qualification; there is no separate
Kosovo-specific notice on individual records.

## Pipeline and checks

- Step 06 exports CEB-only organization expenses.
- Step 07 exports organization, country and SDG views.
- Step 18 exports organization function totals.
- Step 19 exports independent reported flow dimensions and signed differences.
- Step 20 exports geographic records at their reporting levels.
- Step 21 exports the jointly reported function/geography dimension.
- Step 99 derives available years from exports when coverage changes.

Run `uv run python -m unittest discover -s python/tests` and applicable frontend
checks. Tests preserve signed source amounts, source classifications, non-goal
SDG distinctions, historical functions, valid organization aliases, reporting
parents and unavailable-year semantics. Do not assert geographic/entity equality
beyond the source's own reported precision and coverage.
