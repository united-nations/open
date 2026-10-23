# UN Secretariat Expenses Data Fusion

This document explains how CEB and Secretariat expenses data are combined to provide granular breakdowns.

## Current configuration (9 October 2026)

`FUSE_SECRETARIAT = False`: the System view uses CEB-only organization totals for
all years through 2025. The fusion algorithm below is retained as an optional
configuration, not the current published accounting basis. All historical CEB
observations use the updated release. Geographic exports select E06 totals and
exclude E06A/B/C components; they preserve source labels, signed amounts and
unknown country-level labels. Geography begins in 2010, before the organization
expense series, so its early coverage differs. SDG expenses select EXP actuals,
exclude BUD/BUG budgets, and end in 2024; a blank year is not a zero allocation.
File provenance and coverage are published in `public/data/ceb-source.json`.

### SDG reconciliation (23 October 2026)

For each entity-year with CEB SDG actuals available, the Goals export uses the
CEB-only expense backbone as its control. Reported allocations to SDGs 1–17 are
unchanged. Two separate non-goal categories preserve the source/derived distinction:

- `non_sdg`: CEB's reported `x00` actual expenditure (official category Non-SDG).
- `sdg_not_specified`: entity expenditure minus SDGs 1–17 minus reported Non-SDG.
  This calculated balance includes missing SDG reporting and signed reconciliation
  differences. It does not establish that expenditure is unrelated to the SDGs.

No combined Unallocated category is exported, and `x00` is never added twice.
Negative balances are retained. In the current 2024 source, the 19 entities with
nonzero explicit `x00` amounts leave calculated differences within $8 each.
UN Tourism instead reports zero across the SDG dataset, including `x00`, against
$33.36 million of CEB expenditure; that discrepancy remains in Not specified.

The two categories are separate bands below the 17 SDGs in the expenditure view,
with the same transition timing. Neither appears in the square Goals view, but
both are included in its total. Entity sidebars also distinguish both categories.
Exports still cover 2018–2024; no synthetic 2025 SDG dataset is created. The
independent System Flows export retains its reported SDG dimension and discrepancy
fields; it does not use this calculated Goals-view remainder.

### Geographic classification corrections

The current CEB release reports 29 known regions/subregions as `COU` in some
records. The reviewed `GEOGRAPHIC_AREA_TYPES` crosswalk in `python/utils.py`
restores their regional level during preparation, across all available geography
years (2010–2025). Matching ignores case and repeated whitespace but uses only
explicit names; unknown labels are not guessed into a region or country.
Existing `REG`/`SUB` classifications and parent-region labels remain as reported.

Raw CSV bytes are unchanged. Clean records retain the original code in
`source_location_type`; map and flow exports expose `sourceLocationTypes` and
correction notes. All 147,069 rows, labels, entities, years and signed amounts are
preserved. The correction affects 10,650 rows across 29 labels, including 9,607
E06 total records. Geography totals remain unchanged; country-only exports exclude
the corrected regional amounts. This also removes previously misassigned
Southern Africa and Micronesia amounts from South Africa and the Federated States
of Micronesia country totals. Actual country records remain unchanged.

The map uses existing regional coordinates. Unresolved coordinates remain
explicitly disclosed: Channel Islands (2012/2017) and Antarctica (2021) retain
their existing fallback markers. Neither label is added to the crosswalk.
Regression checks run with `uv run python -m unittest discover -s python/tests`.
After preparation, regenerate geographic exports with script 20, country exports
with `export_country_expenses(load_country_expenses())` from script 07, and the
independent flow dimensions with script 19. Available years do not change.

## Data Sources

### CEB Expenses (Primary)
`data/ceb/clean/expenses_sub_agency.csv` - 49 entities, 2011-2025

The CEB reports aggregate figures where:
- "UN" includes 70+ secretariat sub-entities
- "UN-DPO" includes all peacekeeping missions

### Secretariat Expenses (Supplementary)
`data/un-secretariat-expenses.csv` - 153 sub-entities, 2019-2023

Provides breakdown of UN and UN-DPO into constituent parts (OCHA, DPPA, DSS, peacekeeping missions, etc.).

## Entity Overlap Analysis

Five entities appear in both CEB and Secretariat data:

