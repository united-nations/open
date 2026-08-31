# Peacekeeping contributors

## Scope

The contributor export covers assessed contributions to the 11 peacekeeping
mission accounts indexed by the UN Committee on Contributions for the completed
2022/23, 2023/24 and 2024/25 cycles. It does not infer contributions from the
mission budgets and it does not include voluntary or trust-fund contributions.

Source index:
[Committee on Contributions — Peacekeeping](https://www.un.org/en/ga/contributions/peacekeeping.shtml).

## Source structure

The 33 circulars are regular enough to parse, but they are not perfectly
consistent. Across the 122 tables, ordinary and additional assessment sections
normally contain the same 193 Member States and the same five fields:

- regular-budget scale rate;
- peacekeeping rate after application of the level scheme;
- gross assessment or credit;
- staff-assessment amount or credit; and
- net assessment or credit.

Credit tables use the same columns but can omit Member States whose credit is
zero. One recurring wrapped United Kingdom credit row also prints the monetary
values without repeating its two percentage columns. The parser treats omitted
credit rows as zero and requires every printed credit name to match the full
assessment-state set.

One source defect is present in `ST/ADM/SER.B/1044`: section E omits Zimbabwe's
Member State row, although the printed section total includes it. Because there
is exactly one missing state, the exporter recovers its gross and net amounts
from the difference between the printed total and the other 192 printed rows.
The affected contributor, gross amount and net amount are listed under
`rows_derived_from_printed_totals`. Generation fails rather than deriving values
when an omission is wider or the residual is ambiguous.

A second source defect is present in `ST/ADM/SER.B/1065`: section B prints the
United States peacekeeping rate as 27.8908 per cent, making the Member State
rates sum to 100.9416 per cent even though the printed total says 100.0000 per
cent. The United States gross credit of $2,715,387 implies the rate used was
26.9493 per cent, matching the other circulars. The exporter preserves the
printed rate as metadata, uses the printed dollar amount, and records the
discrepancy under `source_rate_anomalies`.

The circulars are not one-table documents. A circular can contain ordinary half-year
assessments, a credit from an earlier unencumbered balance, and additional
assessments. The exporter treats these as signed ledger components: assessment
sections add and credit sections subtract.

The 2024/25 cycle also crosses two scale periods. Tables covering 2024 use the
2022–2024 rates, while tables covering 2025 use the 2025–2027 rates. The export
therefore does not assign one annual rate to a contributor. It aggregates the
actual amounts printed for each mission and retains the source document on each
mission amount.

## Export

Run:

```bash
uv run python/14-export_peacekeeping_contributors.py
uv run python/99-generate_manifest.py
```

This produces `public/data/peacekeeping-contributors-{2022..2024}.json`, keyed
by the first year of the July–June cycle. Each file contains:

- total gross and net assessments for the covered mission accounts;
- one row for each Member State;
- the Member State's gross and net assessment by mission;
- source symbols and direct PDF URLs; and
- document-level validation and table-section metadata.

## Validation gates

Generation fails when:

- the assessment index does not expose the expected 11 missions for every
  target cycle;
- a document title does not match its mission and cycle;
- an assessment table has anything other than 193 unique Member States;
- a sparse credit table contains a name outside the full assessment-state set;
- a regular-budget rate column does not total 100 per cent;
- a peacekeeping-rate mismatch cannot be localized to a printed row whose
  dollar amount implies a different rate;
- Member State sets differ between sections or missions; or
- signed gross rows do not reproduce the source circular's section-I total.

All rate exceptions and rows derived from source totals are exposed in the
cycle-level `verification` object. The rightmost Member State value is used as
the net assessment. For the United
States, that printed row retains its share of staff-assessment credits reserved
for tax refunds. This is why the sum of contributor net amounts can exceed the
summary's net figure before the United States tax-credit reserve is added back.

## Limitations

These files show what was assessed, not what was paid. Public financial-situation
presentations provide dated payment and arrears snapshots, while daily amounts
assessed, paid and owed are held in the restricted Umoja Contributions Portal.
Payment data should be integrated as a separate dated source rather than derived
as a difference from these circulars.
