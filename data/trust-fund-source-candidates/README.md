# Separately reported Secretariat XB source extracts

The four-entity extraction and frontend integration are implemented and
reproducible. Broad XB coverage retains all selected account/segment categories,
including support and employee-benefit accounts, without asserting that every
category is legally a trust fund. Published amounts use direct report extracts.

The source set contains 12 inspected PDFs. Detailed audited tables cover 2023
and 2024; comparative observations are retained under their own period years.
ARWO XB aggregate controls cover all four entities for 2019–2025. Earlier/later
audited fund details and missing contributor exports are not manufactured.

## Run

From the repository root, with the project's uv dependencies installed:

```bash
uv run python python/22-extract_secretariat_xb.py
uv run python -m unittest discover -s python/tests -p 'test_secretariat_xb_sources.py'
```

The command uses the retained PDFs without a network request. It verifies the
source hashes, PDF completeness and document symbols before extraction. An
unsupported audited year/layout fails explicitly. New vintages require reviewed
page/table definitions and validation; the current adapters target 2023/2024.

## Sources and outputs

- `source-manifest.json`: original URLs, document symbols, issuer, reporting
  year, PDF page inventory, retrieval date, SHA-256 and extraction status.
- `raw/`: original public source PDFs. An ITC financial-report chapter is stored
  separately because the accounts PDF does not contain that chapter for 2024.
- `stage1/tables.jsonl`: 50 selected physical tables with literal cell text,
  column bounds, word coordinates and source IDs. Prose-derived ITC delivery
  figures cite their original paragraph/page in the normalized facts.
- `stage2/objects.csv`: source account, segment, pillar, window, rollup and
  adjustment identities. They are not all asserted to be legal trust funds.
- `stage2/statement-facts.csv`: 3,445 long-form observations, including UNEP
  annex account movements, revenue, expenses and net assets; financial performance
  by segment/pillar; ITC entity performance and reported gross XB expenditure;
  and UNODC's RB expenditure control. Regular-budget observations are retained
  for reconciliation and explicitly marked, not classified as XB funds.
- `stage2/contributor-observations.csv`: 1,421 long-form observations from the
  retrieved Habitat and ITC donor tables. This count includes comparative years,
  components, printed totals and subtotals; it is **not a distinct donor count**.
- `stage2/arwo-controls.csv`: 28 original entity/year XB amounts from the
  existing CSVs, with file hashes, source row, original reference and notes.
  These do not claim independent audit verification for 2019–2025.
- `stage2/derived-xb-controls.csv`: audited expenses less audited RB expenditure,
  with both source citations and the calculation. Includes comparative source
  observations; it does not choose a preferred vintage or replace ARWO.
- `stage2/source-coverage.csv`: which sources supplied supported tables.
- `stage2/counterparty-review.csv`: source labels requiring manual identity review.
- `quality-profile.json`: 633 validation results, rounding tolerances, source
  differences, printed blanks and missing source coverage.

All amounts use exact decimal USD, with the printed unit/text retained. ITC's
appendix uses periods as thousands separators; Habitat's annexes switch between
USD and thousands of USD. Negative amounts and dashes are preserved. A blank
source cell remains null, not zero. The citation includes document, URL, hash,
physical PDF page, table, row/column and coordinates; `source_physical_row` refers
to the row in the literal table, while `source_row` is the numeric record ordinal.
For a wrapped amount the physical source row/y can differ between columns.

`source_page_url` opens the original PDF at that observation's physical page
using `#page=N`. Derived XB controls retain a `page_url` for each supporting
expense/RB citation rather than implying that both values occur on one page.
ARWO CSV controls have file/row provenance; no PDF page is invented for them.

## Do not sum incompatible rows

The extraction deliberately preserves different measures and aggregation levels:

- Fund leaves and their printed rollups are separate object kinds.
- Segment totals, eliminations and entity totals are not additive to one another.
- Contributor window/segment components and their total columns are both
  retained. `is_aggregate_column` identifies the total columns.
- Contributor `row_kind` distinguishes named rows, group subtotals, printed
  totals and non-donor categories. Do not count the latter three as named donors.
