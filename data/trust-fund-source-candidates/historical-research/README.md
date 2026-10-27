# Historical audited trust-fund / XB extraction research

Checked 27 October 2026. **No ARWO inputs or amounts are used here.** These are
isolated source-research outputs, not published website data. The parent task
removes ARWO fallback and leaves unextracted historical years unavailable.

## Result

A direct-source backfill is feasible for all four entities for **2019–2022**.
All16 official annual reports have been retrieved, their cover symbols/periods
checked, their hashes pinned and the relevant physical PDF pages inspected.
`coverage.csv` records the page inventory; `entity-controls.csv` contains
16 direct-source entity/year controls with per-input page links. These controls
are not proxies for individual-fund breakdowns and are not silently published.

| Entity | 2019 | 2020 | 2021 | 2022 | Basis |
|---|---:|---:|---:|---:|---|
| UNEP | 592.782m | 491.139m | 566.964m | 626.632m | Audited total expenses minus regular-budget expenses |
| UNODC | 342.837m | 299.274m | 322.002m | 371.599m | Audited total expenses minus actual RB expenses in Note18 |
| UN-Habitat | 163.117m | 135.318m | 156.893m | 186.678m | Audited total expenses minus RB segment expenses |
| ITC | 91.780m | 91.880m | 107.120m | 114.630m | Explicit reported gross XB programme delivery |

Amounts above are USD millions; underlying CSV uses exact source precision.
The ITC gross-delivery paragraphs are in chapterIV's financial report, which is
**other information outside the audit opinion on the financial statements**.
They must retain the existing label “reported gross XB programme delivery”,
not be relabelled audited IPSAS expenses or netted against a different basis.

## Reproducible UNEP2022 pilot

Run from the repository root:

```bash
uv run python data/trust-fund-source-candidates/historical-research/inspect_sources.py
uv run python data/trust-fund-source-candidates/historical-research/pilot_unep_2022.py
```

Both use retained source files offline. `fetch_sources.py` is the separate,
networked retrieval step; it does not query ARWO or modify the shared manifest.

The pilot directly reuses the existing `secretariat_xb_sources.table_rows`,
`process_table`, monetary conversion and PDF-link helpers with historical table
specifications. It writes only `pilot-unep-2022/`:

- **138 individual fund accounts**,1,158 monetary facts and15 literal tables.
- **304 checks pass:** opening components, each account's net-asset flow
  equation, account-plus-annex-adjustment totals, annexes to segment expenses,
  segments plus eliminations to entity totals, an independently read StatementII
  expense total, and gross account expenses plus eliminations to net non-RB.
- Current2022 account/segment observations are distinct from the retained2021
  entity comparative. No current/comparative vintages are appended together.
- Every fact has original symbol, URL, physical PDF page, row/column, unit,
  printed text, word/table provenance and `source_page_url`.

Controls:

```
Gross account expenses                         701,032,000
Entity-level expense eliminations              -74,399,000
Net expenses excluding regular budget          626,632,000

StatementII total expenses                     651,319,000
Regular-budget expenses                         24,687,000
Total less regular budget                      626,632,000
```

