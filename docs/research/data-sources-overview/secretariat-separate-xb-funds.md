# Secretariat membership and separately reported extrabudgetary funds

Research checked 26 October 2026. The source investigation initially used 2023;
the reconciliation below extends the check to 2024 and inspects the 2025 ARWO
workbook. The supplied chart matches the 2025 ARWO XB amounts. This is a source
investigation, not a completed portal import.

## Organizational and accounting boundaries

The evidence supports overlapping institutional, administrative and accounting
boundaries, rather than a demonstrated disagreement between the Controller and
the auditors.

The Secretary-General's [Secretariat and Regional Commissions directory](https://www.un.org/sg/en/global-leadership/entity/secretariat-and-regional-commissions/all)
includes UNEP and UN-Habitat. The UN's [careers guidance](https://careers.un.org/careers-in-the-field?language=en)
also explicitly describes them as offices within the Secretariat. Nevertheless,
UNEP describes itself as an autonomous body and separate financial reporting
entity. ITC requires an additional qualification: it is a joint UN/WTO agency.

[A/79/5 (Vol. I)](https://documents.un.org/api/symbol/access?s=A/79/5(Vol.I)&l=en&t=pdf#page=219),
chapter IV, paragraph 3, explicitly identifies separate financial statements for
all four entities, alongside UNU and UNITAR. Organizational inclusion therefore
does not imply inclusion in Volume I. Their absence from the existing
individual-trust-fund corpus is consistent with that boundary; it does not
establish that their extrabudgetary resources lack fund accounts.

Budget-section membership, application of UN financial rules, financial services
provided by another UN office, and consolidation into a reporting entity should
be recorded as separate relationships. None alone establishes all the others.

## Located sources and usable detail

Page references distinguish printed pages from physical PDF pages.

### UNEP

[A/79/5/Add.7](https://documents.un.org/doc/undoc/gen/n24/194/53/pdf/n2419453.pdf)
is directly usable for a fund-level import. Note 1, printed p. 65 / PDF p. 67,
defines the reporting entity. Note 4 defines seven reporting segments and includes
intersegment eliminations. Annexes I–VI, printed pp. 128–140 / PDF pp. 130–142,
publish fund codes, descriptions, opening/closing net assets, revenue, expenses
and reserve movements. These are not equivalent to individual donor schedules.

Examples in Annex I are FEL (UNEP Environment support budget), FPL (Environment
Fund programme activities) and RAL (Environment Fund programme reserve
activities). Further annexes cover programme-of-work support, conventions and
protocols, the Montreal Protocol Multilateral Fund, programme support and
employee benefits. Preserve the annex/segment and elimination rows. Convention
accounts can receive assessed contributions: calling every non-regular-budget
amount “voluntary” would misdescribe the source.

### UNODC

[A/79/5/Add.10](https://documents.un.org/api/symbol/access?s=A/79/5/Add.10&l=en&t=pdf)
identifies two principal voluntary funds: the Fund of the United Nations
International Drug Control Programme and the United Nations Crime Prevention
and Criminal Justice Fund. Note 1, paragraphs 6–8, printed p. 60 / PDF p. 62,
locates headquarters in Vienna and confirms that UNICRI is incorporated.

Note 3, printed pp. 75–79 / PDF pp. 77–81, reports drug/crime pillars, geographical
regions and subprogrammes. Pillar totals include regular-budget resources; they
are not isolated XB fund expenses. Printed pp. 49–50 / PDF pp. 51–52 also
distinguish general-purpose, special-purpose and programme-support-cost funding
on a UNSAS budget basis. Do not substitute these for IPSAS expenses. The
[consolidated budget](https://documents.un.org/doc/undoc/gen/v23/073/18/pdf/v2307318.pdf)
provides further fund/category tables, with actuals, estimates and biennia kept
distinct. A complete project/fund-code crosswalk remains to be established.

### UN-Habitat

[A/79/5/Add.9](https://documents.un.org/doc/undoc/gen/n24/186/14/pdf/n2418614.pdf)
states that its accounts include general and related funds, technical cooperation
and general trust funds. Note 4, printed pp. 97–100 / PDF pp. 99–102, reports
Foundation non-earmarked, regular budget, Foundation earmarked, technical
cooperation, programme support, and employee-benefit segments.

The 2023 expense row, in thousands of USD, is respectively 3,031; 16,578; 41,690;
103,894; 10,482; and 2,010, with eliminations of (15,280), yielding 162,405.
Excluding the regular-budget segment gives 145,827, matching the existing
research's legacy 2023 non-regular-budget amount. These are segments, not an
inventory of individual trust funds. A complete coded fund inventory was not
located in this report. [Open UN-Habitat / IATI](https://unhabitat.org/un-habitat-goes-open)
is a project-detail lead requiring a separate scope and freshness check.

### ITC

[A/79/5 (Vol. III)](https://documents.un.org/api/symbol/access?s=A/79/5(Vol.III)&l=en&t=pdf),
Note 1, establishes joint UN/WTO governance, equal regular-budget financing,
and separate reporting without common control for IPSAS purposes. Its IPSAS
accounts have one operating segment.

The financing vehicle is explicitly the **ITC Trust Fund (ITF)**. The
[operational plan](https://www.intracen.org/file/operationalplan2022pdf)
defines Window I as unearmarked/soft-earmarked and Window II as project-earmarked.
Programme support costs recover indirect costs. The [2023 annual-report appendices](https://www.intracen.org/sites/default/files/inline-files/ITC_Appendices-AR23_20240529_webpages.pdf),
Appendix IV, publish a named-funder contribution schedule for both windows,
with 2022/2023 columns in thousands of USD. Retrieval initially returned HTTP
403, but the complete appendix was subsequently downloaded and inspected;
physical pp. 51–53 label the measure “Total XB funding received.” Its equivalence
to recognized IPSAS revenue remains unestablished. A window must not be
represented as a separate legal trust fund without further evidence. The
[integration plan](../../trust-fund-source-integration-plan.md) records the
retrieved sources, contributor coverage and remaining access gaps.

## Inclusion approach

Expand coverage through separate source adapters rather than inserting these
accounts into the existing Volume I schedule parser. UNEP is the clearest first
fund-level candidate. UNODC and UN-Habitat can support explicitly labelled
programme/segment detail; ITC supplies a trust-fund/window donor breakdown.
Unequal source detail should remain visible.

Use reporting entity plus original fund code as identity; a bare three-character
code is unsafe across independent account sets. Retain year, reporting perimeter,
fund/segment/window/project grain, accounting basis, units, source page,
eliminations and whether an amount is revenue, contribution or expense.

Replace an XB aggregate with reconciled detail when expanding the chart. Do not
add its children to that aggregate or to the CEB entity total. Preserve signed
eliminations and any explicit reconciliation remainder. Establish same-year
regular-budget and support-cost treatment before claiming reconciliation.

The [existing source comparison](secretariat-data-source-candidates.md#53-the-trust-fund-schedule-and-old-open-extract-do-fit-together-at-fund-level)
already notes that UNEP, UNODC and UN-Habitat appear as unnamed aggregate rows
rather than named individual funds. That is a gap in detail, not automatically
missing spending. No frontend totals or production datasets were changed.

## Reconciliation against ARWO

The frontend loads the preserved `data/un-secretariat-expenses.csv` for
2019–2023 and annual CSV extensions for 2024/2025. Those extensions come from
`data/internal/ARWO_2019-2025.xlsx`, sheet `Data_Raw_19-25`, through
`python/10-extract_arwo_expenses.py`. The workbook reproduces the historical
financial rows; it is not appended wholesale. See [the extension policy](../../arwo-expenses-extension.md).

For these four entities, the ARWO `Voluntary` category is an XB spending measure,
not contribution revenue. UNEP, UN-Habitat and UNODC carry only the generic
reference `Financial Statement`; 2025 source rows are on `Vol_Other-25`.
Recent ITC rows instead cite programme-budget documents and CHF/USD conversions.
The import did not independently extract those amounts from the four audit PDFs.
Other ARWO funding categories use programme-budget expenditure and, for
peacekeeping/IRMCT, their separate performance documents.

USD millions; financial statements print thousands, while ITC gross XB delivery
is rounded to one decimal million. Difference is ARWO minus comparator.

| Entity | Year | ARWO XB | Report comparator | Difference USD |
|---|---:|---:|---:|---:|
| UNEP | 2023 | 671.941 | 696.642 − 24.701 = 671.941 | 0 |
| UNEP | 2024 | 808.064 | 832.075 − 24.011 = 808.064 | 0 |
| UN-Habitat | 2023 | 145.827 | 162.405 − 16.578 = 145.827 | 0 |
| UN-Habitat | 2024 | 172.645 | 188.264 − 15.619 = 172.645 | 0 |
| UNODC | 2023 | 416.855704 | 451.512 − 34.657 = 416.855 | +704 |
| UNODC | 2024 | 447.617825 | 484.798 − 37.180 = 447.618 | −175 |
| ITC | 2023 | 114.964375 | Gross XB delivery: 112.0 | +2,964,375 |
| ITC | 2024 | 125.294282 | Gross XB delivery: 117.3 | +7,994,282 |

The first three reconcile exactly or within published rounding. For UNODC,
**Note 18 explicitly shows regular-budget expenditure equal to the allocation**,
so the subtraction is supported by expenses, not merely a revenue proxy.
The audited RB boundary includes administrative support and staff assessment;
it need not equal ARWO's separately sourced regular-budget rows. The result
establishes the XB aggregate's origin, not reconciliation of every financing
column or a complete named-fund decomposition.

Source locations:

- UNEP: A/79/5/Add.7, physical PDF p. 92; [A/80/5/Add.7](https://digitallibrary.un.org/record/4090384/files/A_80_5_Add.7-EN.pdf), physical p. 87. Use total segment expense after eliminations minus the RB segment.
- UN-Habitat: A/79/5/Add.9, physical p. 102; [A/80/5/Add.9](https://digitallibrary.un.org/record/4090387/files/A_80_5_Add.9-EN.pdf), physical p. 83.
- UNODC: A/79/5/Add.10, statement II and Note 18; [A/80/5/Add.10](https://digitallibrary.un.org/record/4090388/files/A_80_5_Add.10-EN.pdf), physical pp. 45 and 82. Its Note 18 also repeats the 2023 RB comparator.
- ITC: A/79/5 (Vol. III), chapter IV, paragraph 10, physical p. 28; [A/80/5 (Vol. III), separate chapter IV](https://digitallibrary.un.org/record/4090394/files/A_80_5_Vol-III-ch-IV.pdf?version=1), paragraph 12, physical p. 2.

ITC's differences are 2.65% and 6.82% relative to reported gross XB delivery.
These are comparisons of related but differently sourced measures, not proof
that the audited accounts are wrong. Donor contributions in the ITC Trust Fund
schedule must not be substituted for expenditure to force agreement.

### ITC 2025 formula inconsistency

The consolidated 2025 row is $125,294,282.23844282, effectively repeating 2024.
In `Vol_ITC-25!I2`, the formula is `=102991900/0.822`, while the note says
`109 410.1 SwF 0.7737 to $1.00`. Cell L5 independently calculates
`=109410100/0.7737`, or $141,411,529.0164146. The two calculations differ by
$16,117,246.78. This is a high-confidence workbook inconsistency and a material
data-quality issue; the larger value is a candidate from the workbook, not an
independently approved correction. Verify the cited A/81/6 section 13 table 13.5
and the exchange-rate policy before updating production.

### Limits of the 2025 check

ARWO holds UNEP $805,430,000, UNODC $450,860,871, UN-Habitat $198,916,000 and
ITC $125,294,282.23844282. Complete 2025 accounts were not reconciled in this
check. The public [2025 UNEP audit chapter](https://wedocs.unep.org/bitstreams/4af29799-7605-4f14-aa1b-2c2ee484f21d/download)
reports total expenses of $829.27m including RB, but the retrieved file omits the
segment statements needed for the same subtraction. Do not describe the 2025
rows as independently validated based on the 2023/2024 matches.

Calculations and workbook-formula checks are reproducible in
[`notebooks/arwo-xb-reconciliation.ipynb`](../../../notebooks/arwo-xb-reconciliation.ipynb).
The [comparison CSV](arwo-xb-reconciliation.csv) preserves exact differences;
[source hashes](arwo-xb-source-hashes.json) identify the inspected PDFs. Source
amounts are reviewed transcriptions, not a general PDF parser. No production
amounts were changed.
