# UNODC contributor source investigation

Status: usable **source-labelled annual pledge data** retrieved for 2023 and
2024. This is not a complete audited donor-by-legal-fund revenue schedule.
The investigation checked official document sources first, then used the
first-party public funding reports for complete office-wide named rows.

## What can be used

`contributor-observations.csv` contains 250 observations:

| Source | Period | Grain | Records | Sum |
|---|---|---|---:|---:|
| Public live funding report, last refresh 21 March 2025 | 2023 | Reported counterparty × Crime/Drugs fund family × General/Special Purpose | 158 | $453,853,084.35 |
| Official static 2024 funding report | 2024 | Reported counterparty × General/Special Purpose | 92 | $519,320,861 |

For 2024, Special Purpose totals **$515,407,300** and General Purpose
**$3,913,561**. This reconciles exactly to the independent official document
[E/CN.7/2025/15–E/CN.15/2025/18, Table 1, PDF p. 3](https://www.unodc.org/documents/commissions/CND/CND_Sessions/CND_68Reconvened/ECN72025_15_ECN152025_18_2519394E.pdf#page=3).
The 2023 public report is **$16,382.65 lower** than the later documentary
control ($453,869,467). The different vintages are retained without an invented
residual donor or a forced adjustment.

The 2024 report headline says **82 donors**, while its complete GP/SP tables
contain **80 distinct reported labels** (76 SP rows plus 16 GP rows with 12
labels shared between categories). Some labels are grouped or anonymous:
“Other MPTFs”, “Other UN Partners” and “Public Donation”. These are retained and
flagged, so neither the 80 table labels nor the headline 82 is represented as a
verified count of underlying named donors. The 2023 report contains 115 reported
counterparty labels, likewise not a normalized unique-donor count.

The official [partners page](https://www.unodc.org/unodc/en/donors/unodc-partners.html)
explicitly defines the dashboard as **indicative pledge-based information**,
reflecting pledges received during the calendar year, and directs users to
Certified Financial Reports for official financial information. It says 2024
is presented in a static format while the live dashboard is under review.
The retained live report shows a 21 March 2025 refresh; its published year
selector excludes 2024 and 2025. Accordingly, 2023 uses the public historical
report and 2024 uses the separately published static report. No hidden live
2024 data is substituted for that source choice.

Consequently:

- Suitable for a separately labelled **Pledged contributions** view, with source
  notes and vintage-qualified history. These are voluntary funding pledges,
  not regular-budget assessments or programme-support recoveries.
- Not labelled cash received, recognized revenue, annual expenditure or a
  source of expenditure-by-donor allocations.
- 2023 supplies a source-defined Crime/Drugs × GP/SP cross-tab. The static 2024
  report supplies GP/SP donor rows and only overall Crime/Drugs percentages;
  it does **not** supply a donor × Crime/Drugs split. No proportional allocation
  is manufactured.
- Financial-recognition coverage and completeness of all legal fund/code
  allocations remain unestablished. The source warns that the figures are
  indicative. The donor count discrepancy remains visible.

## Official documents checked first

1. **Audited A/79/5/Add.10 and A/80/5/Add.10**, already retained in the parent
   source pack. These provide voluntary-revenue, refund, transfer, RB and entity
   controls, but no complete annual named-contributor schedule. Their drug/crime
   expense pillars include RB and cannot substitute for a pure XB fund inventory.
2. **UNODC Annual Reports 2023 and 2024**, retained here. Financial-overview
   sections (both physical PDF p. 10; donor-category charts on p. 11) provide
   financial controls and aggregate donor categories, not the complete named
   distribution. Their revenue, programme delivery and pledged contributions
   are kept distinct.
3. **E/CN.7/2025/15–E/CN.15/2025/18**, retained here. Table 1 supplies donor-type
   controls for 2022–2024 and separately marked projections. It is useful
   independent validation, not named donor detail. 2025/2026 projected columns
   are not imported into annual actual records.
4. **UN Voluntary Trust Fund for Victims of Trafficking in Persons (UNVTF)
   Annual Reports 2023 and 2024**, retained here. A real subfund source with
   project identifier **GLOX42 / SB-004531**, but a subset of office-wide funding,
   not additional funding to add to the parent. The 2023 Annex 2 donor amounts
   are **cumulative**, so they are not exported as annual 2023 amounts. The 2024
   report includes annual named member-state deposits, extracted separately
   below, but several source totals differ.
5. **CTOC/COP/2024/8**, [Table 2, PDF p. 3](https://www.unodc.org/documents/treaties/COP12/8/CTOC_COP_2024_8_E.pdf#page=3),
   supplies a further project-specific pledge subset for the UNTOC review
   mechanism. It is cumulative/by-pledge-year through 30 June 2024 and does not
   replace an office-wide annual donor distribution. For example its 2023
   entries name the European Union and United States. Not merged here.
6. Existing CEB government/non-government donor files provide a further official
   **entity-level revenue** alternative. Their financing instruments and source
   coverage need their own reconciliation; they are not appended to pledge rows
   or treated as an all-fund donor allocation. The current task's document-first
   route yields the pledge view above without substituting CEB methodology.

## UNVTF subset and source discrepancies

`unvtf-2024-contributor-subset.csv` contains the 12 named member-state annual
rows and printed total on [physical PDF p. 27](https://www.unodc.org/documents/human-trafficking/UNVTF/2024_UNVTF_Annual_Report.pdf#page=27).

- The named rows sum to **$1,019,738**. The standalone printed total says
  **$1,019,783**, a $45 difference. The deposits-summary table elsewhere on the
  same page uses $1,019,738, agreeing with the sum.
- The deposits summary adds **$8,589** of private donors, giving **$1,028,327**.
- The certified statement on physical p. 25 separately reports **$1,016,847**
  voluntary contributions pledged and **$46,943** interest income, adding to
  **$1,063,790** total funding. The narrative's $1,063,790 “mobilized” figure
  therefore must not be silently used as donor contributions alone.
- A source footnote explains differences between partner contributions/deposits
  and certified figures through exchange rates between pledge and receipt.
  The $45 internally printed discrepancy is nevertheless preserved explicitly.
- No annual donor amount is derived by subtracting cumulative 2023 and 2024
  donor stocks, which would confuse revisions, receipt dates and FX.

This subset is not presently recommended as a reconciled annual UNVTF donor
view without these notes, and must not be added to the parent pledge dataset.

## Evidence and reproduction

- `urls.json` and `source-registry.json`: original public URLs, retained file
  paths, physical page counts and SHA-256 hashes.
- `partners.html` and `grants2024.html`: official source pages that link the two
  publicly shared Power BI reports. No authentication or private data is used.
- `dashboard-capture/`: original public model/query responses and requests for
  the published static 2024 report. The two donor tables request 500 rows each;
  76 and 16 are returned, so these are not the visible 20-row viewport only.
- `dashboard-live-capture/`: public live report metadata, publicly requested
  queries, source disclaimer and refresh date.
- `live-2023-request.json` / `live-2023-response.json`: public historical
  donor/year/fund-family/purpose aggregate query. It requests a 10,000-row
  window and receives 158 records. The original numerical representations
  remain in the response and `reported_text`; currency amounts are normalized
  to cents to remove binary floating-point artifacts.
- `control-reconciliation.csv`: independent PDF control and exact differences.
- `quality-profile.json`: checks and unresolved source differences.

Offline regeneration:

```bash
uv run python data/trust-fund-source-candidates/unodc-contributors/extract.py
```

Public evidence refresh (uses Playwright; set
`PLAYWRIGHT_EXECUTABLE_PATH` and the local library path when using a separately
installed Chromium binary):

```bash
node data/trust-fund-source-candidates/unodc-contributors/capture-public-dashboard.mjs grants2024.html dashboard-capture
node data/trust-fund-source-candidates/unodc-contributors/capture-public-dashboard.mjs partners.html dashboard-live-capture
uv run python data/trust-fund-source-candidates/unodc-contributors/fetch-public-query.py
```

The scripts are investigation adapters for these inspected public report
versions. A changed model/table layout should trigger review rather than
silently relabelled results. Source URLs do not receive fabricated PDF pages
when the source is a dashboard.
