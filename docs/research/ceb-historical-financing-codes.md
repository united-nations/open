# Historical CEB financing codes

Research inspected on 31 October 2026; consolidated on 2 November 2026 from the
follow-up source investigation and constrained-reconstruction writeup. This note
extends the [earlier investigation](ceb-legacy-revenue-codes/README.md).

## Conclusion and portal treatment

No official numeric codebook or complete authoritative crosswalk was recovered
for **R05, R07, R08, R08B/R08b, R09, R10, R11 and R12**. Contemporary CEB reports
support earmarked treatment of some identifiable historical amounts, but do not
print these codes or establish their meaning across all records. Numerical
reconciliation also fails to yield a consistent universal mapping.

The portal therefore retains the reported contributor amounts without guessing
an instrument. They appear in the gray **Other financing instruments** category,
introduced in commit `f635b96`. In affected organization-years, the remaining
Unattributed balance uses that category too, keeping contributor totals additive. Organization-level
financing totals and the overall financing trend retain the four main types
reported in CEB's main revenue file. Contributor-filtered trends can include the
additional category. Original source codes remain in the data, without separate
explanatory tables in the interface.

## Source coverage

The inspected legacy subset contains **801 observations in 2015–2017**, with
**$18,863,592,163.78** in signed recorded amounts. R05 occurs only in 2016–2017.
The set contains 87 recipient/year groups. All affected source records have a
blank financing description; a known contributor and amount do not establish
earmarking.

The amount is a sum of source observations, not unique system funding. CEB does
not eliminate inter-agency transfers, and the subset contains 60 excess exact
repeated rows. No rows were removed from the primary investigation: identical
export rows may have omitted underlying dimensions.

The main inputs were the retained CEB revenue and non-government contributor
downloads, plus reported rows in the fused contributor ledger. Calculated
balances were excluded from the numerical inference. The inspected raw
non-government file had SHA-256
`0dd69e3c0bc0ccf564135bd6f7aeb990a6aba6bd79107832e932a2510b068657`.
These are findings about that source vintage, not a newly verified codebook.

## What official reports establish

