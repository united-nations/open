# CEB legacy revenue-code investigation

Research completed against the repository's frozen CEB release retrieved on
9 October 2026. This investigation is read-only with respect to the production
pipeline, financial exports and source files. All generated evidence lives here.

## Conclusion

The current mapping of **R08/R08B/R08b to voluntary core (unearmarked)** is not
defensible. Source observations conflict strongly with that assignment. The
repository descriptions of R09 as generic multilateral, R10 as private sector,
R11 as foundations and R12 as NGOs are also unsupported and, as descriptions of
their observed use, misleading.

**No authoritative historical codebook mapping R05/R07–R12 to the current four
main financing types was recovered.** Do not replace the current guesses with a
new blanket crosswalk presented as verified. In particular, contributor identity
does not establish earmarking: knowing that a contribution came from the EU,
World Bank or a private donor does not itself identify its financing instrument.

The four main CEB revenue controls can remain authoritative without guessing how
these donor records split across instruments. Preserve the original records and
their donor totals, mark the financing allocation unresolved, and keep them out
of instrument-specific donor attribution until a defensible crosswalk exists.

## Scope and reproducibility

Run from the repository root:

```bash
uv run python docs/research/ceb-legacy-revenue-codes/analyze.py
uv run python docs/research/ceb-legacy-revenue-codes/analyze.py --fetch-archives
```

The first command uses only the frozen raw source files and writes the local
profiles and comparisons. The second also fetches archived official CEB pages
and the 2023 official CSV, extracts the historical filter values, and checks the
archived observations against the current snapshot. Archive services may time
out or be temporarily unavailable; existing checked evidence is retained here.

Inputs and their SHA-256 hashes are recorded in `analysis-summary.json`.
`archive-evidence.json` records archived URLs, resolved captures, payload hashes,
and the extracted revenue-code filters. No production classifier is imported by
the research script. Its `CURRENT_ASSIGNMENTS` is a snapshot of the production
rules being tested, not a source of evidence that they are correct.

## What the frozen donor file actually contains

The affected set consists of **801 observations**, all from **2015–2017**, with
**$18,863,592,163.78** in signed recorded amounts. All 801 have blank `rev_name`
in the current source. This is a sum of source observations, not unique funding;
CEB does not eliminate inter-agency transfers, and there are 60 exact repeated
rows in this subset. No rows were deduplicated or clipped for this investigation.
An identical export row does not prove that the underlying financial observation
is a duplicate; the published schema may omit its original dimensions.

| Code | Observations | Recorded USD | Current portal assignment |
|---|---:|---:|---|
| R05 | 6 | 4,736,303.00 | Other |
| R07 | 10 | 184,495,117.05 | Earmarked |
| R08 | 81 | 2,464,822,622.39 | Unearmarked |
| R08B | 60 | 3,812,680,018.10 | Unearmarked |
| R08b | 1 | 8,317,821.00 | Unearmarked |
| R09 | 139 | 7,058,963,043.50 | Earmarked |
| R10 | 91 | 910,263,529.01 | Earmarked |
| R11 | 61 | 1,166,525,703.07 | Earmarked |
| R12 | 352 | 3,252,788,006.66 | Earmarked |

See `code-profile.csv`, `code-donor-profile.csv` and `source-examples.csv` for
the exact checks, contributor distributions, years and source-record references.
The lowercase-b code is a single WFP/Gates Foundation record from 2016. Treating
it as a casing variant of R08B is plausible, but does not establish what R08B
means or which main financing type it belongs to.

## Recovered primary sources

### A. Official CEB definitions archived in July 2017

