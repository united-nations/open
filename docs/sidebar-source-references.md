# Financial sidebar source references

Source links belong in each sidebar's collapsed **Source references** section.
They should describe the evidence supporting the displayed figures without
suggesting that an aggregate or calculated remainder is printed on one page.

## Shared format

`BudgetNodeSource` holds the document symbol and URL, physical PDF page
(`pdfPage`) or table-section pages (`pdfPages`), table title, row label and
column heading. `budgetItem` identifies the original budget line; an optional
`label` supplies funding-source or fund context. `pdfPageScope` distinguishes
verified row pages, table locations and assessment/credit section ranges.
The shared table pairs each budget item and measure with its document and pages.

- Page numbers are one-based physical PDF pages, not printed page labels.
- `SourceReferenceList` builds page fragments from the page metadata, opens
  references in a new tab, and retains document-only links when no page exists.
- `pdfPageScope: row` identifies a matched row. `table` identifies a source
  table location without certifying the selected column. Legacy PPB
  `pageStatus: located` references without precision remain table-level.
  The list explains that multi-page tables can continue on subsequent pages.
- `supportingSources` preserves evidence for derived entities and Trust Fund
  destinations. It is evidence, not an additional amount to sum.
- `metricSources` binds PPB citations separately to the measure and funding
  source. Approved/proposed views must never fall back to expenditure citations.
- Source collection includes the displayed hierarchy and deduplicates repeated
  references while preserving different rows, columns and page sets.

## Data paths

### Programme Budget

`programme-budget-data` financial observations identify their citations and
source cells. `python/12-export_budget_json.py` keeps citations alongside the
observations selected for all three measures. Expenditure preserves every
source citation used by a derived amount, not only its primary citation.
Producer PDF mapping matches released financial source cells and retains
location precision. Missing or ambiguous mappings stay document-only.
Local document table ordinals are not reliable when a downloaded document
differs from the version used to produce the released financial data.

The entity projection preserves the source rows used to build its aggregate.
The sidebar gathers the selected node's evidence and the evidence behind its
breakdown. Calculated remainders use supporting references, not a claim that the
remainder itself appears in the cited row.

### Peacekeeping

Mission expenditure PDF mapping requires a unique page matching the row label
and its financial values. It preserves table-level precision because this does
not independently certify which PDF column supplies the selected measure.
Contributor exports retain exact physical pages for printed Member State rows;
assessment/credit section ranges remain fallbacks for derived amounts or rows
absent from a table. Separate statement PDFs use their own URLs and page
numbering (especially the 2025 cycle).

### Trust Funds

`python/trust_fund_frontend_exports.py` retains existing physical page metadata
from the extracted expenditure and contribution rows. Fund expense references
live on fund leaves; entity sidebars collect them from descendants. Contributor
destinations retain their contributing rows. General document references remain
available for older exports lacking the new fields.

## Validation and coverage

Run `.venv/bin/python python/check_page_reference_coverage.py` to inventory
current frontend exports by measure and year. A figure is fully page-covered
only when **all** references supporting it have physical pages. This inventory
checks metadata completeness; it does not independently verify PDF contents.

Coverage after the page-mapping expansion (compatibility PPB aliases excluded):

| Export                                        | Figures with all supporting references paged | Total figures |
| --------------------------------------------- | -------------------------------------------: | ------------: |
| PPB expenditure                               |                                        7,603 |         7,603 |
| PPB approved                                  |                                        3,856 |         3,856 |
| PPB proposed                                  |                                        3,846 |         3,846 |
| Peacekeeping expenditure source-bearing nodes |                                          922 |           922 |
| Trust Fund expenditure fund leaves            |                                        1,089 |         1,089 |
| Trust Fund contributor destinations           |                                       10,441 |        10,441 |

Peacekeeping contributor exports additionally retain 31,021 exact printed-row
page entries across 2022–2025. Derived amounts retain section references.
The figures above include verified table locations where an exact row location
is unavailable; they do not claim that every figure is individually printed.
Unused producer observations can still have unresolved page locations.

Financial values must remain unchanged when adding provenance. Validate source
pages against the corresponding PDF, distinguish table locations from exact rows,
and check that each measure's citations identify the same observations as its
values. Focused regressions cover measure-specific citation selection, derived
references, PDF row matching and Trust Fund aggregation.
All 51 affected frontend JSON files were compared with a pre-expansion snapshot:
every non-citation field was unchanged.

## Further extraction improvements

- Keep PDF mapping and coverage QA in the producer release pipeline so the
  portal need not depend on local mapping sidecars.
- Retain regular-budget contributor assessment row pages during PDF parsing.
- Use workbook sheet/row or dataset record references for CEB, Secretariat
  workbook data and UNINFO; do not manufacture PDF provenance.
- Track unresolved and ambiguous citations by edition, measure and precision.
