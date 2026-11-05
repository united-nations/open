# Financial reconciliation findings

The checks compared published rows with independent controls at the same period,
scope, currency and measure. A computed remainder reconciles the display
arithmetically. Source completeness requires a separate check.

| Area | Result |
| --- | --- |
| PPB Section 3 | The 2020 approved and 2021 proposed breakdowns now include the Regional Service Centre shares of $1,424,400 and $1,511,000. Both close exactly. The printed rows are in A/75/6 (Sect. 3)/Add.1, Table 7, physical PDF page 32. |
| PPB proposed 2027 | Printed Section 11, 29E and 30 controls are $11,029,000, $84,903,500 and $24,088,500 on physical PDF pages 22, 25 and 18. Their selection raises the programme proposal by $691,800 to $3,366,442,300. Printed intermediate discrepancies stay flagged. The OHCHR corrigendum still has a $861,200 intermediate discrepancy. Full producer certification stopped on a 2026 publication hash mismatch. A narrower run stopped on missing 2027 source ownership. |
| Regular-budget assessments | All eight 2019–2026 row sums match the original circular totals exactly. The producer now checks the printed dollar column, including the Peacebuilding Fund portion from 2025. The reviewed physical pages are 7 for 2019, 12 for 2020–2024 and 13 for 2025–2026. |
| UNINFO | Stable IDs restore the omitted framework nodes. Fresh 2024 queries for Mali workspace 111 reproduce the retained data. For outcomes 30234–30239, fully observed unique outputs sum to half the outcomes. UNINFO’s finance grouping needs review before changing those amounts. |
| IDP 2023 | The UNDP transfer uses −$21,610 from the performance statement (physical page 285), confirmed by the 2024 comparative (page 288). The original transfer schedule (page 287) prints +$21,610. The contributor citation records the correction. |

## Trust-fund source differences

- **HDM 2020.** The $1,852,540 transfer schedule includes a separately printed
  $3,331 present-value adjustment. Deducting it yields the $1,849,209 statement
  revenue. The portal explains the bridge and keeps the adjustment separate
  from named contributors. Its accounting recognition remains unconfirmed.
  [Original 2020 schedule, physical page 227](https://documents.un.org/api/symbol/access?s=%28DMSPC%2FOPPFB%29%20FINANCIAL%20STATEMENTS%20FOR%20THE%20YEAR%20ENDED%2031%20DECEMBER%202020&l=en&t=pdf#page=227).
- **Habitat 2023.** All 67 donor rows were captured. Latin America and Caribbean
  technical cooperation detail totals $6,822,700 against $6,890,800 in Table 3.
  The $68,100 difference remains unallocated pending the regional ledger.
  [HSP/EB.2024/2, Table 3 and Annex III](https://unhabitat.org/sites/default/files/2024/02/hsp-eb-2024-2_financial_status_of_the_united_nations_human_settlements_programme_as_at_31_december_2023.pdf).
- **OTB and Peace and Development.** OTB’s 2024 current-asset detail is $3,596
  short of its printed subtotal. The Peace and Development Trust Fund’s 2022
  assets less liabilities are $90,000 below printed net assets. The latter
  gap repeats in the next comparative. The portal keeps the reported controls
  and identifies the affected detail.
- **UNODC 2023.** The March 2025 query’s 158 rows total $453,853,084.35. The
  November 2025 aggregate is $453,869,467. Donor-level detail from that later
  snapshot is needed to resolve the $16,382.65 difference.
  [Later donor-type table, physical page 3](https://www.unodc.org/documents/commissions/CND/CND_Sessions/CND_68Reconvened/ECN72025_15_ECN152025_18_2519394E.pdf#page=3).

## CEB source differences

- **WMO 2025.** The $88.66 million BUD/X00 record converts to CHF 69,953,800
  at CHF 0.789 per USD. The final regular budget is CHF 69,954,000 and actual
  regular-budget expenditure is CHF 64,472,000. This points to a planned-budget
  basis. The source survey cell is needed for confirmation. Retain the Non-SDG
  record and disclose the uncertainty. [WMO statement V, physical page 38](https://wmo.int/sites/default/files/2026-06/EC-80-INF05-7(1)-FINANCIAL-STATEMENTS-WMO-YEAR-2025_en.pdf#page=38).
- **IOM 2025.** The $3.058 billion sum includes $115.02 million reported as
  Non-SDG. The combined amount exceeds IPSAS expense by $106.30 million and
  also exceeds budgetary expenditure. The original budgetary to
  accrual bridge leaves the SDG gap unexplained. Keep the signed Not specified
  balance and request the source activity weights and accounting scope.
  [IOM reconciliation, physical page 63](https://governingbodies.iom.int/system/files/en/council/117/c-117-3-financial-report-2025_0.pdf#page=63).
- **Geography.** Fresh CEB downloads matched the local CSVs. UNHCR’s two global
  labels have offsetting financing differences of about $12.53 million, and
  IMO also has location-level gaps. Keep E06 location totals. A financing
  split requires matching source survey cells. WMO’s smaller geographic gaps
  fit a conservative source-currency rounding bound.

Use source precision to assess rounding and retain missing observations as
unavailable. Report extraction fidelity and source reconciliation separately.
Test the published partitions with the Python regression suite and verify
budget amount references with `uv run python python/test_budget_source_citations.py`.