[A/71/583, Table 2B and notes, printed pp. 43–44](https://unsceb.org/sites/default/files/imported_files/GA%20Report%20A%2071%20583_0.pdf#page=43)
classifies non-State donor amounts as **specified voluntary contributions**.
Its European Commission column reports UNDP's 2015 amount as $217.258 million,
matching the R09 observation after rounding. Its notes describe changes to
pooled/global-fund reporting and warn that some organizations record pooled
funding against the original contributing donors.

[A/73/460, Table 2B, printed pp. 43–44](https://unsceb.org/sites/default/files/imported_files/A.73.460%20-%20Budgetary%20and%20financial%20situation%20of%20the%20organizations%20of%20the%20UN%20system_29%20Oct%202018_0.pdf#page=43)
again presents specified voluntary contributions, with separate columns for the
European Commission, UN organizations, UN pool funds, international financial
institutions and a global-fund/civil-society grouping.

| Recipient/year | Recorded R09 USD | Historical EC table USD, rounded |
|---|---:|---:|
| UNDP 2015 | 217,257,807 | 217,258,000 |
| UNDP 2016 | 324,320,832 | 324,321,000 |
| UNDP 2017 | 255,110,501 | 255,111,000 |
| UNICEF 2016 | 291,384,457.40 | 348,721,000 |
| CTBTO 2017 | 4,336,826 | 2,168,000 |

The comparison summed every signed R09 observation per recipient/year and
compared it with the historical EC cell. Of 73 groups with numeric historical
cells, **56 agree within $500**, the rounding tolerance for tables in thousands
of USD, and **17 disagree**. CTBTO's recorded total is the sum of two identical
observations; the match of one observation does not authorize deleting the other.
At individual-row grain, 60 rows match historical cells, a different count from
the 56 matching recipient/year sums.

These matches provide documentary support for particular correspondences, not
an unconditional R09 rule. Revisions, overlapping reporting channels or missing
export dimensions could explain discrepancies; the investigation did not
establish which explanation applies.

## What numerical reconstruction can establish

The experiment tested one constant assignment of each of eight case-normalized
codes to one of four instruments: **4⁸ = 65,536 assignments**. R08B and R08b were
combined only for this experiment.

For each recipient/year/instrument, available capacity was the main revenue
control minus known reported contributor amounts. A candidate assignment had to
fit within that capacity, initially allowing $1 tolerance. Positive remaining
capacity was allowed because contributor coverage is incomplete. Missing control
cells were left unconstrained, not replaced with zero; signed amounts and
repeated rows were retained.

Ten of the 87 recipient/year groups already exceeded a known control before any
legacy assignment, so the main test excluded them. Of the remaining **77**,
only **25** had all four controls available. Across the affected set, 62 main-type
control cells were unavailable. **No assignment fits even the baseline-clean
groups.** This rejects the model of disjoint additive observations with a
constant instrument per code; it does not prove the underlying money is
unclassifiable using better source information.

| Code | Types surviving marginal capacity exclusions | Types surviving intersections of individually feasible local models |
|---|---|---|
| R05 | Earmarked; other activities | Earmarked; other activities |
| R07 | Earmarked | Earmarked |
| R08 | Earmarked | None |
| R08B/R08b | Earmarked | None |
| R09 | None | None |
| R10 | Earmarked | None |
| R11 | Earmarked | Earmarked |
| R12 | None | None |

Marginal exclusions allow the largest possible offset from negative amounts in
other codes. The local-model column additionally intersects candidates from
groups that have a local solution. Neither column is a verified mapping: the
joint model has no solution. R07 and R11 are the strongest conditional earmarked
candidates; R05 remains ambiguous.

### Counterexamples that matter

- **UNDP 2015:** unearmarked capacity is $109,395; earmarked capacity is
  $1,531,403,916; other-activities capacity is $348,265,392; assessed capacity
  is unavailable. R08B totals $846,102,414, exceeding both known unearmarked
  and other-activities capacity even with the possible negative legacy offset.
  R08 totals $289,396,584 and also exceeds unearmarked capacity. Assigning all
  legacy amounts to earmarked fits this recipient/year, leaving $147,246,539,
  but does not establish their classifications.
- **UNRWA 2015:** its sole legacy row, R09 $181,847,533, exceeds every available
  instrument's capacity. The largest, earmarked, is $140,747,275.41. A model
  that assigns each published row wholly to one type cannot fit this case.
  Splitting the row or changing a source/scope assumption would require evidence.
- **ITU 2015:** R12 totals $17,498,991.93 against earmarked capacity of
  $2,433,755.22, contradicting a universal earmarked rule.
- **CTBTO 2017:** two identical R09 rows of $2,168,413 sum to more than its
  earmarked capacity. Removing exact repeats only in a diagnostic experiment
  still leaves zero feasible universal mappings across the dataset.

There were also zero feasible mappings at tolerances of $0.01, $1,000 and
$1,000,000, recalculating baseline eligibility each time. Assigning all legacy
amounts to earmarked violates capacity in 12 of the 77 baseline-clean groups;
the earlier unsupported mapping violates it in 34. These are diagnostics, not
classification confidence scores.

## Search limits and follow-up

The investigation covered contemporary statistical reports; archived official
donor pages, CSVs and chart data; current downloads; reporting-template and
data-model searches; and the
[27th FBN session report, paragraph 103](https://unsceb.org/sites/default/files/imported_files/CEB%202016%20HLCM%20FB%209_FBN_27th%20session_conclusions_23-24%20June%202016.pdf),
which records 2015 template changes for pooled financing. Archived voluntary
charts exposed R01–R04, without the missing legacy definitions. References to
CEB/2011/HLCM/FB/16 and /17 were found, but the underlying data-model documents
were not recovered. Broad archive-index requests timed out, although individual
captures were accessible.

The useful next evidence is the historical schema or reporting template defining
these codes and clarifying whether observations identify instruments, donor
channels or overlapping disclosures. Another arithmetic fit or donor-name
pattern would not settle that question. No external request was sent.

This retained note records the experiment and material results; the scripts,
downloaded reports and generated comparison files are not required companions.
