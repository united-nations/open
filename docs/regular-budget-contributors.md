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

## Validation

`python/13-export_regular_budget_contributors.py` fails rather than publishing
partial data unless all of the following hold:

- the assessment circular contains 193 unique Member States;
- assessment rates total 100 percent and match the historical scale workbook;
- every honour-roll state matches an assessed Member State;
- the number of honour-roll rows matches the total stated on the page; and
- payment dates and annual source metadata parse successfully.