| Entity | CEB | Sec Assessed | Sec Voluntary | Relationship | Resolution |
|--------|-----|--------------|---------------|--------------|------------|
| UNEP | $672M | $21M | $672M | CEB = voluntary only | Add assessed |
| UNODC | $440M | $24M | $417M | CEB ≈ voluntary | Add assessed |
| ITC | $159M | $20M | $115M | CEB includes WTO | CEB only |
| UNHCR | $5,320M | $45M | — | Assessed is 0.8% subset | CEB only |
| UNRWA | $1,461M | $38M | — | Assessed is 2.6% subset | CEB only |

**Rationale:**
- UNEP/UNODC: "Secretariat programmes" - CEB reports voluntary only, assessed contributions from UN regular budget are additional
- UNHCR/UNRWA: "Subsidiary organs" - have autonomous budgets, CEB includes the regular budget subvention
- ITC: Joint UN/WTO entity - CEB captures the complete picture

## Fusion Methodology

### Tier 1: CEB Only (2011-2018, 2024)
For years without secretariat data, use CEB entities as-is.

### Tier 2: CEB + Secretariat (2019-2023)
1. Remove "UN" and "UN-DPO" aggregates from CEB
2. Add all secretariat sub-entities except overlap entities (ITC, UNHCR, UNRWA)
3. Add secretariat assessed amounts for UNEP/UNODC (additive to CEB)

## Output

`data/ceb/fused/expenses.csv`:

| Column | Description |
|--------|-------------|
| year | Calendar year (2011-2025) |
| entity | Entity code |
| amount | Expenses in USD |
| source | "ceb", "secretariat", or "secretariat_assessed" |

## Validation Results

```
2011-2018: CEB only, 34-42 entities, $41-53B
2019-2023: Fused, 179-189 entities, $54-67B
2024: CEB only, 48 entities, $66B
```

## CEB vs Secretariat Totals

Fusion years show slightly lower totals than CEB aggregates. This is expected:

- **CEB data**: Aggregates individual entity financial statements *without adjusting for inter-agency transfers*. When Entity A transfers funds to Entity B, both report the transaction, resulting in double-counting.

- **Secretariat reconstruction**: combines programme-budget regular expense and financial-statement residuals on different bases. A lower total does not establish elimination of inter-entity transfers. See `docs/data-integrity-remediation.md` for the UNEP bridge.

Per CEB documentation: "Revenue and expenses amounts reflect data as reported by organizations in their respective financial statements, without adjustments for revenue and/or expenses associated with transfers of funding between UN organizations."

## Pipeline

```
python/02-fetch_ceb_data.py    → data/ceb/clean/*.csv
python/06-fuse_ceb_expenses.py → data/ceb/fused/expenses.csv
python/07-export_expenses_json.py → public/data/*.json
```

## Function × geographic-level chart

The Locations mosaic uses the function and geography reported together in CEB
`expenses_by_country_region_sub_agency.csv`, selecting E06 totals only. It does
not join independent function and location totals or estimate their intersection.
The four categories use CEB Standard II; a separate Human Rights pillar is not
inferred from those categories. Function attribution is incomplete before 2020,
so the chart covers 2020 onward. Unknown functions, geographic codes, missing
attributions and non-finite amounts fail export rather than being dropped.

`python/21-export_function_geography.py` exports `function-geography-YEAR.json`.
The geographic name corrections in `ceb_data.select_geographic_totals` also apply
here. Regional and subregional records are combined for display. Global and
interregional source records, including enabling functions, stay global and are
not allocated to countries. Reported country/area labels retain their source
scope, including unresolved labels.

Column width represents each function's expenditure; stacked height represents
geographic allocation within that function. Area therefore represents a share
of total geographic expenditure. Negative source amounts remain in net cell totals
and are separately disclosed in tooltips. All current cell totals are positive;
a future negative cell would have no area and would remain in the total and
source table with an explicit notice. A source hash and contributing E06 row
count are retained in each export. The independent function dataset can differ
slightly in its reported totals; this chart never forces those sources to agree.

Regenerate with `uv run python python/21-export_function_geography.py`, followed
by `uv run python python/99-generate_manifest.py`. Regression checks are in
`python/tests/test_function_geography.py` and
`src/lib/tests/functionGeography.test.mjs`.
