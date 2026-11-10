# CEB methodology

The canonical user-facing summary of CEB methodology is [data/ceb-methodology.json](../data/ceb-methodology.json).
The frontend renders this content on [About](/about/#ceb-methodology). The home
and System pages link to that section, keeping basic source links in their
introductions. Selected-year source references, signed adjustments and other
data details remain on the relevant data page.

The central note has two explicitly separate parts:

1. All seven **Notes to the Financial Statistics pages** supplied by CEB, including
   the IRMCT contributor-coverage caveat, ITC non-reporting note, Taiwan terminology
   note and Kosovo note. The Taiwan note has the requested bracketed statement
   that terminology on this website has been standardized to **Taiwan Province of China**.
2. A concise **Portal processing** summary describing name and display grouping,
   integration of totals with available breakdowns, calculated balances, and
   expenditure classifications. It explains what the portal does with the
   reported data. Specific alias examples, correction cases and implementation
   detail remain in this document and the detailed references below.

The quoted CEB notes are not silently rewritten to match one downloaded file.
For example, the 2023 IRMCT entity revenue control is available while CEB's
published note excludes its contributor breakdown. The current files contain
nominal $1 entries in the government and category presentations; their presence
does not establish complete contributor detail. Coverage qualifications are
separate from the source quotation.

## Current data contract

- Use the current CEB release for all available historical years. Do not combine
  different vintages to preserve previous headline figures. Current file hashes,
  retrieval information, missing cells and coverage are in
  [public/data/ceb-source.json](../public/data/ceb-source.json); available view
  years are in [public/data/manifest.json](../public/data/manifest.json).
- Preserve downloaded source files and source wording. Parsing and presentation
  mappings do not authorize changing reported amounts or source categories.
- Use CEB classifications without donor-name overrides or inferred categories.
  A contributor may have records in multiple source categories. Keep contributor
  identity, observation category and financing type as separate attributes.
- Match contributor detail to the explicitly reported recipient and the same
  year's revenue controls. Full downloaded observations remain in raw sources.
- Reconcile known detail against reported revenue controls, with signed category
  and financing balances. Keep reported named contributors, reported aggregates
  and calculated balances distinguishable and inspectable. Where a category has
  no contributor breakdown for the organization/year, show its reported total
  under the source category name; reserve **Other {category}** for balances
  alongside reported detail.
- Display historical contributor amounts without a supported financing allocation
  in the gray **Other financing instruments** category, without guessing a main
  financing type. In affected organization-years, the remaining unattributed
  balance also has unresolved financing, keeping the
  contributor ledger additive. Reported organization financing totals retain
  CEB's four types. Show the additional filter only where unresolved data exists.
- Keep system expenses CEB-only; Secretariat and UNINFO remain separately sourced.
  Only use cross-dimensions actually reported together by a source.
- Display nominal source USD. CPI adjustment is disabled.

## Detailed implementation references

- [Revenue processing](data-fusion-revenue.md)
- [Expense, SDG, function and geographic processing](data-fusion-expenses.md)
- [Data availability](data-availability.md)
- [Historical legacy-code investigation](research/ceb-legacy-revenue-codes/README.md)

Dated audits, investigations and old content concepts are retained as historical
evidence. They do not supersede the central methodology or current processing
contract. Changes to processing require corresponding changes to the relevant implementation
document. Update the frontend summary when a change affects the meaning or
interpretation of displayed figures; do not turn it into a decision log or an
implementation inventory.

## Assessments and receipts workbook

The System Assessments tab includes the separately sourced
[CEB assessments and receipts workbook](https://unsceb.org/assessments-voted-assessments-received-current-year-and-prior-years-assessments-received/).
The exporter reads the Data sheet and preserves all financial observations,
including repeated organization–contributor rows, signed amounts, zeroes and
blanks. Identified contributor rows are retained even when all three dollar
fields are blank. It groups contributors using the workbook's category and identifier.
When a name is absent, the export uses a name reported for the same identifier
elsewhere in the workbook, or labels the row with its source identifier. Display
labels use the portal's existing entity and contributor mappings.

Run `uv run python/25-export_ceb_assessments.py` followed by
`uv run python/99-generate_manifest.py`. The annual files record the workbook
URL and SHA-256. The exporter accepts `--workbook PATH` for a local copy.

The treemap, sidebar and trend exclude rows with blank assessment amounts,
including any receipts reported on those rows. The selected year shows which
organizations have excluded data. For rows with reported assessments, grey
shows assessed amounts with blank current-year receipts. This amount is
capped at the assessment less the reported current-year receipts for each
contributor, organization and year. The treemap can include positive reported
prior-year receipts as a separate fill. Tiles can expand to fit that fill
while the blue outline marks the reported current-year assessment.
The trend shows prior-year receipts in the year they were received,
including signed adjustments. The workbook groups all earlier assessment
years together.

Both treemaps use the same observations: the organizations view groups the
contributor observations by recipient organization. Organization sidebars show
the contributor breakdown, and contributor sidebars show the organization
breakdown. Unknown current-year payments and the capped current-year tile fill
are calculated within each contributor–organization pair before aggregation, so
one member's overpayment cannot offset another member's unknown payment status.
Organization totals and trends are not calculated by reconciling these
assessments against the separate CEB revenue series.

The Assessments tab contains a full-width contributor treemap followed by a
full-width organization treemap, with a system-wide payment trend and reported
outstanding balances in two columns below. Organizations and Contributors
retain the revenue views and link to Assessments with a note that assessed
revenue is recognized in organizations' accounts and can include unpaid amounts.
The new tab reuses the existing combined sidebars in place; assessment details
are scrolled into view inside the panel when opened there, with the same section
order and broader financial information as on the other tabs. Contributor and
entity hashes include the selected year, so sharing or
reloading opens the same record without changing tabs or scrolling the page.
Existing links on Organizations and Contributors remain supported.

## Outstanding assessments from financial-situation reports

`python/26-export_ceb_assessment_outstanding.py` extracts the **Amount
outstanding** columns of Table 7 from CEB's financial-situation reports:

| Report | Observation years | PDF pages |
| --- | --- | --- |
| [A/77/507](https://unsceb.org/assets/media/reports/report-3755-A77507-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-5-Oct-2022.pdf) | 2020–2021 | 140–141 |
| [A/79/494](https://unsceb.org/assets/media/reports/report-3825-A79494-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-2024.pdf) | 2022–2023 | 29–30 |
| [A/81/408](https://www.unsceb.org/assets/media/reports/report-3983-A81408-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-2026.pdf) | 2024–2025 | 28 |

These are organization-level stocks of uncollected assessed contributions for
current and prior years, in full nominal US dollars. They are not annual
assessments less annual receipts, and they do not identify member-state debts.
They remain separate from the annual assessments-and-receipts dataset. The
Assessments tab shows these as a separate ranked bar chart beside the annual
payment trend, below the organization treemap. Each organization sidebar
shows the selected reported balance and its history. The overview keeps dates
in tooltips; sidebars show them next to the balance. The chart reuses the
Secretariat outstanding-dues colour. A small collapsed expander below each
chart shows the selected year's original CEB Table 7 footnotes, with markers
and a source-page link. Footnotes explicitly about one observation year are
limited to that year; general notes and reporting-history notes apply to both
years in a report. PDF-generated spaces inside words are suppressed during
footnote extraction, without rewriting the source wording.
No combined total owed is calculated across different dates and accounting
bases, and the balances are not stacked with annual receipts.

Run `uv run python/26-export_ceb_assessment_outstanding.py` and then regenerate
the manifest. `--reports-dir PATH` accepts local copies named `2022.pdf`,
`2024.pdf` and `2026.pdf`. The six annual
`ceb-assessment-outstanding-{year}.json` files preserve source URLs, PDF hashes,
table notes, original organization labels, row ordinals, PDF pages and original
amount text. Missing balances remain null, distinct from reported zeroes.
Labels use the shared organization mapping, with contextual UN/UN-DPO aliases.

`data/ceb-assessment-outstanding-basis.json` holds cited organization/year
accounting reviews. The exporter requires each review to match exactly one
CEB balance and its expected reported amount, then attaches audit context
without changing the source amount. Verified audit dates can resolve an
uncertain table date, while retaining the original header and a separate audit
citation. This external audit context is retained as internal research only.
The public interface shows CEB's amounts, source-header dates (with explicit
CEB date footnotes taking precedence) and original footnotes, without external
accounting-basis classifications, audit explanations or research disclaimers.
Trend lines connect reported balances unless CEB supplies separate budget
rows; repeated UNFCCC budget rows are not merged or connected across reports.

The percentage column divides each reported outstanding balance by the same
organization's annual assessments from the separate assessments-and-receipts
dataset in the selected year. This is a scale comparison, not the unpaid share
of that year's bills: balances include earlier years and may have a different
scope, reporting date or gross/net basis. It can exceed 100%. When any
assessment amount for that organization/year is blank, the denominator is
incomplete and no percentage is displayed. No missing denominator is replaced
with zero or inferred from the report.

Retained source limitations:

- A reported outstanding amount is not necessarily the gross amount members
  owe. For IRMCT in 2025, the Table 7 amount of $36.127 million matches the
  **net** assessed-contribution receivable in [A/81/5/Add.15, Note 7, printed
  page 62 / PDF page 64](https://documents.un.org/doc/undoc/gen/n26/149/61/pdf/n2614961.pdf#page=64):
  $64.710 million gross less a $28.583 million loss allowance. The gross balance
  includes ICTR and ICTY receivables as well as IRMCT. Preserve reported values;
  verify and disclose accounting basis and scope before presenting these as
  gross debts or combining them with annual assessment-and-receipt amounts.
- Two unlabeled UNFCCC rows occur in each 2020–2023 table. Their report-local
  occurrence numbers distinguish rows, without assuming a budget identity or
  matching scope between reports. Do not join these records using organization
  name alone.
- Peacekeeping table notes explicitly refer to 30 June in 2023 and 2025.
  The 2024 balance is independently confirmed as 30 June by the comparative
  audit table in [A/80/5 Vol. II, Note 7, PDF page 183](https://documents.un.org/doc/undoc/gen/n26/008/40/pdf/n2600840.pdf#page=183).
  The original December header is retained. The actual dates of the 2020–2022
  balances remain unconfirmed (`asOf: null`, `asOfBasis: "uncertain"`).
- ITU's reported 2020 balance of $154,906,002 is unusually large compared with
  $4,528,961 in 2021. The export preserves it and records the anomaly.

### Review of annual assessment source quality

A full multiset comparison of 28,368 observations against the source confirms
that the annual exporter preserves the observations exactly. The following
upstream issues remain in the reported figures; no inferred corrections have
been applied:

- IRMCT 2025 has literal zero current- and prior-year receipts in all 193
  contributor rows, despite UN reporting that members paid tribunal assessments
  during 2025. The CEB financial-situation report leaves its collection rates
  unavailable. Zero therefore must not be treated as independently verified
  nonpayment. The [9 October 2025 briefing, PDF page 6](https://www.un.org/en/ga/fifth/80/C5_80_0m_2025_10_09_Item138_Improving_Financial_situation_USG_DMSPC.pdf#page=6)
  covers the Mechanism and predecessor tribunals, and does not supply a matching
  current/prior receipt split to repair the data.
- OPCW 2022 current-year receipts appear misassigned among Tajikistan,
  Thailand, Timor-Leste, Togo, Trinidad and Tobago, Tunisia and Türkiye.
  Tajikistan's reported $621,248.14 equals Türkiye's assessment; Timor-Leste's
  $270,555.91 equals Thailand's. The [official year-end ledger, Annex 5,
  PDF pages 7–8](https://www.opcw.org/sites/default/files/documents/2023/02/s-2126-2023(e).pdf#page=7)
  contradicts the assigned payment statuses. A permutation can preserve the
  organization total while corrupting individual contributors' figures.
- Tuvalu's 2025 peacekeeping row reports $5,546 assessed and $8,181,165 in
  current-year receipts (source cells G24115 and I24115). This is an unresolved
  source anomaly, not a verified correction opportunity.
- WTO's unnamed identifier `SW` in 2024 and 2025 appears to represent Sweden,
  stranded from its usual `SE` identifier. Its 2024 rate of 1.032% matches the
  [official WTO scale](https://www.wto.org/english/thewto_e/secre_e/budget_e/budget2024_member_contribution_e.pdf#page=2).
  UPU's unnamed `GBD` in 2025 instead represents a distinct Overseas Territories
  reporting unit: four contribution units compared with the UK's 50, as shown
  in the [UPU budget, PDF page 62](https://www.upu.int/UPU/media/upu/Finances/dfiProgrammeEtBudget2026En.pdf#page=62).
  It must not simply be merged into the UK. OPCW's unnamed `YU` remains unresolved.
- PAHO has no annual observations for 2024, and IRMCT has none for 2020, 2021
  or 2023. Entire missing organization-years cannot be represented as grey
  unknown payment amounts without an assessment denominator; aggregate trends
  have changing coverage.
