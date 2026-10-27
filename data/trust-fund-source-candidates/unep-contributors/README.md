# UNEP contributor evidence and fuller-coverage research

Checked 27 October 2026. This directory contains two distinct, usable contributor
extracts plus official sources identified for a later expansion. The extracts do
**not** provide complete donor coverage of UNEP's 132/133 audited account rows.
They must remain separate measures and must not be added to one another or to
expenditure.

## Contributor publication scope

The annual-report contributor rankings are excluded from the website at the
user’s request. Their PDFs, extraction files and source links are retained for
reference only. The CBD contributor subset is also excluded from all website views and
exports. Both source sets remain research/reference evidence only. The UNEP entity sidebar retains an annual-report reference link.

## Retained extracts

### Reference only: annual-report contribution snapshots, 2023 and 2024

`contributor-observations.csv` has **60 observations**: the published top 15
Environment Fund counterparties and top 15 earmarked counterparties for each
year. `extract.py` reproduces them from retained PDFs, `source-manifest.json`
records official original/mirror URLs, hashes and physical pages, and
`quality-profile.json` records the counts and listed sums.

- [UNEP Annual Report 2023, physical PDF p. 22](https://digitallibrary.un.org/record/4047327/files/1405542-EN.pdf#page=22),
  printed p. 20, provides the 2023 tables.
- [UNEP Annual Report 2024, physical PDF p. 30](https://brasil.un.org/sites/default/files/2025-02/UNEP-Annual-Report-2024.pdf#page=30),
  printed p. 28, provides the 2024 tables. The file is retained from an official
  UN country-team mirror; the original UNEP repository URL is also in the manifest.

Each source amount is printed to 0.1 million USD. Values are converted exactly
to USD while retaining the printed precision. Listed Environment Fund amounts
sum to $81.6 million in 2023 and $80.6 million in 2024; the earmarked lists sum to
$251.2 million and $269.2 million. These are **listed top-15 sums**, not complete
annual donor totals. No residual "Other" contributor or annual denominator is
created. The 2023 financial summary on the same page covers the 2022–2023
biennium; it must not be used as the denominator for the annual 2023 donor list.

The annual report describes its financial income figures as provisional and
subject to closure of annual accounts. Its contribution snapshots are not
relabelled audited IPSAS contribution revenue or cash receipts. The earmarked
lists include grouped UN-agency and NGO counterparties, preserved as groups,
and UNEP Finance Initiative as the reported counterparty.

Environment Fund observations map only to `xb:UNEP:annex:I`, the printed
Environment Fund family. They are **not allocated** to FEL, FPL or RAL. The
annual-report earmarked category has only the UNEP entity destination because
its source does not establish a coded-account allocation. There is no complete
donor-by-every-UNEP-fund matrix in these annual reports.

### CBD historical convention-fund collection ledgers, 2023 and 2024

`cbd-contributor-observations.csv` has **521 source donor-line observations**
with observed collection amounts. This is not a distinct donor count. It covers
nine source fund ledgers mapped to these six audited UNEP accounts:

| CBD source fund | Audited UNEP account | Meaning |
|---|---|---|
| BY and BY+ | BYL | Convention on Biological Diversity core and additional core contributions |
| BE | BEL | Additional voluntary support to approved CBD activities |
| BZ | BZL | Participation of parties in the convention process |
| VB | VBL | Participation of Indigenous and local communities |
| BG and BG+ | BGL | Cartagena Protocol on Biosafety core and additional core contributions |
| BB and BB+ | BBL | Nagoya Protocol core and additional core contributions |

The original [2023](https://www.cbd.int/convention/parties/contributions.shtml?tab=3&yr=2023)
and [2024](https://www.cbd.int/convention/parties/contributions.shtml?tab=3&yr=2024)
historical HTML pages are retained. Each observation links to its original
fund-section anchor. These sources are HTML tables; no PDF page is invented.

`extract_cbd.py` reproduces the extract. `cbd-statement-facts.csv` retains
**7,896 literal metric observations**, including missing cells and printed
fund totals, with source row and table identity. `cbd-source-manifest.json`
records the snapshots and hashes. `cbd-quality-profile.json` contains **28
collection-column checks; all named rows exactly reconcile to the printed
detailed-ledger totals**. The source's summary donor-type tables differ from
its detailed ledgers by a few dollars (for example, 2024 BY current collections
are $11,743,943 in the summary and $11,743,940 in the detailed ledger). The
extract uses and cites the detailed ledgers; it does not alter any donor row.

For display, `collections_received_during_year` adds two source columns:
collections in the reporting year on earlier pledges, and collections on
current-year pledges. Their separate values remain in the `components` JSON
and raw fact table. Pledges, opening arrears and closing unpaid balances are
not added to collections. A blank source amount remains missing in raw facts;
a line with neither observed collection component does not receive a fake
zero observation. Repeated country lines represent separate source contribution
lines, including additional core contributions, and can be grouped by donor
only within this source measure.

These collection ledgers have exact fund-account mappings, but collections
need not equal IPSAS contribution revenue or annual expenses. They must remain
separate from the annual-report top-15 contribution series.

## Regeneration

From the repository root:

```bash
uv run python data/trust-fund-source-candidates/unep-contributors/extract.py
uv run python data/trust-fund-source-candidates/unep-contributors/extract_cbd.py
```

Both commands use retained sources without a network request. The source
CSV schemas are frozen for frontend integration in this task. Follow-up sources
below are not appended to those CSVs.

## Remaining complete-coverage work and official source leads

### Environment Fund: exact all-country amounts remain a gap

The official [resource documents page](https://www.unep.org/en/who-we-are/funding/resource-documents)
lists full year-end status tables and a contributions portal, but its 2024
"status report" link currently points to the same **2023** file as the 2023
label. The [listed 2023 table](https://wedocs.unep.org/bitstream/handle/20.500.11822/44702/Environment%20Fund%20Table%20as%20at%2031%20December%202023%20to%20MS.pdf?isAllowed=y&sequence=1)
could not be retrieved: direct UNEP/Wedocs requests returned Cloudflare 403 and
the web reader did not expose the full table. No 403 HTML response is retained
as if it were a PDF. `retrieval-notes.json` records this issue.

The [2024 statistics report](https://wedocs.unep.org/bitstreams/a6b62b4f-660a-4e72-a146-d96fdd1079cd/download)
is a two-page infographic with top-15 amounts and names of other contributing
countries, not all donor amounts. The [official contribution portal landing
page](https://www.unep.org/en/who-we-are/funding/status-contributions) advertises
historic country trends; a complete source export and its measure definitions
remain to be obtained. The most useful manual retrieval is the genuine
**2023 and 2024 year-end all-country Environment Fund status tables**, preserving
their complete PDFs and original URLs. Another copy of the top-15 infographic
will not close that gap.

### Ozone: full historical PDF donor ledgers located and retained

`followup-source-manifest.json` records two retrieved PDFs, kept outside the
current contributor exports:

- [Fiscal-year 2023 financial report, UNEP/OzL.Conv.13/5–UNEP/OzL.Pro.36/5](https://ozone.unep.org/system/files/documents/COP-13-5_MOP-36-5E.pdf#page=16),
  **Annex VI starts at physical PDF p. 16**. Named-party contribution-status
  tables cover the Vienna Convention and Montreal Protocol funds.
- [Fiscal-year 2024 financial report, UNEP/OzL.Pro.37/5](https://ozone.unep.org/system/files/documents/MOP-37-5E.pdf#page=19),
  **Annex VI pp. 19–24** supplies the same two named-party ledgers. These match
  audited UNEP accounts **VCL** and **MPL**. **Annex III p. 10** separately names
  actual cash earmarked receipts by donor/purpose and explicitly distinguishes
  its modified-cash basis from the IPSAS statements in Annex II.

For these ledgers, annual cash received includes current-year collections,
prior-year collections and new advance receipts; prior-year advance receipts
applied in the current year must not be counted again. The 2024 report's
paragraphs 9 and 11 provide explicit received controls ($812,868 for Vienna;
$3,743,726 for Montreal). These should guide the next adapter. A parent fund
and its earmarked subset must not be counted twice. The current
[Ozone live ledger](https://ozone.unep.org/fund-contributions) mixes historic
year records with current-year column captions and later update dates, so the
fixed year-end PDFs are the safer source for a historical annual extract.

### Other convention funds

- The [Basel 2024 contribution-status archive](https://www.basel.int/TheConvention/FinanceBudget/TrustFund%28BC%29/ContributionsStatus/2024/tabid/9815/Default.aspx)
  lists all twelve monthly snapshots, including 31 December 2024. InforMEA
  identifies the year-end attachment as
  `UNEP-CHW-FI-REP-BCcontributions-20241231.English.xlsx`. The browser-readable
  archive exposes a spreadsheet icon rather than a resolved file URL; the
  workbook and corresponding Rotterdam/Stockholm annual ledgers still need
  retrieval and measure review. The likely account mapping must be checked
  against BCL/BDL and corresponding convention codes before import.
- The [Mediterranean Trust Fund page](https://www.unep.org/unepmap/who-we-are/mediterranean-trust-fund)
  lists [31 December 2024 status](https://cdn.unenvironment.org/unepmap/unepmap/DownloadsBasicPages/MTF/MTF20241231.pdf),
  a one-page PDF visible to the web reader but not retrievable through direct
  HTTP in this pass. It also lists 2022–2023 accounts. Exact collections and
  account **MEL** mapping need verification; support accounts QML/CAL cannot be
  treated as the same destination without evidence.

### Entity-wide context already exists separately

The portal's existing CEB-backed `public/data/donors-2023.json` and
`donors-2024.json` contain UNEP entity-level contributor amounts by financing
instrument. They could support a separately labelled CEB context view. They do
not establish named contributor links to the audited accounting-fund rows and
must not be silently mixed with these contribution/collection ledgers.

Complete UNEP donor coverage therefore remains open: much of the programme-
of-work trust-fund portfolio, some convention funds, the Multilateral Fund and
other source categories still lack a validated named-donor annual ledger in
this extraction. No financial coverage percentage across these mixed measures
has been calculated.
