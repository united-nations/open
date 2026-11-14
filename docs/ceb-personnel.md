# CEB personnel data

The staff views use the five public HR CSVs on the [CEB download page](https://unsceb.org/data-download/). They have a separate reporting scope and pipeline from CEB financial statistics. The current release covers 2017–2025. Staff views on Organizations and Locations are available in all site profiles.

## Sources and reporting scope

The [CEB HR codebook v1.0, 27 October 2026](https://unsceb.org/assets/data/HR/ceb_hr_codebook_v1.0.md?v=1.0) is preserved in `data/ceb/hr/ceb_hr_codebook_v1.0.md`. It defines staff as people who, on 31 December, either held a contract of at least one year or had been employed for at least one year. Temporary appointments qualify after one year of employment. Consultants, individual contractors and other affiliates are excluded. These are year-end headcounts, not annual hires or full-time equivalents.

| Source | Observation dimensions | Portal use |
| --- | --- | --- |
| [organization.csv](https://unsceb.org/assets/data/HR/organization.csv) | Organization, entity, year | Treemap, headcount history and entity detail |
| [composition.csv](https://unsceb.org/assets/data/HR/composition.csv) | Organization, category, subcategory, grade, sex, year | Organization staff categories and gender trends |
| [duty_station.csv](https://unsceb.org/assets/data/HR/duty_station.csv) | Organization, duty station, year | Duty-country map, chart, list and station detail |
| [nationality.csv](https://unsceb.org/assets/data/HR/nationality.csv) | Organization, nationality, year | Nationality breakdown in organization sidebars |
| [others.csv](https://unsceb.org/assets/data/HR/others.csv) | Sex, age, age band, tenure, tenure band, year | System-wide age and service trends |

The annual reports contain additional appointment, funding, allowance and other tables absent from these CSVs. The exports retain all five machine-readable datasets. The public methodology and report links are in `/about/#personnel-methodology`.

Important interpretation rules:

- **HR and financial organization boundaries differ.** HR `UN` includes departments, missions, UNEP, UNODC and UN-Habitat as entity detail. Do not add these children again as independent organizations, equate HR UN with financial UN, or infer staffing-to-finance ratios. CEB, JIU, ICSC and UNJSPF are separate CSV organizations; annual reports group CEB and JIU under UN. Preserve the CSV grouping.
- **Reported staff are not necessarily an organization's entire workforce.** For example, UNRWA reports 257 staff in 2025. Do not invent an area-staff exclusion or claim comprehensive employment coverage without further source evidence.
- **Age and tenure are system-wide only.** Their source has no organization dimension. Exact age/tenure integers and source bands are retained; unknown values remain null with their original band.
- **Unknown sex remains explicit.** Retain F, M and NA/blank observations. Shares use the complete relevant headcount, including unknown sex. UG means all grades above D-2. Staff categories are separate career structures, not equivalent ranks.
- **Missing combinations and missing coverage differ.** An absent combination within a reported source year means no staff were recorded for that combination. An absent organization-year or dataset is unavailable, not a zero. Organization selections must not silently fall back to system totals.
- **Geographic dimensions are independent.** Nationality and duty station do not establish nationality-to-duty flows. Maps aggregate by ISO country using `python/country_coordinates.py`; bubbles are country centres, not office coordinates. Records without coordinates retain their counts and remain accessible through country search and sidebars. In 2025, 22 nationality headcounts are unmapped.
- **Current sources apply to every historical year.** Current organization, entity and location labels are used throughout. Changes over time can reflect reporting participation or administrative revisions, not just hiring and departures.

## Regeneration and validation

```bash
# Regenerate from tracked inputs in data/ceb/hr/raw/.
uv run python/27-export_ceb_personnel.py
uv run python/99-generate_manifest.py

# Fetch and validate a new release before promoting it.
uv run python/27-export_ceb_personnel.py --fetch
uv run python/99-generate_manifest.py
```

The exporter supports `--raw-dir` and `--out-dir` for isolated validation. Downloads have a 90-second timeout. Complete candidates and their URL/hash/retrieval records are retained in ignored `data/ceb/hr/snapshots/`; candidates must pass validation before replacing tracked raw files.

Both ordinary regeneration and refresh validate schemas, integer nonnegative counts, unique complete dimension keys, sex codes, age/tenure values, matching nonempty year partitions and previous year/organization coverage. They reconcile all five sources at system and organization level and compare gender totals across composition and age/tenure. Invalid or blank counts fail instead of becoming zero. Failed validation must not replace raw sources or existing exports. Any exceptional correction to registered historical coverage requires investigation before changing the baseline.

Source observations are retained one-for-one, except that organization/entity rows are nested and unknown age/tenure codes become null. Display labels reuse `normalize_entity` from `python/utils.py`; original organization and entity identifiers remain available. `ENTITY=NA` is an additive unknown-entity observation, not another organization total. Successful exports remove obsolete annual personnel files before manifest regeneration, without removing unrelated datasets.

## Outputs and provenance

- `public/data/personnel-YYYY.json` retains organization/entity headcounts, composition, nationality, duty stations and age/tenure observations. `quality.organizationDifferences` records reconciliation diagnostics; nonempty differences reject export.
- `public/data/personnel-trends.json` contains annual system and organization counts plus gender, age-band and tenure-band counts. Relative histories calculate percentages from these counts, including unknowns; absent organization-years remain null gaps. Isolated reported years use stacked columns rather than connecting across unavailable years.
- `data/ceb/hr/source.json` and `public/data/personnel-source.json` record source URLs, SHA-256 hashes, inspected time, columns, row counts, years, organization coverage, unknowns, totals and codebook version/hash. `retrievedAt` is present only with a matching fetch receipt; inspection time is not an acquisition timestamp.
- `public/data/manifest.json` discovers available snapshot years from generated annual files.

All five sources reconcile for every current year. Useful release controls are 106,274 staff in 2017, 131,557 in 2024 and 120,635 in 2025. The 2025 composition includes seven staff with unknown sex; tenure includes one unknown. Preserve these observations without rescaling or allocation.

## Organization hierarchy and charts

The treemap shows the reported UN entity children directly in the Secretariat
row, without a custom mission, support or department classification. Their
parent total remains available in the UN sidebar but is not another tile.
Original entity codes and counts, including residual staff of closed missions
and unknown entities, remain unchanged. Entity observations provide headcounts
only: organization-level demographics and geography must not be allocated to
children. The HR entry DPO is the Department of Peace Operations, not the
financial UN-DPO aggregate.

Organizations has a Financing / Staff switch for the overview and one workforce trend chart with Overall, Gender, Age and Length of service views. Locations has an Expenditure / Staff switch and offers Map, Chart, and List for staff. The organization hierarchy follows the reporting scope of the active source. Staff geography uses duty stations and reports organizations at the level available in that source.

The standalone Personnel page is removed. The exports retain nationality, grade and demographic snapshots. Organization sidebars show staff categories and nationality. Age and length-of-service trends are system-wide. Country deep links restore the staff map and organization scope. Organization and entity links open the staff treemap. Closing a sidebar cancels pending deep links and restores focus.

Age and service trends use static pill legends. Overall and Gender trends have toggleable legend pills. Hiding a category preserves the percentage denominator. A unique country-search match opens with Enter, including unplotted countries.

## Checks

```bash
python3 -m unittest discover -s python/tests -p test_ceb_personnel.py
node --test src/lib/tests/personnel.test.mjs src/lib/tests/featureProfiles.test.mjs
npm run typecheck
npm run lint
npm run build
node scripts/check-feature-export.mjs
# Serve out/ locally, then run the Personnel interaction regression.
PORTAL_URL=http://127.0.0.1:8766 node tests/browser/personnel.mjs
```

Python tests cover source-grain/count preservation, reconciliation, unknowns, rejected refreshes, coverage loss and stale output removal. JavaScript tests cover grade order, scales, percentage denominators and feature profiles. Browser checks cover chart controls, unavailable years, static legends, deep links, cancellation, return focus, loading recovery and mobile layout. Check that staff views are available in every profile and the separate Personnel route is absent.

Known verification limitation: during development, the broader `tests/browser/feature-profiles.mjs` suite completed route-availability checks but intermittently reported React hydration error #418 on non-Personnel pages. Its origin remains unresolved; the retained no-browser-errors assertion should not be weakened. The Personnel-specific regression passes independently.