[Archived CEB Financial Statistics: Definition of Terms](https://web.archive.org/web/20170710195326/http://www.unsceb.org/content/financial-statistics-definition-terms)
describes four high-level revenue categories, distinguished by assessment,
donor restrictions on use, and revenue outside contribution accounting. These
definitions support the broad continuity between specified/non-specified and
earmarked/unearmarked terminology. They provide no R05/R07–R12 codebook.

[Archived CEB FAQ](https://web.archive.org/web/20170709154149/http://www.unsceb.org/content/financial-statistics-faq)
explains that organizations agreed the reporting categories and submitted
Excel-based data feeds. It also distinguishes the prior core/non-core budget
concepts from contribution restrictions. It provides no missing-code crosswalk.

### B. Official chart filters expose actual historical code meanings

[CEB agency-revenue chart, June 2017 capture](https://web.archive.org/web/20170625134917/http://www.unsceb.org/content/FS-A00-01)
has an HTML `select[name=type]` with these explicit pairs:

| Code | Archived CEB label |
|---|---|
| R01 | Assessed Contributions |
| R02 | Voluntary Contributions - Non-specified |
| R03 | Voluntary Contributions - Specified |
| R04 | Revenue from other activities |

These four meanings are verified from the official source, rather than inferred
from the numerical prefixes. The archived filter's available years end in 2015.

[CEB chart, July 2019 capture](https://web.archive.org/web/20190719055908/http://unsceb.org/content/FS-A00-01)
extends coverage through 2017 and adds an R03A option for contributions whose
earmarking was still pending. It does not expose R05/R07–R12 as main-type options.

This is also a warning about versioning: the older R03A meaning differs from
the modern R03A pooled-fund subtype. A code's modern meaning must not be assumed
to apply automatically to older datasets. It does not by itself prove that the
same four-type aggregation of R03A would be wrong.

### C. The legacy codes were already present in CEB's 2023 downloadable CSV

[Archived official donor CSV, August 2023](https://web.archive.org/web/20230801175257/https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_non_gov_donors.csv)
contains the same 801 legacy financial observations. Matching amount, currency,
recipient (after recognized organization aliases), year, code and contributor
type confirms this is longstanding source encoding, not a newly introduced
2026 download corruption. The 2023 file has no `rev_name` column at all.

CEB has modernized some donor labels between the archived and frozen files:

| 2023 source label | Current source label | Legacy rows |
|---|---|---:|
| Private | Private Donors | 317 |
| World Bank | World Bank Group | 69 |
| Multidonor Trust Funds | Multi Donor Trust Funds | 30 |
| Bill and Melinda Gates Foundation | Bill & Melinda Gates Foundation | 24 |

These are source-supported historical name correspondences, independently of
the unresolved financing-code classification. See `archive-donor-aliases.csv`.

### D. Modern Standard IV does not supply the old numeric crosswalk

[CEB Data Standards, March 2024 edition](https://unsceb.org/assets/media/pages/UN-Data-Standards-for-system-wide-reporting-of-financial-data.pdf),
printed pages 31–33 (PDF pages 33–35), defines the modern financing hierarchy.
The publication places inter-agency pooled funds, single-agency thematic funds,
and global vertical funds under earmarked contributions. It distinguishes
programme-implementation transfers from fees for services to other UN entities.
The standards were approved in 2018; the implementation table addresses FY2018
onward. This document does not define the legacy R05/R07–R12 values.

[Current CEB financing page](https://unsceb.org/statistics/revenue-by-financing-instrument/)
also says the displayed subtype breakdown starts in 2017. Neither that statement
nor the modern hierarchy proves a numeric crosswalk for the older donor export.

## A concrete failure of the current mapping

For **UNDP, 2015**, three independent source presentations yield:

| Observation | USD |
|---|---:|
| Reported total voluntary unearmarked revenue | 745,714,467.00 |
| Government donor records explicitly classified as unearmarked | 745,605,072.00 |
| Remaining room under that control | 109,395.00 |
| Nongovernment records carrying R08 | 289,396,584.00 |
| Nongovernment records carrying R08B | 846,102,414.00 |
| Residual after the current R08/R08B → unearmarked assignment | -1,135,389,603.00 |

The current assignment creates a negative unearmarked reconciliation balance
of **$1.135 billion**, while total system revenue still reconciles because the
pipeline creates an offsetting balance. This is why reconciliation alone cannot
validate the financing classification. UNDP 2016 shows the same pattern.

Source disagreement can exist, so this arithmetic is not a proof of each record's
correct alternative category. It is strong evidence against claiming that the
current core classification is an established source fact. See
`control-comparisons.csv` for this and additional entity/year checks.

Matching each legacy donor amount to a single raw revenue-control row at the
same recipient, year and cent value produced **zero matches**. A direct row-match
shortcut cannot recover the missing classifications from this snapshot.

## Observed patterns and their limits

| Code | Observed source pattern | What is established |
|---|---|---|
| R05 | A few private/US national-committee records at IOM and UNICEF | Exact purpose and main type unresolved. The repository's Other label is unverified. |
| R07 | Multi-donor trust funds at UNFPA; private/committee records at UNICEF | A thematic-fund interpretation is plausible, but no codebook was found. |
| R08 | Multi-donor trust funds, UN OCHA and UNDP | Strong pooled-fund/channel pattern; unearmarked assignment contradicts controls in major examples. |
| R08B/R08b | GEF, Global Fund, Gavi and other records | Strong vertical-fund/channel pattern; the current unearmarked assignment is unsupported. |
| R09 | Every one of the 139 rows names European Union | EU-specific use in this sample, not an established generic multilateral definition or proof of earmarking. |
| R10 | Mostly OCHA and UNDP; small GEF/Global Fund records | UN-entity/channel pattern. The repository's private-sector description is inconsistent with observed donors. |
| R11 | Mostly World Bank Group, plus GEF records | IFI/channel pattern. The repository's foundations description is inconsistent with observed donors. |
| R12 | Private, foundation, national-committee and other records | Broad mixed source pattern. Neither NGO-only meaning nor universal earmarking is established. |

The patterns suggest the older detail field may mix funding-channel and
contributor-related classifications with financing types. That is a hypothesis,
not a recovered official schema. It must not become a category override inferred
from donor names.

## Recommended handling and unresolved dependency

1. Keep R01–R04's verified high-level historical meanings. Use the explicit
   current textual revenue controls for the four published totals.
2. Do not retain undocumented blanket R05/R07–R12 assignments as source truth.
   In particular, stop presenting R08/R08B/R08b as verified unearmarked funding.
3. Preserve affected donor observations and totals independently from their
   unresolved split by financing instrument. A donor's total can be known while
   its four-type breakdown is unavailable. The UI should indicate that gap.
4. Calculate per-instrument unattributed balances from the controls and only
   detail whose instrument has been resolved. Do not add unresolved named-donor
   totals to those already-balanced instrument totals a second time. This needs
   an explicit export model; renaming an existing balance is insufficient.
5. Treat a CEB-supplied historical codebook, schema documentation, or a revised
   donor export with the actual financing fields as the blocking dependency for
   a verified full crosswalk. No contact with CEB was initiated.

Suggested question for a future authorized inquiry: which historical field did
`rev_type` represent in the 2015–2017 nongovernment donor export, what are the
definitions of R05/R07/R08/R08B/R09/R10/R11/R12, and are those records disjoint
contributions with recoverable main financing types or overlapping channel
disclosures?

## Search boundary

Reviewed current official CSVs and their HTML loaders; the 2017 definitions and
FAQ; 2017/2019 chart filters and an archived entity-revenue CSV; the 2023 donor
CSV and modern CEB standards; the archived 2011 financial-database project status
report; and archived download/dataset pages. The 2011 project report contains no
missing-code definitions. Some archive index searches timed out or returned
temporary-service failures. Historical numeric definitions remain unrecovered;
absence from the reviewed pages is not evidence that no codebook exists.

Production files and exports were not changed, and nothing was committed.
