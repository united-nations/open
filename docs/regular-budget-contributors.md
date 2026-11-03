# Regular-budget contributors

The `/secretariat` contributor treemap covers Member State assessments for the
United Nations regular budget. It does not combine regular-budget assessments
with other assessed or extrabudgetary contributions.

## Sources and grain

One exported file is produced for each calendar year from 2019 onward, with one
row per Member State.

- **Assessment amount:** the annual `ST/ADM/SER.B/*` assessment circular linked
  from the Committee on Contributions' [regular budget and working capital fund
  page](https://www.un.org/en/ga/contributions/budget.shtml). These circulars
  publish the complete table of assessment rates and net/total contributions for
  all 193 Member States.
- **Payment status and date:** the Committee's current and
  [previous honour rolls](https://www.un.org/en/ga/contributions/previous_honourrolls.shtml).
  Section I identifies states that paid in full within the published 30-day due
  period; section II identifies states that paid in full later.
- **Rate validation:** the Committee's historical [scale of
  assessments](https://www.un.org/en/ga/contributions/scale.shtml) workbook.

The treemap uses the annual assessment circular amount for every tile. Honour
roll amounts are checked against that amount but are not used as a substitute.
This matters because two source discrepancies are currently present: the 2022
honour roll gives Turkmenistan as $967,707 while `ST/ADM/SER.B/1038` gives
$976,707, and the 2026 honour roll gives Malaysia as $10,371,474 while
`ST/ADM/SER.B/1096` gives $10,371,574. The exporter records discrepancies in
the JSON metadata.

For 2019–2024 the displayed amount is the circular's `Net contributions`
column. From 2025 it is `Total contributions`, the same amount described as the
net assessment on the honour roll. That total includes the Peacebuilding Fund
portion assessed in the regular-budget circular.

## Payment-status interpretation

Each Member State has one of three statuses:

- `paid_on_time`: listed in honour-roll section I;
- `paid_late`: listed in section II;
- `not_paid_in_full`: absent from both sections as of the honour roll's stated
  snapshot date.

`not_paid_in_full` does not mean that no payment was made. The public honour
roll does not distinguish partial payment from no payment, so the interface uses
the more precise “Not listed as paid in full” wording and displays the source's
`as_of` date.

Historical honour rolls are late-December snapshots. The current-year page is
updated during the year, so its status changes whenever the static data pipeline
is rerun and deployed.

## Other sources considered

The Umoja [Member States' Contributions Portal](https://umoja.un.org/news/launch-new-umoja-contributions-portal)
is described as containing daily amounts assessed, paid and owed. It is a
Member State service rather than a stable public download used by this static
site. The Committee's public status-of-contributions archive is useful for older
historical research but does not provide a comparable current machine-readable
series. The annual circulars and honour rolls are therefore the strongest
reproducible public sources for this view.

## Outstanding contributions (autumn snapshots)

`python/24-export_regular_budget_outstanding.py` runs after step 13 and produces
`regular-budget-outstanding-{year}.json` for 2019–2026. Regenerate the manifest
after adding coverage. `data/regular-budget-outstanding/observations.csv` retains
the normalized observations and source locations; each JSON retains the source
SHA-256. Download caches in that directory's `raw/` subdirectory are ignored.

The sources are the October financial situation presentations linked from
https://www.un.org/en/ga/contributions/financial.shtml. Cutoffs are 4 October 2019,
8 October 2021, and 30 September otherwise. The 2019 PowerPoint's embedded
`Microsoft_Excel_Worksheet2.xlsx`, `Table4`, backs slide 6. Other sheets contain
stale April 2018 observations: they must not be attributed to October 2019.
Workbook amounts are rounded to whole dollars to match the published tables.
Later PDFs are parsed from the complete debtor slide (PDF page 6 in 2020,
page 8 in 2021–2026). Footnotes recording payments after the cutoff do not alter
the snapshot balance.

The exporter validates all country identities against the same-year assessment
roster, the complete debtor count, positive listed balances, and the headline
total at its published precision. The 2021 source has a reviewed discrepancy:
63 printed country balances total $1,254,267,798, versus the $1,255m headline.
Both amounts and the discrepancy are retained; visual totals use the country
sum without allocating a reconciliation balance to countries. The 2019 and
2020 country sums differ from their precise headlines by one dollar.

All 193 States are exported. A zero outstanding amount is the complement of
the validated complete debtor list at that same cutoff, with explicit
`complete_list_complement` provenance. It is not inferred from a later honour
roll, and does not assert the absence of an account credit. A missing snapshot
or country is unavailable, not zero.

The page adds an outstanding-balance treemap and sortable table, country-filtered
annual line comparison (one line per selected country, defaulting to all Member
States), and a shared sidebar history. The sidebar retains its compact bar history.
The total can remain selected alongside individual countries. Each is an independent
series; the total and country balances are never added together.
Share of total always uses all Member States' balances in the snapshot, including
when the treemap/table is searched. Balance / annual assessment uses the same-year
circular amount, including the Peacebuilding Fund portion from 2025. It may exceed
100% and is not a current-year payment-completion measure. Changes compare the
immediately preceding calendar year's snapshot; percentage changes from zero are
undefined (a positive balance is labelled new). No balance is treated as a flow,
summed across years, or interpreted as cash paid.

### Earlier historical coverage investigated

The [October 2018 presentation](https://www.un.org/en/ga/contributions/Presentation%20October%202018.pptx)
contains a complete 52-country debtor table at 30 September 2018 (Chart 6).
Slide 7 links `ppt/embeddings/oleObject3.bin`; its OLE `Package` is an XLSX
whose `Table4` sums to $1,087,671,794.26, matching the rounded published total.
Other sheets contain stale April 2018 data. This is a viable next extension,
but is not included in the current 2019–2026 export or assessment rosters.

The inspected 2011–2017 autumn presentations do not contain complete country
debt tables: leading debtors are shown alongside aggregated other countries.
Do not infer individual balances from those aggregates.

Separate complete 30 September country ledgers were verified for 2003–2010,
in Annex II of [ST/ADM/SER.B/610](https://docs.un.org/en/ST/ADM/SER.B/610),
[/635](https://docs.un.org/en/ST/ADM/SER.B/635),
[/666](https://docs.un.org/en/ST/ADM/SER.B/666),
[/699](https://docs.un.org/en/ST/ADM/SER.B/699),
[/717](https://docs.un.org/en/ST/ADM/SER.B/717),
[/754](https://docs.un.org/en/ST/ADM/SER.B/754),
[/788](https://docs.un.org/en/ST/ADM/SER.B/788), and
[/821](https://docs.un.org/en/ST/ADM/SER.B/821), respectively.
These require a separate extraction and reconciliation before publication.
Use the current-Member-State subtotal, keeping former Yugoslavia liabilities
separate; respect historical membership rather than manufacturing 193 rows.
Preserve signed account credits, and distinguish collections/adjustments from
cash payments. A scanned country ledger also exists for 30 September 1990 in
[A/C.5/45/17, Annex III](https://digitallibrary.un.org/record/99792/files/A_C.5_45_17-EN.pdf)
(pages 16–19), but does not establish continuous coverage back to that year.

## Assessment validation

`python/13-export_regular_budget_contributors.py` fails rather than publishing
partial data unless all of the following hold:

- the assessment circular contains 193 unique Member States;
- assessment rates total 100 percent and match the historical scale workbook;
- every honour-roll state matches an assessed Member State;
- the number of honour-roll rows matches the total stated on the page; and
- payment dates and annual source metadata parse successfully.
