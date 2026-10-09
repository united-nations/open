# CEB 2025 compatibility investigation and integration plan

Investigated 9 October 2026. Implementation is now complete locally; see [the integration review](../data-quality/ceb-2025-review.md). The findings below preserve the investigation and implementation plan; pre-fix failures are historical observations, not the final validation status.

## Recommendation

Integrate 2025 revenue, contributors, organization spending and functions using
the existing architecture. Add 2025 geography after selecting its total-expense
records. Keep Goals at 2024: the current SDG download contains no 2025 observations.
Use the complete current CEB release, including its revised historical records,
as requested on 9 October 2026. Make reconciliation and missing-value handling
reproducible before regenerating every available year. The previous append-only
recommendation is superseded; its dry run remains useful compatibility evidence.

This is a small pipeline and disclosure update, not a new frontend data model.
An unmodified fetch/clean/rebuild is unsafe: geography would be counted twice,
the cleaner rejects the missing SDG year, several exporters stop at 2024, and
wholesale source replacement fails existing historical revenue reconciliation.

## Sources and evidence

- [Official downloads](https://www.unsceb.org/data-download/): all nine files
  consumed by step 02 remain at the existing `/assets/data/FS/` URLs.
- [CEB release notes](https://www.unsceb.org/statistics/financial-statistics/):
  ITC did not submit 2025 data; Secretariat 2025 revenue breakdowns were revised
  on 8 October 2026. The log also records PAHO and UNFPA 2024 updates in September
  and October. These are financial-year 2025 observations, not a 2025 publication date.
- [Total revenue](https://www.unsceb.org/statistics/total-revenue/) and
  [total expenses](https://www.unsceb.org/statistics/total-expenses/) agree with
  the downloaded controls at whole-dollar precision.
- [Current financial reporting standards](https://www.unsceb.org/assets/media/pages/UN-Data-Standards-for-system-wide-reporting-of-financial-data.pdf).
- Reproducible checks: [companion notebook](ceb-2025-compatibility.ipynb).
  Immutable CSVs, download hashes, profile and dry-run log are retained locally
  in ignored `audits/ceb-2025/`. The prior cleaned baseline is archived under
  `audits/ceb-2025/before-refresh/clean/`; `data/ceb/clean/` now contains the refreshed
  publication. Do not treat the old cached raw files as the published baseline.

Downloaded totals: revenue **$62,970,982,927.21**, expenses
**$64,396,743,592.99**. Both have **47 reporting agency codes**, versus 48 in
2024; ITC is the missing agency. Do not carry its 2024 value into 2025 or describe
its absence as zero spending. Inter-agency transfers remain uneliminated.

## Compatibility findings

| Area | Observed change | Integration consequence |
| --- | --- | --- |
| Revenue and entity revenue | Same required columns, four financing categories and 12 detailed subtype codes as 2024. | Existing classification and reconciliation work for 2025. |
| Contributor types | Same 14 contributor codes as 2024. | Reuse the existing C-code mapping; no new category system. |
| Non-government donors | Additional `rev_name` financing-label column; the current download has 54 donor labels for 2024 and 10 for 2025. Our cached 2024 source also had 10. | Current 2024 detail is richer than 2025, but this is not a reduction from the portal's cached label count. Missing names do not establish ceased contributions. |
| Organization expenses | Same six columns and four expense functions. 2025 has 79 source rows rather than 9,838 in 2024. | Group by agency/year as today; source row count is not entity count. Function export accepts 2025. |
| Geography | Adds `expenses_type`. 2025 includes E06 and E06A/B/C together. Location types remain COU/REG/SUB. | Select E06 for spending totals before every geographic aggregation. |
| SDGs | Same schema, goals 1–17 and X00/x00; maximum source year remains 2024. | No 2025 Goals file or inferred allocation. Preserve dataset-specific year availability. |

### Geography: high-severity aggregation hazard, high confidence

The 30,152 geography rows for 2025 sum to **$128,793,487,186.67**.
The **11,828 E06 rows** alone sum to **$64,396,743,594.12**. E06A, E06B and
E06C together sum to essentially the same amount. Adding total and components
doubles spending. Existing steps 07, 19 and 20 currently ignore this dimension.

E06 agrees with organization expense controls to **$1.14 net system-wide** and
at most **$2 per agency**. Preserve and disclose these differences; do not
rewrite source amounts to force equality. The numerical relationship establishes
the aggregation hazard, but the precise meaning of the component codes was not
verified in the public standards PDF. Confirm their definitions before exposing
them as a new financing breakdown.

The current geography download also changes historical entity attribution and
location allocations. A comparison on year/agency/location/level/region finds
8,104 changed keys above one cent in 2013–2024. This includes label changes and
offsetting reclassifications, not 8,104 independently established errors.
Examples include old DPKO labels and movements between UN, UN-DPO and UN-Habitat.
Adopt the current historical geography after reviewing the changed classifications
and handling aliases in the shared mappings. Decide supported geographic years
from source coverage, including whether to expose newly supplied 2010–2012 data;
the funding and SDG views need not have the same starting year.

### Revenue: compatible 2025, historical refresh needs reconciliation

The existing step 03 passes entity-by-financing-instrument reconciliation both
for 2025 alone and for promoted history plus 2025. After overriding step 05's
year list in the isolated test, it exports 2025 donors and entity revenue in the
existing JSON shapes. Historical 2024 entity revenue totals remain unchanged
under this append policy.

Replacing all historical rows with the fresh download fails step 03 for 2019
UNDP earmarked revenue by **$303,578,583.11**. A missing Austria/UNDP donor amount
propagates NaN through the residual calculation. Other historical null amounts
appear in revenue/contributor-type files. These must be quarantined and reconciled
against authoritative controls; do not interpret a blank as a confirmed zero.
The initially identified four blank amount cells in three raw files are currently replaced with zero
in the promoted clean files. This treatment is not implemented in step 02 and
must not survive only as a cached-file edit. The detailed government-financing file also repeats the Austria blank: five cells in four files are recorded by the implemented provenance register. Preserve the raw blanks, distinguish
missing detail from zero, and reconcile available amounts to independent controls.
The $303.579 million failure is a reconciliation error caused by missing-value
propagation, not evidence that Austria's blank contribution was worth that amount.

Follow-up comparison with cached raw sources confirms that these same missing
amounts already existed there. They are not newly introduced regressions. The
promoted clean sources contain prior reconciliations; overwriting them would
reintroduce known source limitations. In contrast, the geographic allocations
do differ from the cached raw download for the same historical years.

`rev_name` is the readable financing label (for example, R03E is labelled
Voluntary non-core (earmarked) contributions), not a donor name. It cannot recover
missing donor identities. The live contributor-type controls retain nonzero
2025 amounts for NGOs, public-private partnerships and academic contributors,
even though those codes are absent from the named non-government donor file.
For example, NGO totals rise from $2.482 billion in 2024 to $2.498 billion in
2025, and foundation totals rise from $0.926 billion to $1.456 billion. Therefore
fewer named labels do not imply lower category totals. The current file also
has only 10 donor labels for 2022 and 2023: 2024 is unusually detailed relative
to these neighboring years and our cached 2024 snapshot.

Fresh 2024 donor detail adds PAHO and revises UNFPA; the promoted headline entity
controls already contain PAHO. Consequently these updates improve attribution
and reduce residuals rather than automatically adding revenue to existing totals.
Include these updated details in the complete refresh while preserving the
independent entity controls and checking the resulting residuals.

2025 still requires signed unattributed reconciliation rows: **$1.893 billion**
in absolute residual amounts, but **−$5.616 million** net. The small net masks
offsetting discrepancies. Preserve residuals and existing disclosures; successful
total reconciliation does not establish complete or accurate donor attribution.

Review three mapping cases before promoting contributor detail:

- Government donor `MISC` is not recognized by the current generic-donor rules.
  It should not appear as a named Member State; verify its relation to existing
  miscellaneous/refund buckets and retain signed corrections.
- `The Chinese Academy of Engineering` appears in the government file ($100,000
  to UNESCO). Verify classification before assigning a canonical category.
- The non-government file contains a `UN-Tech Bank` private-sector adjustment of
  **−$468.11**, with no same-code 2025 revenue control or sub-agency record.
  Step 03 does not iterate this orphan entity. Record and resolve its parent
  attribution from source evidence rather than silently dropping or guessing it.
  Common donor variants such as GAVI, World Bank and Green Climate Fund are
  already covered by `python/utils.py`.

### Dataset coverage and frontend behavior

The live code has `FUSE_SECRETARIAT = False`, and the published manifest has no
fusion years. Keep this setting. Repository prose describing 2019–2023 fusion
does not describe the current build. CEB 2025 does not extend the independent
Secretariat budget, audited-statement or trust-fund datasets, or UNINFO coverage.

Step 19 currently intersects expense, geography and SDG years, so System Flows
remains at 2024 even after adding 2025 expenses. Keep that behavior for the first
release and label its latest complete year. Supporting 2025 non-goal flow lenses
is optional follow-up work requiring availability by dimension.

EntitySidebar currently requests the selected year's SDG file and converts a
failed fetch into an empty breakdown. For 2025, explicitly show SDG breakdown
unavailable and avoid the missing-file request. Country and SDG UNINFO panels
remain 2024-only. Do not relabel those observations as 2025.

## Implementation sequence

1. **Freeze and validate the release.** Keep the immutable snapshot and hashes.
   Use the current snapshot for all available years of each dataset. Preserve the
   previous snapshot for comparison and rollback. Record the source vintage per
   file/year. Assert required columns,
   finite amounts, accepted codes, entity coverage and control reconciliation.
   Integrate missing-amount handling into the pipeline: preserve missingness,
   aggregate known amounts without propagating NaN, reconcile against independent
   controls and retain unidentified differences explicitly. Inventory previous
   raw-to-clean adjustments and reapply only source-supported rules; do not blindly
   carry old replacements into revised data. Resolve the three donor/entity mapping
   cases above or document a supported
   unresolved disposition that preserves amounts and donor uncertainty.
2. **Make year handling dataset-specific.** In step 02 replace the universal
   `last_expected_year` assertion with explicit expected availability per dataset;
   detect years from validated records and fail if a dataset unexpectedly loses
   historical coverage. Steps 05 and 09 hard-code ranges ending at 2024: derive
   their year lists from validated source coverage. In step 06 replace the exact
   `range(2011, 2025)` equality with source-derived expected years. Its current
   failure reads `Missing years: set()` when 2025 is added, because it actually
   rejects an extra year. Keep historical minimum-coverage checks.
3. **Select geographic total records centrally.** Add an existing-style shared
   helper used by steps 07, 19 and 20: retain E06 for the current schema and fail
   on unknown or missing expense types. Accept legacy schemas only when explicitly
   reading an archived vintage for comparison, with its provenance retained.
   Preserve COU/REG/SUB, signed adjustments, labels and source anomalies. Validate
   geography totals against agency controls with an explicit rounding tolerance
   justified by the observed differences. Do not deduplicate identical source
   rows: repeated transaction rows are not evidence of accidental duplication.
4. **Regenerate the dependent exports.** Run steps 03, 05, 06, 07, 09, 18, 19 and
   20, then 99, after source promotion and fixes. This adds `donors-2025`,
   `entity-revenue-2025`, `entity-spending-2025`, `country-expenses-2025` and
   `geographic-expenses-2025` JSON; extends contributor/entity trends and function
   expenses; keeps SDG and complete System Flows coverage through 2024. Do not
   rerun unrelated Airtable, Secretariat or UNINFO fetches for this release.
5. **Update coverage disclosures.** Use the manifest to avoid missing SDG
   requests; show 2025 ITC non-reporting, reduced named-donor detail and download
   vintage. Ensure contributor and organization selectors handle missing values
   as unavailable. Update stale year references in data-availability and fusion
   documentation. Retain the distinction between source net totals and chart
   areas that cannot render negative values.
6. **Verify and review the static export.** Add meaningful regressions for total
   plus component geography rows, unknown codes, absent SDG years, historical
   null amounts, orphan donor entities and source-derived year ranges. Run Python
   regressions and relevant citation checks, TypeScript, lint, build and existing
   browser checks. Browser-check 2025 Organizations, Contributors and Locations,
   trend endpoints, ITC unavailability, 2025 organization SDG unavailability, and
   unchanged 2024 Goals/System Flows/UNINFO behavior. Review the generated diff:
   every historical change should be traceable to the current source or a documented
   reconciliation rule, with differences reviewed by year/entity/category/location.
   Manifest latest defaults should move to 2025 only for extended datasets.

## Separate follow-up work

- Historical attribution, missing amounts and geographic revisions are part of
  the main refresh, not deferred follow-up work. The remaining optional work is:
- Integrate 2025 SDGs when CEB actually publishes them, then extend complete
  System Flows coverage. Do not fill missing SDGs with zero or 2024 allocations.
- The download page also offers GEM and thematic funds. The inspected GEM file
  has 147 rows for 2025; thematic funds end in 2024. These are optional new views,
  not prerequisites for the annual update or replacements for our trust-fund data.

## Verification limits

These checks establish CSV/schema compatibility and transformation behavior,
not independent verification of every reported financial statement. At the investigation stage, no production
source, exporter, frontend or public JSON had been changed. The subsequent implementation and final checks are documented in the integration review. The dry run used a temporary
directory and an in-memory override of step 05's year list; step 06's obsolete
year assertion was observed failing. Geographic filtering and browser behavior
are proposed changes, not completed implementation tests.