Source: [A/78/5/Add.7](https://digitallibrary.un.org/record/4023202/files/A_78_5_Add.7-EN.pdf),
StatementII physical p72, segment performance p98, fund annexes pp134–147.
These are physical PDF page numbers; the document's printed pagination is two
pages lower. The source registry records147 physical pages, not145.

### Necessary adapter changes, identified by the pilot

1. **Historical fund tables have six numeric columns.** Their fields are opening
   accumulated surplus, opening reserve, opening net assets, revenue, expense,
   closing net assets. The2023/24 adapter's two separate movement columns must
   not be padded into older documents with invented zeros.
2. **A real within-annex stock elimination exists.**2022 AnnexII has a
   “Fund IML financial statement elimination” of **−USD51,158,000** in net
   assets, with zero revenue/expense. The account remains as printed; the
   adjustment must remain separate and must not be treated as expense or as a
   fabricated fund. Gross account closing assets differ from the annex's net
   closing total by this signed stock adjustment.
3. **One geometrically offset cell needs recovery.** SVL's revenue on p140 is
   printed2.16points below its other numeric cells. The pilot recovers the
   unique isolated same-row value3,858(thousand USD), retaining its own source
   y/physical-row provenance. The current adapter handles preceding wrapped
   cells but not this following offset. All account equations and annex controls
   then reconcile. The rule is bounded to a unique cell within3points; it does
   not fill genuine source blanks.

The `table-specifications.json`, `tables.jsonl`, `statement-facts.csv` and
`quality-profile.json` retain the pilot's evidence, signed values and checks.
The complete frozen source PDF is retained under `raw/UNEP-2022.pdf`.

## Page inventory and historical detail changes

| Entity | 2019 | 2020 | 2021 | 2022 |
|---|---|---|---|---|
| UNEP segment performance | p125 | p105 | p103 | p98 |
| UNEP fund-account annexes | pp159–167, only programme-of-work and conventions | pp141–153, six annexes | pp139–151, six annexes | pp134–147, six annexes |
| Habitat segment performance | p103 | p94 | p117 | p107 |
| UNODC drug/crime performance | p85 | p88 | p88 | p86 |
| UNODC actual RB control, Note18 | p101 | p104 | p104 | p102 |
| ITC reported gross-XB paragraph | p40 | p32 | p30 | p29 |

### UNEP

2020–2022 retain the six broad segment annexes used in the later statements,
with the six-column numeric layout above. 2019 provides individual account rows
for programme-of-work and conventions/protocols only; the other segments remain
available in the segment statement as aggregates. The earlier source must not
be presented as a complete six-annex individual-account inventory.

**Do not identify a historical fund group by Roman annex number alone.**
AnnexI in2017–2019 is programme-of-work support; AnnexI from2020 is Environment
Fund. Historical group identity/history needs a semantic segment mapping or
explicit aliases. Otherwise an existing `UNEP:annex:I` history would compare
different resource groups. Preserve exact account codes and source-specific
printed subgroup labels; a disappearing code is not automatically a zero.

### Habitat

All four years publish the familiar non-earmarked/RB/earmarked/technical-
cooperation/support/benefit/elimination segments. The same segment adapter can
be extended with reviewed page/start-y specifications and current/comparative
column mappings. These are funding segments, not an individual trust-fund
inventory. The2019 segment table explicitly marks the2018 comparative as
restated; later restated comparisons must not overwrite a chosen source vintage
without recording that choice.

### UNODC

The drug/crime pillar tables continue to include regular-budget activity and
are not a pure-XB fund breakdown. Subtract Note18's actual **total expenditure**
from StatementII expenses for a source-backed entity non-RB control. Do not use
only direct programme activities, the headline RB estimate or a pledge total.
The2022 Note18 restates the2021 direct-programme comparator to include section36.
Some older comparative cells use periods as thousands separators, e.g.23.963;
column-specific monetary parsing must avoid treating these as decimal USD.

### ITC

Each chapterIV report explicitly supplies gross XB delivery for the current
year, matching the measure already used for2023/24. StatementII also supplies
IPSAS entity expenses, but it does not turn window contribution receipts into
expense breakdowns. Separate annual-report donor appendices are still needed
for named funders/windows; their receipt/funding measure remains separate.

## Contributors

Historical expenditure does not depend on finding donor detail. The inspected
UNEP statements provide fund-account revenue, not a full named donor schedule;
UNEP contributor subsets remain excluded from the website at the user's
request. Habitat's interim donor annexes and ITC's window donor appendices are
separate source work. The UNODC pledge dataset must not be substituted for
historical audited revenue or expenditure. Existing2024 Habitat comparative
core-contribution columns already cover2020–2022 at their own partial scope;
those are not new money to append when earlier report vintages are retrieved.

## Bounded2017–2018 probe and earlier limits

The official [Board of Auditors directory](https://www.un.org/en/united-nations-board-auditors/board-auditors-reports)
lists annual2017/2018 reports for all four entities: A/73/5 and A/74/5,
respectively, with Add.7(UNEP),Add.9(Habitat),Add.10(UNODC) and Vol.III(ITC).
Only the two UNEP PDFs were additionally downloaded/inspected in this bounded
probe; the other entities'2017/18 tables are **not yet layout-verified**.

- UNEP2017 A/73/5/Add.7:109 physical pages; segment performance p64,
  programme-of-work annex pp99–105 and conventions annex pp106–109.
- UNEP2018 A/74/5/Add.7:126 physical pages; segment performance p84,
  programme-of-work annex pp117–122 and conventions annex pp123–126.
- Both are annual IPSAS-era sources with the narrower two-annex fund-account
  inventory, like2019. `earlier-probe-manifest.json` retains their official URLs,
  cover periods and SHA256; these are retrieval/layout probes, not parsed facts.
- Going further back must distinguish annual IPSAS-era statements from earlier
  biennial reports. The BOA directory lists2012–2013 and older biennia for these
  entity series. A biennium must not be divided or duplicated into annual rows.
  Older accounting-policy transitions require their own reviewed source specs;
  the2019 UNEP/Habitat notes refer to2014 IPSAS opening-balance adjustments.
  This research does not assert that every entity adopted IPSAS in the same year.

## Recommended implementation order

1. Integrate/review the UNEP2022 pilot and generalize only the proved historical
   cell/column rules. Add source controls and explicit annex stock adjustments.
2. Extend UNEP2021/2020 six-annex configurations with the same validations;
   handle2019/2018/2017 as partial individual-account coverage with segment
   aggregates, using semantic group identities across the annex renumbering.
3. Extend Habitat's segment specs and UNODC's pillar/RB-control specs separately;
   retain no fictitious pure-XB child funds for UNODC.
4. Extend ITC's explicitly labelled gross-XB report paragraphs, independently of
   IPSAS expenses and contributor receipts.
5. Stage each current-year source with page-specific lineage, validate and only
   then add it to the website. Missing sources/layouts remain unavailable. No
   ARWO amount is ever used to fill a missing trust-fund period.