- `is_cross_year_total` distinguishes Habitat's historical sum column from an
  annual observation. `is_comparative` identifies other prior-year observations.
- Source vintages remain separate. HSP/EB.2025/2 revises some earlier core
  contribution observations; do not append its comparative columns as new money.
- ARWO controls, audited non-RB controls and gross XB programme delivery are
  different source measures. They are not additional spending to add together.

## Validation and known gaps

Blocking checks cover unique fact identities, fund net-asset equations, fund
rows to annex controls, segment/pillar totals including eliminations, donor
row components, and named rows to printed totals. Tolerances reflect the printed
precision of the checked table; exact differences remain in the quality output.
Outputs are written only after these checks pass.

The extraction currently retains:

- UNEP: 132 account observations in 2023 and 133 in 2024. In 2024 AEL's surplus
  movement is blank, and one reported rollup's opening reserve is blank. Other
  observed values are retained; the blanks are not balanced artificially.
- Habitat: interim named contributions by funding segment, including grouped UN
  counterparties, transfers and source-specific refund treatment. In
  HSP/EB.2024/2 Annex III, the named technical-cooperation rows sum $68,100 below
  the printed total; the combined total has the same residual. Both the printed
  rows and total remain unchanged, with an explicit source warning. No residual
  is attributed to an invented contributor.
- ITC: named funders by Window I/II for 2022/2023. The source calls the measure
  “Total XB funding received”; it is not relabelled IPSAS revenue or assumed to
  be cash accounting. Revolving funds remains a non-donor category. The 2024/2025
  donor appendices are still unavailable to this extraction.
- UNODC: audited pillars and entity controls; the pillars include RB and UNICRI
  is within the Crime programme. Named pledges are extracted separately by the
  supplementary contributor adapter, not as audited pillar contribution revenue.
- UNEP named contributor-to-coded-fund coverage remains unavailable in this
  batch. The Environment Fund and convention contributor sources identified in
  the plan can be added without blocking the usable account facts.

The [integration plan](../../docs/trust-fund-source-integration-plan.md) records
further source leads. Extraction itself leaves the Volume I pipeline unchanged.
`python/16-export_trust_fund_json.py` now consumes this validated source pack to
add a separately labelled spending group. Original Volume I account amounts and
group totals, contributor exports and the 2017–2024 year range are retained.
The new source group uses separately reported figures in 2023–2024. It remains
unavailable in 2017–2022 until earlier report extractions are validated. ARWO
controls are retained for comparison only and never fill missing trust-fund amounts. Contributor measures have
not been combined into the legacy contributor view.

## Supplementary contributors and UNEP account groups

The website now consumes a separate contributor bundle generated by
`uv run python python/23-extract_secretariat_xb_contributors.py`. These series
are not merged with the Volume I donor JSON. Habitat/ITC tables above are
supplemented by [UNODC pledge extracts](unodc-contributors/README.md).
[UNEP source extracts](unep-contributors/README.md) are retained for reference
only and are excluded from the website contributor export. The two source directories
retain original documents/responses, hashes, reproducible scripts and explicit
quality/coverage reports. New observations link to physical PDF pages or to
historical HTML fund sections; no PDF page is fabricated for web dashboards.

UNEP spending now retains six annex segments and 17 printed subtotal groups as
inline-expandable hierarchy nodes. Account IDs/amounts remain unchanged. Gross
printed subtotals are source detail and are not added to the net entity total.

## Fund-only financial position and simplified new sidebars

[Fund-position research](fund-position-research/README.md) now supplies five
validated Habitat funding-segment positions per extracted year. Stage22
regenerates the source facts and stage16 attaches them to matching segment
nodes, never entity roots. UNEP’s account/group net assets remain in the source
facts but are hidden in all sidebar details.
UNODC/ITC do not receive whole-entity position proxies. The fund-position
checks are part of `python/tests/test_secretariat_xb_fund_positions.py`.

The contributor bundle has 22 series: Habitat and ITC source scopes plus one
UNODC office-wide pledge series per year. Every expense sidebar stays on one
year; detailed contributor source notes/tables are collapsed.
