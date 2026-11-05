# Programme-budget methodology: source evidence

Inspected 5 November 2026. This note supports the website methodology revision;
it records source findings and drafting limits, not a change to financial data.

## Source inspection and provenance

The original PDF and DOCX fascicles for the proposed programme budget for 2026
were inspected in the sibling source repository:
`/home/agent/programme-budget-data/data/downloads/ppb2026/`.
Files are named `A_80_6 (Sect. N).pdf` and `.docx`. PDF text was read with
PyMuPDF and cross-read against the original OOXML paragraphs and tables.
The four official PDF downloads below returned HTTP 200, `application/pdf`,
and the same SHA-256 as the cached PDFs on the inspection date.

| Section | Official PDF | Cached/download SHA-256 |
|---|---|---|
| 13, ITC | [A/80/6 (Sect. 13)](https://documents.un.org/api/symbol/access?s=A%2F80%2F6%20%28Sect.%2013%29&l=en&t=pdf) | `e407e5ef0ceaff49290d43720302c1c4f8194be600b21cefa75230f280d8fc0b` |
| 17, UN-Women | [A/80/6 (Sect. 17)](https://documents.un.org/api/symbol/access?s=A%2F80%2F6%20%28Sect.%2017%29&l=en&t=pdf) | `7f068494b5435f6748d8efde056998472505a8c4cb5e5b68eb5bb81bbe3994aa` |
| 25, UNHCR | [A/80/6 (Sect. 25)](https://documents.un.org/api/symbol/access?s=A%2F80%2F6%20%28Sect.%2025%29&l=en&t=pdf) | `fcfb65500d5c504e73f07c7d350e1b5f9157fdd0b224fbbf487a854a83c19eb0` |
| 26, UNRWA | [A/80/6 (Sect. 26)](https://documents.un.org/api/symbol/access?s=A%2F80%2F6%20%28Sect.%2026%29&l=en&t=pdf) | `672a83a626098c1d123955778ad97918c83217399eaf7cc2242aaa17fd4ba640` |

For these four fascicles, physical PDF page numbers equal printed page numbers.
The [Fifth Committee's official document index](https://www.un.org/en/ga/fifth/80/ppb2026.shtml)
provides the publication context. Use symbol-based PDF links rather than
constructing an ODS storage path from a publication serial.

## What the expenditure figures represent

The fascicles combine historical expenditure, current approved budgets and
future resource estimates. These are different columns, not interchangeable
measures. For example, ITC table 13.4 on p. 13 separates 2024 expenditure from
2025 and 2026 extrabudgetary estimates. Its regular-budget block distinguishes
2024 expenditure, the 2025 approved budget and the 2026 estimate.

The portal's `public/data/budget-ppb-expenditure-2024.json` contains references
to the 2024 expenditure columns in these original fascicles. Its proposed and
approved datasets use separate measures. Consequently, describing the portal's
historical extrabudgetary expenditure as merely an estimate would be wrong.

Historical expenditure can nevertheless be provisional at publication:

- Section 17, p. 19, table 17.6, footnote a: expenditure in that table and
  subsequent tables was not final when reported and could be adjusted before
  the financial statements due by 31 March 2025.
- Section 25, p. 10, table 25.3, footnote a: the same qualification applies to
  that table and subsequent expenditure tables.

This supports saying that the page reproduces expenditure reported in budget
documents and that those figures can precede final financial statements. It
does **not** establish that every PPB expenditure figure is unaudited, or that
every entity's extrabudgetary expenditure uses the same accounting basis.

## Why separately reporting entities appear in the PPB

| Entity | Evidence in the inspected fascicle | Conclusion |
|---|---|---|
| UNHCR | Section 25, p. 13, paragraphs 25.29–25.31. The 2026 XB estimate uses the annual programme budget approved by UNHCR's Executive Committee for 2025, pending the 2026 planning exercise. XB resources are overseen by that Committee. | The XB column includes UNHCR operational resources governed through its own budget process, alongside its UN regular-budget allocation. |
| UN-Women | Section 17, p. 23, paragraphs 17.50–17.51. The fascicle reports XB resources and identifies the Executive Board as their oversight body. | Its operational resources have their own governance rather than being a regular-budget appropriation. |
| UNRWA | Section 26, p. 31, paragraphs 26.100–26.101. XB resources support humanitarian assistance and are overseen by its Commissioner-General under delegated authority. | The PPB includes Agency resources beyond the regular-budget allocation. |
| ITC | Section 13, p. 12, paragraphs 13.31–13.34; p. 13, tables 13.4–13.5. Its full regular budget is financed equally by the UN and WTO; the UN share is paid as a grant. Full regular-budget and XB tables are in Swiss francs. | ITC is another concrete case of separate budgeting alongside a UN regular-budget contribution. Its full regular budget must be distinguished from the UN grant. |

The audited reporting perimeter corroborates this distinction. In
[A/79/5 (Vol. I)](https://documents.un.org/doc/undoc/gen/n24/219/52/pdf/n2421952.pdf#page=243),
Note 1, paragraphs 5–7, printed p. 241 / physical p. 243, other financial
reporting entities are excluded from consolidation. Paragraph 7 lists UNEP,
UNODC, UN-Habitat, UNRWA, UNHCR and UN-Women as receiving regular-budget assessed
portions accounted for as grants in Volume I. Paragraph 6 treats ITC as an
equity-accounted joint venture. Thus the programme-budget presentation and
Volume I's consolidated accounting perimeter are different.

## Origins and purposes of the regular-budget allocations

- **UNHCR:** its [1950 Statute](https://www.unhcr.org/publications/statute-office-united-nations-high-commissioner-refugees),
  article 20, provides for Office administrative expenditures from the UN
  budget and activities from voluntary contributions unless the General
  Assembly decides otherwise. Section 25, paragraph 25.38, p. 14, repeats this
  rule and explains the interpretation of administrative expenditures as
  excluding operational expenses and their related management costs.
- **UN-Women:** [A/RES/64/289](https://documents.un.org/api/symbol/access?s=A%2FRES%2F64%2F289&l=en&t=pdf),
  paragraph 75, printed/physical p. 12, assigns normative intergovernmental
  processes to the UN regular budget and operational intergovernmental
  processes and activities to voluntary resources approved by its Executive
  Board. The official PDF was fetched and paragraph 75 read during this review.
- **UNRWA:** A/RES/3331 (XXIX) B provided regular-budget financing for
  international-staff salaries from 1 January 1975. This history is explicitly
  restated in the [Secretary-General's report on strengthening UNRWA's management capacity](https://www.un.org/unispal/document/auto-insert-184638/).
  The [original resolution PDF](https://documents.un.org/api/symbol/access?s=A%2FRES%2F3331%28XXIX%29&l=en&t=pdf)
  returned a scanned document without extractable text; no original-resolution
  page reference is asserted here. Present-day support is broader than this
  historical salary provision: section 26, paragraph 26.99(b), p. 31, describes
  grants for operational costs related to executive and administrative
  management, including oversight and accountability.

## Drafting conclusions and limits

The public explanation should distinguish budget-document expenditure from
financial-statement expenses and identify the wider institutional coverage.
Examples can name UNHCR, UNRWA and UN-Women, with ITC, UNEP, UNODC and UN-Habitat
as other separately reporting cases.

Avoid blanket descriptions such as “unaudited XB”, “all estimates”, or “all
modified cash”. Avoid calling UN-Women simply outside the Secretariat: its
founding resolution deliberately gives it a composite role. “Separately
reporting entities with their own budgets and oversight” is more precise.

These findings do not supply an accounting bridge between PPB XB and ARWO or
trust-fund expenses. The existing
[source comparison](data-sources-overview/secretariat-data-source-candidates.md#52-ppb-extrabudgetary-expenditure-is-not-audited-voluntary-expense)
records material differences at shared sections as well as different entity
coverage. Its quantitative examples refer to that investigation's source
vintages and should not be presented as freshly recalculated totals.
