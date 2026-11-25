# Replicating ARWO's ITC CHF conversion

Inspected 25 November 2026. The source reconciliation below preserves ARWO's
financial observations. The subsequent programme-budget display implementation
is described under Adoption below.

## Origin of the rates

ARWO's ITC source notes contain fixed rates in CHF per USD. All four quoted rates
match published UN programme-budget rates based on forward currency purchases:

| ARWO expenditure year | Quoted CHF per USD | Matching UN budget year | Original evidence |
|---|---:|---:|---|
| 2022 | 0.9272 | 2023 | [A/77/632](https://documents.un.org/doc/undoc/gen/n22/724/53/pdf/n2272453.pdf#page=11), paragraphs 41–42: November 2022 forward purchases of CHF 277 million for 2023. |
| 2023 | 0.8758 | 2024 | [A/78/614](https://documents.un.org/api/symbol/access?s=A/78/614&l=en&t=pdf#page=12), paragraph 45: November 2023 forward purchases of CHF 298 million for the regular budget and CHF 47.5 million for the strategic heritage plan, for 2024. |
| 2024 | 0.8220 | 2025 | [A/79/375](https://documents.un.org/api/symbol/access?s=A/79/375&l=en&t=pdf#page=3), paragraph 4; paragraphs 39 and 42; appendix I.B, PDF page 27. The source identifies the purchased rate for 2025 and the policy of using forward rates where available. |
| 2025 | 0.7737 | 2026 | [A/80/480](https://documents.un.org/doc/undoc/gen/n25/276/53/pdf/n2527653.pdf#page=3), paragraph 4; appendix I.B, PDF page 14. [A/80/7/Add.16](https://documents.un.org/api/symbol/access?s=A/80/7/Add.16&l=en&t=pdf#page=5), paragraph 12, identifies the average forward-purchase rate and CHF 171.5 million purchased for 2026. |

The exact matches establish the rates' budget context. The observation that ARWO
quotes the next budget year's rate is a reconstruction of its source notes, not
an independently documented ARWO rate-selection policy. Its 2019–2021 ITC rows
do not state conversion rates and cite different financial-statement sources;
this does not establish which rates ARWO used for those earlier observations.

These rates cannot be reproduced by averaging Treasury operational rates over
the expenditure year. They reflect contracted forward purchases. The inspected
public reports publish average rates and some aggregate foreign-currency volumes,
but not a complete list of individual contract amounts, dollar costs and execution
terms. Consequently, they support exact reuse of the published rates, rather than
an independent reconstruction of the contract averages from transaction inputs.

## Reproducing the conversion and identifying exceptions

For a rate expressed as CHF per USD, the conversion is:

`USD equivalent = CHF expenditure / (CHF per USD)`

The CHF source notes are in thousands; expand them by 1,000 before conversion.

| Expenditure year | Printed CHF expenditure | USD using stated rate | Stored ARWO USD | Result |
|---|---:|---:|---:|---|
| 2022 | 109,809,900 | 118,431,729.94 | 101,815,739 | Stored amount instead matches CHF × 0.9272, rounded to dollars. |
| 2023 | 100,685,800 | 114,964,375.43 | 114,964,375 | Matches division, rounded to dollars. |
| 2024 | 102,991,900 | 125,294,282.24 | 125,294,282 | Matches division, rounded to dollars. |
| 2025 | 109,410,100 | 141,411,529.02 | 125,294,282.23844282 | Actual formula repeats the 2024 operands. |

For 2023, `ARWO_2019-2023.xlsx`, `Vol_ITC-23!I2`, explicitly divides
`100685800/0.8758`. For 2024, `ARWO_2019-2024.xlsx`, `Vol_ITC-23!I2`,
explicitly divides `102991900/0.822`. The sheet retains its older name.

For 2025, `ARWO_2019-2025.xlsx`, `Vol_ITC-25!I2`, repeats
`102991900/0.822`. Its note in L2 gives the newer CHF amount and 0.7737 rate;
L5 separately calculates `109410100/0.7737`. The stored amount differs from the
note-based conversion by USD 16,117,246.78. The 2022 original consolidated source
contains a numeric amount, so multiplication is an arithmetic match rather than
an inspected formula. These exceptions are not corrected by this research.

Run the read-only reconciliation from the repository root:

```bash
uv run python python/reconcile_arwo_chf_rates.py
```

The script checks each note's CHF amount against the reviewed PPB source controls,
matches its rate to the independently sourced budget-rate table, reproduces USD
amounts using decimal arithmetic, and compares the stored ARWO amount with both
division and multiplication. It also reports the portal's existing annual-average
conversion for comparison. It writes JSON to standard output and no data files.

## Adoption for programme-budget USD equivalents

The programme-budget view now uses the published budget rate for expenditure
year Y+1 consistently in chart areas, shares, labels, sums and trends. This is a
documented presentation convention for budget-rate USD equivalents; it does not
reconstruct transaction-date USD expenditure. The original CHF figures and both
the amount and rate citations remain available. The joint CHF regular budget
and WTO share are excluded; the UN grant remains in its printed USD amount.

The portal explicitly extends this convention to 2019–2021 PPB expenditure;
this does not assert that their historical ARWO observations used those rates:

| Expenditure year | Budget year | CHF per USD | Evidence |
|---|---:|---:|---|
| 2019 | 2020 | 0.9740 | [A/76/347](https://documents.un.org/api/symbol/access?s=A/76/347&l=en&t=pdf#page=7), paragraph 14. |
| 2020 | 2021 | 0.8960 | [A/76/7](https://da.desa.un.org/sites/default/files/dafiles/n2122530.pdf#page=156), paragraph IV.84: approved 2021 ITC budget rate. |
| 2021 | 2022 | 0.9235 | [A/77/632](https://documents.un.org/doc/undoc/gen/n22/724/53/pdf/n2272453.pdf#page=37), appendix I.B: approved 2022 rate. Use its published precision rather than the rounded 0.924 in A/76/593. |

The controlling table is `data/un-chf-budget-rates.json`. The prior
calendar-day-weighted operational-rate snapshot and `python/fetch_un_chf_rates.py`
remain historical research inputs only. Correct division using current-year CHF
operands is applied to every PPB year; the ARWO 2022 multiplication match and
2025 stale formula are retained in the source reconciliation, not copied into
the programme-budget calculations.
