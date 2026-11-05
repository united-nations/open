# Independent review of methodology drafts

Reviewed 5 November 2026 by the `adversarial_review` agent, independently of the
ARWO and PPB researchers. This records a review of website wording and source
composition, not an audit opinion on the underlying financial data.

## Conclusions

The revised Overview and Programme Budget drafts distinguish the source
compilation, published financial statements, budget-document expenditure and
display conversions. They avoid two unsupported claims in the initial concept:
that the Overview decomposes the audited Volume I total, and that all PPB
extrabudgetary expenditure is unaudited or estimated.

The following points were independently checked:

- [A/79/5 (Vol. I)](https://documents.un.org/doc/undoc/gen/n24/219/52/pdf/n2421952.pdf#page=218),
  Controller certification, physical PDF page 218: peacekeeping operations and
  the Residual Mechanism have separate financial statements. Statement V,
  physical page 241, reports regular-budget actuals by 14 broad budget parts.
  The Overview consequently has a different perimeter and accounting
  composition from the Volume I accrual total.
- The same report, Note 1, paragraphs 5–7, physical PDF page 243, identifies
  separate reporting entities and specifies that the regular-budget allocations
  to UNEP, UNODC, UN-Habitat, UNRWA, UNHCR and UN-Women are grants in Volume I.
  ITC is a joint UN/WTO venture accounted for by the equity method. Financial
  reporting boundaries and institutional membership are distinct.
- ARWO workbook `PKM-25` values for MINUSCA ($1,171,619,700) and MINURSO
  ($68,791,100) match the **apportionment** column of
  [A/80/643, table 25, physical PDF page 74](https://documents.un.org/api/symbol/access?s=A%2F80%2F643&l=en&t=pdf#page=74),
  rather than its expenditure column. Workbook `SA-25` values for DPO
  ($101,014,800) and DOS ($108,976,400) similarly match the apportionment column
  of [A/80/631, table 2, physical PDF page 12](https://documents.un.org/doc/undoc/gen/n26/024/72/pdf/n2602472.pdf#page=12).
  The revised public note correctly makes this 2025 basis explicit.
- The comparison between 2023 ARWO named-fund amounts and the extracted public
  Schedule of Individual Trust Funds was reproduced independently. For 126
  exact-name matches containing an Other revenue line, 113 compilation amounts
  equal schedule expense less Other revenue within $3. For CERF, the respective
  amounts are $691,914,442, $705,399,966 and $13,485,525. This rejects a description
  of the compilation as a literal copy of the schedule expense column. It does
  **not** establish a universal netting rule: unmatched and differing funds
  remain, and an author-supplied transformation rule was not located. The draft
  therefore correctly identifies the compilation as the direct source and the
  schedules as related public fund accounts.
- PPB provisional-expenditure examples were cross-checked with the PPB
  researcher: A/80/6 (Sect. 17), table 17.6 footnote a, and A/80/6 (Sect. 25),
  table 25.3 footnote a, qualify 2024 expenditure before final statements. The
  draft confines the claim to those examples.
- The CHF description matches `python/ppb_chf_layout.py`: original CHF
  extrabudgetary amounts are retained and annual calendar-day-weighted UN
  operational rates provide USD chart-area weights. This is distinct from the
  ARWO workbook's own currency treatment.

## Restructuring review

The revised structure keeps methodology on About and retains selected-year
source references, signed adjustments and non-positive-fund navigation on data
pages. About subsection links use the existing expandable-card hash handling.
Map designation notices remain with maps.

The initial draft retained the trust-fund contributor reconciliation-match
percentage and explained its calculation on About. A subsequent editorial
revision removed that contributor page's entire selected-year details panel
and the corresponding About paragraph. The extraction checks remain in the
pipeline; the public interface no longer displays the percentage.

Priority placement was rechecked against the current implementation, rather than
older methodology prose. `SecretariatOverview.tsx` honors the exported
`split_across_priorities` flag, which the current ledger sets for every entity.
The inspected 2019, 2023, 2024 and 2025 exports all retain priority splits for
multi-priority entities. The revised wording that tiles follow the compilation's
priority allocations therefore matches the current data and renderer. Older
references to assigning every entity except Staff Assessment to a single primary
priority should not be restored.

## Limits

The separate-entity residual comparison supports selected 2023–2024 origins; it
does not independently validate every year or the 2025 separate-entity amounts.
The retained ARWO workbook also contains a previously documented ITC 2025
conversion inconsistency. The revised source-composition wording should not be
read as validation of those source figures. No financial amounts were changed
as part of this review.
