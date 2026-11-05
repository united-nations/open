# Secretariat Overview: ARWO source background

**Inspected:** 5 November 2026. **Scope:** evidence for the About-page methodology
rewrite; no financial observations or pipeline rules changed. This is a dated
research record, not authorization to replace the source compilation's amounts.

## Reporting background

The Overview uses the financial compilation prepared for the Secretary-General's
*Annual Report on the Work of the Organization* (ARWO). It is not a department-level
decomposition of one consolidated audited total.

The original [Transparency Gateway About page](https://open.un.org/about-un-transparency-gateway)
identifies programme-budget documents and audited financial statements as the
sources for its simplified Secretariat expenditure overview. The
[2025 Annual Report](https://www.un.org/sites/un2.un.org/files/sg_annual_report_2025_en.pdf),
printed p. 8, describes its priority-area diagram as indicative and distinguishes
the 2024 regular-budget year from the 2023/24 peacekeeping period. This establishes
the chart's context, not numerical identity between every workbook edition and
the printed annual-report chart.

### Audited reporting entities and level of detail

[A/79/5 (Vol. I), 2023 accounts](https://documents.un.org/doc/undoc/gen/n24/219/52/pdf/n2421952.pdf):

- Certification, printed p. 216 / physical PDF p. 218: peacekeeping and IRMCT have
  separate financial statements.
- Financial report, printed p. 217 / PDF p. 219: separate statements also exist for
  ITC, UNU, UNITAR, UNODC, UNEP and UN-Habitat.
- Statement V, printed p. 239 / PDF p. 241: regular-budget actual expenditure is
  presented by 14 broad parts, rather than individual departments and offices.
- Note 1, paras. 4–7, printed pp. 240–241 / PDF pp. 242–243: Volume I is an
  autonomous reporting entity. Regular-budget portions for UNEP, UNODC,
  UN-Habitat, UNRWA, UNHCR and UN-Women are recorded as grants. ITC is an equity-
  accounted joint venture with WTO.
- Note 4, printed pp. 263–276 / PDF pp. 265–278: segment presentations use fund
  groups and pillars, not the Overview's department-by-priority arrangement.

[A/79/5 (Vol. II), 2023/24 peacekeeping accounts](https://documents.un.org/doc/undoc/gen/n25/002/61/pdf/n2500261.pdf),
Note 1, paras. 6–7, printed p. 179: peacekeeping is a separate financial reporting
entity. Its audited accrual accounts are distinct from the mission budget-
performance reports used in the ARWO compilation.

## Direct local source and composition

The frontend source is produced by `python/11-export_secretariat_json.py`, using
`python/secretariat_expenses.py`:

- `data/un-secretariat-expenses.csv`: preserved 2019–2023 observations.
- `data/un-secretariat-expenses-2024.csv` and `-2025.csv`: non-overlapping annual
  extracts from `data/internal/ARWO_2019-2025.xlsx`, sheet `Data_Raw_19-25`.
- `python/10-extract_arwo_expenses.py` checks historical financial observations
  before appending new years. See [the extraction policy](../arwo-expenses-extension.md).

The workbook's source tabs establish these components:

| Component | Source tabs and interpretation |
|---|---|
| Regular assessed | `Reg-25` cites A/81/6; historical tabs cite the corresponding PPB editions. `Reg_STA-25` explicitly redistributes Staff Assessment across priorities for visualization. |
| Other assessed | `PKM-25` cites A/80/643 for peacekeeping components; `SA-25` cites A/80/631 for the support account; `MICT-25` cites A/80/505. Historical editions use corresponding mission, support-account and residual-mechanism documents. These rows do not all represent the same financial measure. |
| Voluntary / displayed extrabudgetary | `Vol-25` carries named fund observations with the generic reference `Financial Statement`. `Vol_Other-25` adds separate UNODC, UN-Habitat and UNEP amounts. `Vol_ITC-25` cites A/81/6 and a CHF conversion. The workbook's `Voluntary` tag does not establish that every amount is pure voluntary-contribution revenue. |

The source's funding categories describe expenditure-side amounts. The portal
imports the compilation; it does not independently reconstruct every source
financial statement. Annual-report landing-page links do not imply that the
internal workbooks are publicly downloadable there.

### Separately reporting entities

The prior [entity-source comparison](data-sources-overview/secretariat-separate-xb-funds.md#reconciliation-against-arwo)
records the 2023/2024 checks: UNEP and UN-Habitat ARWO amounts match audited total
expense less the regular-budget segment; UNODC matches within published rounding.
Those results identify non-regular-budget expense, not a named trust-fund ledger
or pure voluntary funding. They are not independent validation of 2025 figures.

ITC is different: the source uses programme-budget tables and CHF/USD conversion,
rather than the separately audited gross XB delivery comparator. The 2025 source
tab labels its source as section 13, table 13.5. Its amount formula repeats the
2024 calculation although the note states a different 2025 CHF amount and rate;
the prior comparison records this unresolved inconsistency. No amount was changed
as part of the methodology rewrite.

## Verified 2025 other-assessed budget substitutions

The 2025 workbook uses apportionments for mission and support-account rows even
where the cited document also publishes expenditure. Examples were checked
against official PDFs, not inferred from table totals:

| Row | ARWO amount, USD | Corresponding apportionment / approved amount | Reported expenditure |
|---|---:|---:|---:|
| MINUSCA, 2024/25 | 1,171,619,700 | 1,171,619,700 | 1,146,269,100 |
| MINURSO, 2024/25 | 68,791,100 | 68,791,100 | 64,732,400 |
| DPO support account, 2024/25 | 101,014,800 | 101,014,800 | 98,613,500 |
| DOS support account, 2024/25 | 108,976,400 | 108,976,400 | 108,061,800 |
| IRMCT, 2025 | 60,964,000 | 60,963,800, printed approved budget | Not a 2025 expenditure column in this table |

Sources:

- [A/80/643](https://digitallibrary.un.org/nanna/record/4109171/files/A_80_643-EN.pdf?registerDownload=1&version=1&withMetadata=0&withWatermark=0),
  table 25, physical PDF pp. 74–75: mission apportionment and expenditure.
- [A/80/631](https://documents.un.org/doc/undoc/gen/n26/024/72/pdf/n2602472.pdf),
  table 2, PDF p. 12: department support-account apportionment and expenditure.
- [A/80/505](https://documents.un.org/doc/undoc/gen/n25/286/70/pdf/n2528670.pdf),
  table 10, PDF p. 19: 2024 expenditure and 2025 approved IRMCT budget. ARWO's
  amount agrees with the latter after rounding to thousands of dollars.

These substitutions cannot be generalized to all years. For comparison, the
2023 MINUSCA row equals expenditure in
[A/78/726](https://documents.un.org/doc/undoc/gen/n24/018/39/pdf/n2401839.pdf),
table 25, PDF p. 77; the 2024 row equals expenditure in
[A/79/788](https://documents.un.org/doc/undoc/gen/n25/042/38/pdf/n2504238.pdf),
table 28, PDF p. 83. The 2024 DPO support-account row equals expenditure in
[A/79/680](https://documents.un.org/doc/undoc/gen/n24/387/33/pdf/n2438733.pdf),
table 2, PDF p. 85. The 2024 IRMCT workbook note explicitly says that approved
budget was used because expenditure data was unavailable.

The website should identify the source compilation and its budget substitutions;
it should not describe every Overview observation as audited actual expenditure.
Resolving the source-column choices requires a separate financial-data decision.

## XB and the published individual trust-fund schedules

There is evidence connecting ARWO's fund observations to underlying financial
accounts, but the displayed amounts are not unchanged copies of the published
individual schedules' `Total expenses` rows.

The internal workbook
`data/internal/2024 SG annual report_Vol I XB Revenue and Expense by entity and priority_UN secretariat.xlsx`
contains a `Vol I_Data_2024` sheet with fund, GL-account, account-description,
priority, financial-statement classification and amount fields. The inspected
summary sheets do not explain a universal formula connecting this data to the
published trust-fund statements.

### Reproducible 2023 comparison

1. Select 2023 `Voluntary` rows with a nonblank `NOTE` from the preserved ARWO CSV;
   sum amounts by exact fund-note text.
2. Select current-period 2023 `financial_performance` facts from
   `data/trust-fund-schedules/stage2/statement-facts.csv`; join same-year fund names
   from `fund-years.csv` by fund code.
3. Compare names after lowercasing and removing non-alphanumeric characters.
   No fuzzy matching or manual allocation is used.

Of 148 ARWO note groups, 127 have an exact normalized-name match. Their absolute
differences from schedule total expenses sum to $38,820,696. Of 126 matches with
an `Other revenue` fact, 113 match `Total expenses − Other revenue` within $3;
absolute differences from this alternative total $5,025,405. The 13 differing matches
and unmatched names prevent treating this as a universal transformation.

Example: the Central Emergency Response Fund, code `CER`, in the
[2023 schedule](https://digitallibrary.un.org/record/4060617), physical PDF p. 295,
reports total expenses of $705,399,966 and Other revenue of $13,485,525. The ARWO
row is $691,914,442, one dollar above their difference. The schedule's
Counter-Terrorism fund total, by contrast, matches ARWO within one dollar without
that adjustment.

**Inference only:** the arithmetic suggests that some revenue offsets enter the
annual-report expense compilation. The workbook inspection did not establish the
reason or a complete rule. Website prose may identify annual-report financial data
by fund and link the related published schedules; it should not assert either
direct extraction of schedule total expenses or a verified revenue-netting policy.

The adversarial reviewer independently reproduced the 126/113 comparison, the
CERF example and the 2025 mission apportionment finding during this review.
