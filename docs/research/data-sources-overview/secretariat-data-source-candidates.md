# Money and the United Nations Secretariat: sources, reconciliation, and data model

**Status:** research report, 18 August 2026

**Scope:** actual revenue, contributions, expenditure, and expense. Proposed budgets,
appropriations, and revised estimates are considered only when they provide a crosswalk for
actuals.

**Validation assessment:** share with caveats. The central local calculations and cross-source
residuals have been independently recomputed. Claims about restricted Umoja and SOC capabilities
are based on their report inventories and public descriptions, not on inspected transaction
extracts. The CEB consolidation-policy ambiguity and the PPB-to-audited-XB bridge remain unresolved.

## Executive conclusions

1. There is no single public source for a complete contributor-to-subprogramme view. The closest
   defensible result is a fusion of sources, with every relationship labelled as observed,
   crosswalked, or allocated.
2. Regular-budget expenditure is the cleanest part. The OPPFB monthly extract and the old
   `open.un.org` Secretariat extract reconcile almost exactly in 2022 and 2023, both at section
   level and—after code normalization—at entity level. Their 2023 total also equals the audited
   Volume I budget-basis actual at statement rounding. A matching total can still hide a material
   reallocation between entities: the 2023 sources differ by $11.2 million in absolute entity
   residuals inside section 8 while their grand totals differ by less than one dollar.
3. The PPB documents are the only public source found with regular-budget and extrabudgetary
   actuals at subprogramme level. They are indispensable, but their extrabudgetary series is not a
   disaggregation of audited voluntary expense. The accounting basis, reporting perimeter, and
   section distribution differ.
4. “Complete by subprogramme” cannot literally mean that every dollar receives a numbered
   subprogramme. In the 2023 PPB extraction, 37.4% of regular-budget and 27.0% of
   extrabudgetary expenditure terminates at a numbered subprogramme. The remainder is published as
   executive direction, programme support, a mission, a programme-wide component, or another
   allocation. These need explicit residual categories.
5. The Schedule of Individual Trust Funds is much richer than a government-donor list. It contains
   IPSAS statements of financial position and performance, donor schedules, contribution
   receivables, transfers, and fund descriptions. Its trust-fund names can be joined to the old
   Secretariat extract: every one of the 175 named funds in that extract maps to exactly one entity
   and one priority area. This creates a strong public donor-to-fund-to-entity bridge, but not a
   donor-to-current-year-expense allocation.
6. CEB is a useful control and multidimensional source, not the parent table for a Secretariat
   entity/subprogramme model. Its published expense data has a `UN` block, a `UN-DPO` block, and a
   few small UN sub-entities, but not the Secretariat departments requested by the current Data Cube
   standard. Its geography cube reconciles to its expense totals; its SDG cube has substantial
   entity-year coverage gaps.
7. Umoja appears capable of closing much of the remaining gap. The report inventory shows the
   necessary accounting ladders—fund, grant, sponsor, sponsored programme, funds centre,
   functional area, WBS, and business area—but not yet that all keys coexist in one extract or that
   extrabudgetary functional areas map reliably to PPB subprogrammes. A small, specified sample is
   the next decisive test.

## 1. Comparison rules

### 1.1 Money has several non-interchangeable stages

| Measure | Meaning | Typical source | Rule |
|---|---|---|---|
| Assessment | Amount legally apportioned to a Member State | assessment notices, SOC | Not revenue, cash, or expense |
| Pledge/agreement | Donor commitment | Umoja Grants Management | May be recognized before cash is received |
| Recognized revenue | Accrual-basis revenue under the entity's recognition policy | audited statements, CEB | Do not call it cash received |
| Cash receipt/payment | Settlement of a receivable or contribution | SOC, honour rolls, Umoja AR/GM | Can occur in a later period |
| Budgetary expenditure | Consumption recorded against a budget, generally modified cash | OPPFB, PPB, performance reports | Not automatically IPSAS expense |
| IPSAS expense | Accrual-basis expense in the statement of financial performance | audited statements, CEB | Includes recognition and consolidation effects absent from budget actuals |

The 2023 Volume I statements illustrate why this matters. They recognize $3.278 billion of assessed
revenue and $3.112 billion of voluntary revenue, but also describe multi-year voluntary agreements
whose future portions can be recognized when the agreement becomes binding. Revenue therefore
cannot be interpreted as receipts available for spending in the same year. See
[A/79/5 (Vol. I)](https://digitallibrary.un.org/record/4062977/files/A_79_5_%28Vol._I%29-EN.pdf).

### 1.2 Organizational levels are not interchangeable

The main hierarchies overlap but do not nest automatically:

```text
CEB reporting entity
  -> audited reporting entity / financial-statement volume
    -> fund group or financial-statement pillar
      -> programme-budget part and section
        -> organizational entity / office / mission
          -> fund and grant
            -> programme component and subprogramme
              -> sponsored programme / WBS / project
```

A source is comparable only at the finest shared level after scope, basis, and period are aligned.
Grand-total agreement is a control check, not evidence that distributions agree.

### 1.3 Time periods and vintages must be explicit

- The regular budget, Volume I statements, and most CEB data use calendar years.
- Peacekeeping budgets and Volume II statements use 1 July–30 June financial years. CEB labels the
  year ended 30 June 2023 as 2023 for `UN-DPO`.
- PPB documents published two years later carry prior-year actual expenditure and warn that it may
  still be adjusted.
- OPPFB extracts are transaction snapshots and can include later postings or restatements.

Every fact table should therefore retain `period_start`, `period_end`, `period_label`,
`publication_date` or extract timestamp, and `vintage`.

## 2. Source registry

| Source | Access | Basis / period | Useful dimensions | Principal limitation |
|---|---|---|---|---|
| [CEB Financial Statistics](https://unsceb.org/financial-statistics/) and [downloads](https://unsceb.org/data-download/) | Public CSV | Normally IPSAS/accrual; annual; exceptions permitted by the [Data Cube standard](https://unsceb.org/assets/media/pages/UN-Data-Standards-for-system-wide-reporting-of-financial-data.pdf) | reporting entity, contributor, revenue type, geography, SDG, function; narrow thematic-fund file | Secretariat departments and subprogrammes are not published; dimensions are separate cubes |
| Old [UN Transparency Gateway](https://open.un.org/about-un-transparency-gateway) Secretariat extract | Public site; local CSV | Mixed: PPB budgetary RB, mission performance reports, and audited voluntary expense; 2019–2023 | section, entity, source type, priority area, named trust fund | Mixed bases and incomplete financial-statement consolidation; no subprogramme |
| OPPFB monthly workbooks | Internal/local | Budgetary expenditure; calendar month | section, entity, object, month; 2025 BIP also functional area, funds centre | Fund `10UNA` only; no extrabudgetary or peacekeeping mission accounts |
| PPB fascicles and local `programme-budget-data` extraction | Public documents/local JSON | Prior-year budgetary expenditure | section, budget unit, component, subprogramme, RB/OA/XB | XB does not reconcile to audited voluntary; some amounts sit outside the standard resource table |
| [Volume I audited statements](https://digitallibrary.un.org/record/4062977) | Public PDF | IPSAS; calendar year | revenue/expense class, fund group, financial-statement pillar | Not department or subprogramme level |
| [Volume II audited statements](https://digitallibrary.un.org/record/4045410) | Public PDF | IPSAS; July–June | active mission, support activity, closed mission | Not the same basis as mission budget-performance expenditure |
| [Schedule of Individual Trust Funds](https://digitallibrary.un.org/record/4060617) | Public PDF | IPSAS; calendar year | fund, donor, recognized contribution, receivable, transfer, natural expense class | Fund-to-entity is not printed as a key; fund-to-subprogramme is absent |
| Programme and peacekeeping performance reports | Public PDF/Word | Budgetary expenditure | section/entity or mission; object and budget line in many reports | Numerous documents; differing structures and fiscal periods |
| [Assessment notices](https://www.un.org/en/ga/contributions/budget.shtml) | Public PDF | Amount assessed | Member State; RB total or specific PK mission | RB assessments are not earmarked to entities or subprogrammes |
| [Honour rolls](https://www.un.org/en/ga/contributions/previous_honourrolls.shtml) | Public HTML | Full payment status at a stated cutoff | fully paid State, net assessment, final payment date | Omits partial payments; historical pages appear to be dated snapshots |
| [Status of Contributions portal](https://soc.un.org/) | Restricted | Daily assessment, payment, and amount due | Member State, RB, PKO, tribunals; historical monthly reports | Login required; extractability and mission detail need testing |
| [Umoja Contributions Portal](https://umoja.un.org/news/launch-new-umoja-contributions-portal) | Restricted | Daily | assessed, paid, due by Member State for RB/PKO/tribunals | Access and bulk export unknown |
| Umoja operational/BI reports | Restricted; local inventory | Both budgetary and IPSAS views depending report | fund, grant, sponsor, sponsored programme, funds centre, functional area, WBS, business area | Keys and historical master-data snapshots must be tested in actual outputs |
| [MPTF Office Gateway](https://mptf.undp.org/) | Public | deposits, transfers, reported expenditure | donor, pooled fund, participating organization, project/country | Only MPTFO-administered pooled funds; stages must not be summed |
| [CBPF Data Hub](https://cbpf.data.unocha.org/) and [OCHA FTS](https://fts.unocha.org/) | Public | contributions/allocations or reported humanitarian flows | donor, recipient, country, plan, sector/project | Sector-specific; FTS is voluntary reporting and is not Secretariat ledger data |
| [UN INFO](https://uninfo.org/) | Public/semi-public | programme funding and expenditure reported by country teams | Cooperation Framework output, entity, country, SDG | Country Cooperation Framework scope, not global Secretariat accounts |
| [IATI](https://iatistandard.org/en/using-data/types-of-data/) | Public | publisher-defined activities and transactions | donor, implementing entity, activity, sector, location, result | Coverage and accounting policy vary by publisher |
| [Results dashboard](https://results.un.org/) | Public | planned resources/results | department, entity, subprogramme, country, result category | Structural enrichment only for this project; not the actual-expense control |

The current CEB download page also exposes a previously overlooked
[Thematic Funds CSV](https://unsceb.org/assets/data/FS/thematic%20funds.csv). It covers 2021–2024
and gives contributor, named fund, UN entity, function, and amount received. In 2023 it contains 29
funds across 10 entities and $968 million, but for `UN` itself it contains only the Voluntary Trust
Fund for Assistance in Mine Action. It is useful, not comprehensive.

## 3. Regular-budget expenditure

### 3.1 OPPFB and old `open.un.org` are the same RB series at section level

Local inputs:

- [`data/oppfb/Appropriation and Expenditure.xlsx`](../../data/oppfb/Appropriation%20and%20Expenditure.xlsx)
- [`data/un-secretariat-expenses.csv`](../../data/un-secretariat-expenses.csv)

| Year | Old open: Regular assessed | OPPFB expenditure | OPPFB minus open |
|---:|---:|---:|---:|
| 2021 | $3,017,846,005 | $3,017,480,020 | -$365,985 (-0.012%) |
| 2022 | $3,236,269,601 | $3,236,269,596 | -$5 |
| 2023 | $3,370,212,262 | $3,370,212,261 | -$1 |

Nairobi is section 29G in the 2021–2022 open extract and 29D in OPPFB; after normalizing that
renumbering, section totals reconcile. The small 2021 residual is distributed across entities and
is consistent with a later transaction snapshot, not a different measure.

### 3.2 Entity-level comparison catches a hidden 2023 redistribution

OPPFB entity prefixes and naming variants were normalized, then each year/section/entity was
compared.

| Year | Grand-total difference | Sum of absolute entity residuals | Main result |
|---:|---:|---:|---|
| 2021 | -$365,985 | $367,470 | Small later-vintage adjustments across several entities |
| 2022 | -$5 | $34,314 | Essentially identical |
| 2023 | -$1 | **$11,214,168** | Same total, different tribunal allocation within section 8 |

The 2023 section-8 residual is:

| Entity | OPPFB | Old open | Difference |
|---|---:|---:|---:|
| ECCC | $8,566,093 | $2,959,025 | +$5,607,068 |
| Special Tribunal for Lebanon | -$191,840 | $2,776,160 | -$2,968,000 |
| Residual Special Court for Sierra Leone | $0 | $2,639,068 | -$2,639,068 |

The three differences net to approximately zero. This is the clearest example of why a total-only
test is insufficient.

### 3.3 The audited statements contain an exact regular-budget control

Volume I is not only an accrual financial statement. Its Statement V, **Statement of comparison of
budget and actual amounts**, reports the regular budget on its governing modified-cash basis. For
2023 it reports $3,370.212 million of actual expenditure. That equals the old-open value of
$3,370.212262 million and the OPPFB value of $3,370.212261 million at the audited statement's
$1,000 precision.

This is the audited equivalent of the regular-budget actual, but it does not replace the PPB or
OPPFB detail. Statement V publishes expenditure by 14 broad budget parts, not by section, entity,
or subprogramme. The detailed series should therefore be described as budget-basis actuals from
PPB/OPPFB, controlled to the audited Statement V total.

The same statements also report $3,410.250 million of **IPSAS expense for the regular budget and
related funds** in the fund-group note. It is a different measure: accrual rather than modified
cash, and it includes related funds beyond the publicly available regular budget. The $40.038
million difference is consequently not an error or a clean cash-to-accrual adjustment. Note 5
separately identifies basis, entity, and presentation differences in reconciling Statement V to
the cash-flow statement. See [A/79/5 (Vol. I)](https://digitallibrary.un.org/record/4062977/files/A_79_5_%28Vol._I%29-EN.pdf).

### 3.4 The extracted PPB actuals are slightly incomplete, not fundamentally different

The extracted PPB regular-budget root is below the old open series by $7.3 million to $24.7 million
per year:

| Actual year | Extracted PPB minus old open RB |
|---:|---:|
| 2019 | -$7.322m |
| 2020 | -$9.887m |
| 2021 | -$24.670m |
| 2022 | -$13.315m |
| 2023 | -$8.375m |

In 2023 almost all of the gap is section 8. The selected PPB resource tables contain OLA, IIIM, and
the Myanmar mechanism but omit the separately presented $8.374 million of ECCC/STL/RSCSL
assistance. The extraction therefore needs a section-specific supplemental-table rule. For included
sections and entities, the PPB figures align with the OPPFB/open series to their printed $100
precision.

### 3.5 A complete hierarchy needs non-subprogramme leaves

The extracted PPB tree conserves its displayed totals, but its lowest published level is mixed:

| 2023 funding stream | Root | At numbered subprogramme leaves | Share |
|---|---:|---:|---:|
| Regular budget | $3.362bn | $1.259bn | 37.4% |
| Other assessed | $0.372bn | $0.192bn | 51.5% |
| Extrabudgetary | $9.058bn | $2.448bn | 27.0% |

The remaining leaves are components, programme-wide allocations, special-purpose items, entities,
and programme support. A portal should use a neutral `budget_unit` hierarchy and flag which leaves
are true numbered subprogrammes. Subprogramme labels also repeat across entities; the stable key
must include at least `(period, section, budget unit/entity, subprogramme code)`, never the label
alone.

The 2026 OPPFB workbook provides a clean functional-area-to-subprogramme crosswalk. Applied to the
2025 BIP actuals, it maps essentially all non-SPM RB expenditure, but SPMs remain a single
placeholder. This is strong evidence for the mechanism, not permission to apply a 2026 structure
uncritically to earlier years. Historical master-data snapshots are required.

## 4. CEB, `open.un.org`, and peacekeeping

### 4.1 A near grand-total match hides opposite block residuals

For 2023:

| Block | CEB expense | Old open expense | Difference |
|---|---:|---:|---:|
| `UN` including its published sub-entities vs non-mission programme block | $7.646bn | $8.778bn | -$1.132bn |
| `UN-DPO` vs published mission-account block | $7.227bn | $6.014bn | +$1.212bn |
| Combined | $14.873bn | $14.792bn | +$80.817m (+0.55%) |

The combined total looks close only because large, opposite scope differences cancel. It is not a
valid reconciliation.

The current CEB standard lists Secretariat departments and says they should be submitted, but the
published 2023 expense cubes contain only `UN`, `UN-DPO`, and the small `UN-Tech Bank`, `UN-UNDRR`,
`UN-UNIDIR`, and `UN-UNRISD` sub-entities. There is no DESA/OCHA/DPPA/etc. dimension in the
published files.

### 4.2 `UN-DPO` is the audited Volume II total, not the old open mission total

CEB `UN-DPO` expense for 2023 is $7,226,664,864. The audited Volume II statement for the year ended
30 June 2023 reports $7,226,664,000, equal at statement rounding. Volume II comprises active
missions, support activities, and closed missions. The old open mission block instead comes from
budget-performance reports; its programme block also includes $446 million of “Other Assessed”
support-account expenditure.

At the shared active-mission level, the difference is systematic:

| Measure, 2022/23 | Amount |
|---|---:|
| Volume II IPSAS expense, 11 active missions | $6.873bn |
| Old open budgetary expenditure, same 11 missions | $5.908bn |
| Difference | -$0.965bn (-14.0%) |

All 11 old-open mission values are lower, but not by the same percentage: ratios range from 75.7%
for UNSOS to 92.0% for UNIFIL. This is an accounting/scope difference, not merely one missing
mission. The audited mission and support-activity table is in
[A/78/5 (Vol. II)](https://digitallibrary.un.org/record/4045410/files/A_78_5_%28Vol._II%29-EN.pdf).

### 4.3 CEB is standardized entity reporting controlled to audited statements

CEB does not simply copy tables out of audit PDFs. Organizations submit standardized data cubes.
The Financial Statistics page says the data is validated against audited financial statements
wherever possible, and the March 2024 standard defines expense as accrual expense from the
statement of financial performance. A budgetary-basis exception is permitted only if the submitted
total reconciles to the financial statements, covers the organization's full operations, is needed
for donor reporting, and is applied consistently.

The classifications beyond the financial statements—contributor, geography, SDG, function, and
financing instrument—therefore depend on organization-supplied accounting and management mappings.
CEB is best understood as an audited-total-controlled standardization layer, not as another
independently audited ledger. The exact `UN-DPO` match to Volume II is strong evidence of this
design. For the Secretariat's `UN` block, the close total-revenue match but material revenue-class
residuals in section 5.4 show that the control does not guarantee identical published
classifications.

## 5. Extrabudgetary and voluntary expenditure

### 5.1 The old portal's mix is traceable but not one accounting measure

The old portal presents regular assessed, other assessed, and voluntary expense in one visual
hierarchy, but the components answer different questions:

| Portal component | Underlying measure | Best interpretation |
|---|---|---|
| Regular assessed | PPB budget-basis actual, now shown to tie to audited Statement V | Resources consumed against the General Assembly regular budget |
| Other assessed | Budget-performance actual for support and related assessed accounts | Resources consumed against those assessed budgets |
| Voluntary | IPSAS accrual expense from Volume I and separate audited statements/schedules | Ex-post financial performance of trust-funded/reporting perimeters |

The combination is not fabricated: each component can be controlled to an authoritative source.
But their shared display grain does not make them homogeneous. Regular-budget entity labels follow
the programme-budget structure; voluntary rows follow audited entity/fund perimeters and a
fund-to-entity/priority crosswalk. Summing the components produces a useful orientation total, not
a clean accounting total. The voluntary component generally has stronger audit assurance at its
own perimeter, while the regular component is more directly relevant to budget execution and has
better programme-budget detail.

### 5.2 PPB extrabudgetary expenditure is not audited voluntary expense

The 2023 PPB extraction totals $9.058 billion of extrabudgetary expenditure, versus $4.961 billion
of voluntary expense in the old open non-mission block. The total comparison is invalid because the
PPB includes large sections for UNHCR ($4.942 billion), UNRWA ($0.802 billion), and UN-Women
($0.554 billion), which the old Secretariat extract excludes in favour of their separate UN-system
reporting.

Removing UNHCR and UNRWA still leaves PPB at $3.314 billion, $1.647 billion below old open. At
shared sections the distributions also diverge:

| 2023 section | PPB XB expenditure | Old open voluntary expense | PPB minus open |
|---|---:|---:|---:|
| 27 Humanitarian assistance | $393.558m | $2,316.261m | -$1,922.704m |
| 1 Overall policymaking | $61.561m | $288.158m | -$226.596m |
| 3 Political affairs | $86.038m | $281.477m | -$195.439m |
| 14 Environment | $587.761m | $671.941m | -$84.180m |
| 16 Drugs and crime | $405.442m | $416.856m | -$11.413m |
| 15 Human settlements | $170.115m | $145.827m | +$24.288m |
| 29B Operational support | $66.577m | $14.350m | +$52.227m |
| 29C ICT | $71.511m | $0 | +$71.511m |

For UNEP, the old open value is exactly the audited entity's total IPSAS expense less its audited
regular-budget segment, while the PPB is modified-cash budgetary expenditure for the perimeter
governed by section 14. The published documents do not provide a bridge between those perimeters.
The PPB subprogramme series should therefore be published as its own measure; it must not be made to
sum to audited voluntary expense unless an explicitly labelled allocation method is applied.

### 5.3 The trust-fund schedule and old open extract do fit together at fund level

In the old extract:

- 798 of 815 voluntary rows have a named trust fund in `NOTE`.
- Across 2019–2023 there are 175 distinct named funds; each maps to exactly one entity and one
  priority area in the extract.
- In 2023, 169 rows / 148 named funds account for $3.726 billion. The three unlabelled rows are the
  separately audited UNEP, UN-Habitat, and UNODC totals ($1.235 billion).

A direct check works: the 2023 Schedule reports $48,314,136 of expense for the Trust Fund for
Counter-Terrorism; its two old-open rows sum to $48,314,137, a one-dollar rounding difference.
This supports the hypothesis that the old site joined individual trust-fund statements to an
entity/priority mapping.

The schedule is an accounting supplement, not simply a donor table. Each fund can contain:

- a statement of financial position, including contribution receivables;
- a statement of financial performance, including voluntary revenue, transfers, and expenses;
- a donor schedule with monetary, in-kind, refund, transfer, and adjustment columns;
- inter-organization and internal transfers; and
- a narrative purpose plus a short fund code.

It also includes governments, intergovernmental organizations, UN entities, and other donors. Fund
statements are gross building blocks: summing them without handling internal transfers, principal/
agent treatment, and financial-statement eliminations can double count.

### 5.4 CEB and audited revenue are close in total but differ by class

For 2023, CEB's `UN` agency total (including its reported sub-entities) is $7.546 billion of revenue,
versus $7.587 billion in Volume I, a $41.2 million gap. Inside that near match:

| 2023 revenue class | CEB | Volume I | Difference |
|---|---:|---:|---:|
| Assessed | $3.278226bn | $3.278226bn | approximately zero |
| Voluntary core + non-core | $3.211495bn | $3.111963bn | +$99.532m |
| CEB other activities vs remaining statement revenue classes | $1.056530bn | $1.197257bn | -$140.727m |

The CEB government-donor cube contains $3.218 billion of named assessed contributions for `UN`,
close to the gross assessments issued in Volume I, while total assessed revenue is $3.278 billion
after credits and other adjustments. Contributor rows therefore need their own control bridge; they
should not be forced to equal recognized revenue without those adjustments.

The CEB documentation has one unresolved inconsistency to record rather than silently choose between:
the Financial Statistics page says entity figures are published without adjustment for transfers
between UN organizations, while the March 2024 Data Cube standard instructs CEB to eliminate
inter-UN revenue in consolidated system reporting and to address pooled-fund pass-through. This may
reflect different products or vintages. An implementation note from CEB is needed.

## 6. Contributions: what can and cannot be mapped

### 6.1 Assessed contributions

Regular-budget assessment notices provide the Member State, scale, gross contribution, staff
assessment credit, and net contribution. The assessment funds the regular budget as a pool; it is
not earmarked to a department or subprogramme. A donor-to-RB-subprogramme amount can only be a
derived proportional attribution, for example:

```text
country's net RB assessment / total net RB assessments
  × subprogramme RB expenditure
```

That can be a useful explanatory view, but it must be labelled `allocated`, not `observed`.

Peacekeeping is different. Mission-specific assessment notices provide a direct Member
State-to-mission assessment. This is the best public assessed contributor-to-entity link. SOC or the
Umoja contributions portal is still needed for partial payments and outstanding balances.

Honour rolls are more informative than their title suggests: they publish each fully paid State's
net assessment and payment date. They do not publish partial payments, and each page should be
treated as a snapshot at its stated cutoff rather than presumed to update indefinitely.

### 6.2 Voluntary contributions

There are three progressively finer public paths:

1. CEB: contributor to `UN`, `UN-DPO`, or a separately reported agency/sub-entity, with revenue
   type. This is broad but not department-level for the Secretariat.
2. Individual trust-fund schedules: contributor to named trust fund, including recognized revenue
   and receivable details. Joining the fund name/code to the old open mapping gives contributor to
   entity and priority area.
3. Thematic or pooled-fund portals: contributor to a named fund/project/participating organization
   for their covered portfolios.

None of these proves that a particular donor financed a particular current-year expense. Funds can
carry balances across years, pool multiple donors, receive internal transfers, and finance several
activities. Donor-to-subprogramme should be considered observed only when a grant or funding
agreement is uniquely linked to a sponsored programme/functional area. Otherwise it is an
allocation.

## 7. Locations and thematic classifications

### 7.1 CEB geography is strong at its own grain

The CEB geography cube reconciles to the expense cube for `UN` and `UN-DPO` to rounding. The Data
Cube standard defines geography primarily as beneficiary location, with place of expenditure as a
fallback. This is not the same as office headquarters or mission mandate location.

For 2023, `UN-DPO` has 13 location rows: nine named countries/territories, Western Asia, Africa, and two global/
enabling buckets. The non-global rows can be plausibly associated with the 11 active missions, but
$825 million remains in global/enabling categories. The location values are generally about 93% of
each corresponding mission's IPSAS expense because central/support cost is separated. A complete
mission-by-location matrix is therefore not directly observed in the public cube.

For SPMs, assigning an entity total to its mandate country is feasible as a derived map and useful
for navigation, but it must not be confused with CEB beneficiary-location expenditure. Regional and
multi-country missions need one-to-many mappings or a regional label.

### 7.2 SDG completeness changes by entity and year

| Entity-year | CEB expense | SDG-coded expense | Coverage |
|---|---:|---:|---:|
| `UN`, 2022 | $7.277bn | $4.046bn | 55.6% |
| `UN`, 2023 | $7.646bn | $4.373bn | 57.2% |
| `UN`, 2024 | $7.601bn | $7.601bn | 100.0% |
| `UN-DPO`, 2022 | $7.091bn | $7.091bn | 100.0% |
| `UN-DPO`, 2023 | $7.227bn | $0 | 0.0% |
| `UN-DPO`, 2024 | $7.341bn | $7.341bn | 100.0% |

The SDG cube needs explicit coverage flags by entity-year. It cannot safely be treated as a complete
distribution merely because the file is present.

### 7.3 Old priority areas are mostly an entity classification

In each year 2019–2023, only four entities have more than one priority area: DGC, EOSG, `OTHER`, and
staff assessment (`STA`). In 2023, 144 of 148 entities have exactly one priority. Every named trust
fund also maps to one priority in the extract. Priority area can therefore usually be inherited from
the entity/fund mapping, with explicit row-level treatment for the four exceptions. It is similar in
purpose to an SDG classification but is not a crosswalk to SDGs.

## 8. What Umoja could add

The local [`data/umoja`](../../data/umoja) inventory indicates four distinct uses.

### 8.1 Budgetary expenditure and subprogramme keys

- `ZZFM_M01_Q0007_R0004`: status of expenditure by RB budget line.
- `ZZFM_M01_Q004_R0009`: status by peacekeeping mission budget line.
- `ZZFM_M01_Q0007_R0003`: SPM/PK budget-line report.
- `ZZFM_M01_R0005`: multi-fund budget, consumption, and availability by fund, funds centre, and
  commitment item.
- `FMRP_RFFMEP1AX`: all FM postings, including commitments and actuals.
- `FM_SETS_FICTR3`: `FC_GRP_UN`, the funds-centre hierarchy grouped into UN entities/offices.
- `FM4M`: functional-area directory.

This should reproduce OPPFB RB and potentially produce XB by functional area. It is not yet verified
that XB postings consistently carry a functional area that can be mapped to historical PPB
subprogrammes.

### 8.2 Voluntary revenue and donor linkage

- Grants Management final/interim donor reports operate at fund, grant/group of grants, and
  sponsored-programme level on a modified-cash basis.
- The Statement of Accounts reports income, expenditure, transfers/refunds, and fund balance for
  each grant.
- The Pledge Report gives contribution receivables and payments by sponsor, fund, and grant.
- `S_PLN_16000269` gives grant line items; sponsor, sponsored-programme, and grant master-data
  reports provide the necessary lookup tables.

This is the strongest candidate bridge from donor to grant to expenditure. It will still be
many-to-many for pooled or multi-donor funds.

### 8.3 Assessed receivables and cash

`ZARFBL5N` exposes customer subledger items by business area, fund, grant, and segment, with variants
for due date, posting date, deferred income, and dunning for assessed contributions. It should fill
the partial-payment gap left by honour rolls if access is granted.

### 8.4 Audited control

`ZGLTRIALBAL` provides an IPSAS trial balance by business area, fund, grant, and segment. Project
reports add actual postings by cost element and WBS, with WBS-to-grant master data. Running the
budgetary and GL views together is the most promising way to construct the currently missing bridge
between PPB extrabudgetary expenditure and audited expense.

### 8.5 Minimum Umoja proof-of-concept extract

Request one closed year (2023) and three deliberately different entities: OCHA, UNEP, and one small
office. Include both RB and XB. The transaction extract should retain:

- posting and document dates, fiscal period, ledger, currency, and USD amount;
- value type/document type sufficient to separate actuals, commitments, budgets, and payments;
- business area, fund, grant, sponsor, sponsored programme;
- funds centre and the full `FC_GRP_UN` hierarchy;
- functional area and its historical description/hierarchy;
- WBS/project and commitment item/GL account; and
- reversal, elimination, and cost-recovery indicators.

Also request dated master-data snapshots. First reconcile the extract to (a) OPPFB RB, (b) PPB XB,
(c) the individual trust-fund schedule, and (d) Volume I. Only then assess whether the keys support a
stable donor-to-subprogramme bridge.

## 9. Recommended integrated data model

### 9.1 Keep measures separate

Use a long fact table with, at minimum:

```text
amount
measure_stage          assessment | pledge | recognized_revenue | receipt |
                       budgetary_expenditure | ipsas_expense
accounting_basis       cash | modified_cash | accrual
funding_source         regular_assessed | other_assessed | voluntary | other
period_start / period_end / vintage
source_id / source_row / reconciliation_group
```

Never fuse PPB XB and audited voluntary into one column. A UI can juxtapose them or offer an
explicitly described allocation, but they remain separate measures.

### 9.2 Preserve every hierarchy and crosswalk

Use versioned dimensions for CEB entity, audited reporting entity, section, entity/mission, fund,
grant, funds centre, functional area, budget unit, subprogramme, WBS/project, location, priority,
and SDG. Crosswalk rows should carry:

- validity dates;
- relation type (`observed`, `official_crosswalk`, `name_match`, `inferred`, `allocated`);
- confidence and source; and
- one-to-one / one-to-many cardinality.

### 9.3 A realistic product hierarchy

The expenditure view should present:

```text
funding source
  -> budget part / section
    -> entity, office, mission, or explicit section-wide bucket
      -> programme component
        -> numbered subprogramme or explicit non-subprogramme leaf
```

For each node, display whether the amount is budgetary expenditure or IPSAS expense and whether the
breakdown reconciles to its displayed parent.

### 9.4 Contribution relationships

| Relationship | Recommended status |
|---|---|
| Member State -> RB total assessment | Observed |
| Member State -> RB entity/subprogramme | Allocated only |
| Member State -> PK mission assessment | Observed |
| Donor -> CEB reporting entity | Observed, subject to contributor-cube control gap |
| Donor -> trust fund | Observed revenue/receivable relationship |
| Trust fund -> old-open entity/priority | Observed in old extract / crosswalked by fund name |
| Trust fund or grant -> subprogramme | Unknown until Umoja test; may be observed or many-to-many |
| Donor -> subprogramme expenditure amount | Allocated unless a uniquely earmarked grant path exists |

### 9.5 No source is universally "most important"

| Question | Primary source | Control / complement |
|---|---|---|
| What did the Assembly authorize and how was it used by programme? | PPB and budget-performance reports | OPPFB/Umoja detail; audited Statement V total |
| What is currently available, committed, or spent? | Umoja budget-control reports | OPPFB extracts; PPB is a later published snapshot |
| What were the final consolidated revenue, expense, assets, and liabilities? | Audited IPSAS statements | CEB standardized submission |
| How does the Secretariat compare across the UN system, locations, functions, SDGs, and contributors? | CEB | Audited totals and coverage tests |
| Which donor financed which fund or grant? | Trust-fund schedules and Umoja Grants Management | CEB contributor data |
| What was spent by subprogramme, including XB? | PPB | Umoja crosswalk/control still required for XB |

Audited statements are not merely a compliance afterthought: management certifies them and the
Board of Auditors expresses an opinion on them. They are the highest-assurance source for ex-post
financial position and performance. They are deliberately too aggregated and too late for live
budget management or a full subprogramme view. PPB documents are institutionally central for
delegates and programme accountability, but a published PPB actual should not be interpreted as
cash on hand; staff use Umoja's allotment, commitment, cash, grant, and receivable views for that
operational question.

## 10. Recommended work sequence

1. **Finish the RB spine.** Add the PPB section-8 supplemental rows, create a versioned entity-code
   crosswalk, and store section/entity residual tests for every year.
2. **Treat PPB XB as a separate, valuable series.** Publish its subprogramme hierarchy with an
   accounting-basis warning and explicit non-subprogramme leaves. Do not scale it silently to old
   open totals.
3. **Build the trust-fund bridge.** Parse fund code/name, donor schedule, revenue, receivable,
   transfer, and expense fields; join to the old open fund-to-entity/priority map; measure unmatched
   and multi-match rates.
4. **Obtain the Umoja proof-of-concept.** Test OCHA, UNEP, and one small entity across FM, GM, GL,
   AR, and project dimensions before seeking a full extract.
5. **Add assessed contribution data.** Ingest notices for legal assessments; use SOC/Umoja for
   receipts and arrears. Keep RB proportional attribution separate from observed PK mission links.
6. **Attach location and topic dimensions with coverage flags.** Preserve CEB beneficiary geography,
   derived mission locations, old priorities, and CEB SDGs as distinct concepts.
7. **Automate reconciliation gates.** Require total and distributional tests at every shared grain;
   include half-L1 reallocation, unmatched mass, maximum entity residual, and source-vintage notes.

## Appendix A. Local evidence and reproducibility notes

The calculations in this report used the repository's current local files without modifying them:

- `data/un-secretariat-expenses.csv`
- `data/ceb/clean/*.csv`
- `data/oppfb/*.xlsx`
- `data/umoja/*.html`
- `public/data/budget-ppb-*.json`
- `public/data/budget-audited-ppb-*.json`
- `public/data/budget-pko-*.json`
- `public/data/budget-audited-pko-*.json`

Reconciliation procedure:

1. filter old open to the same year and source type;
2. filter OPPFB to `Amount Type = Expenditure` and fund `10UNA` where available;
3. normalize the 29G/29D Nairobi renumbering and entity-code aliases;
4. compare total, section, and canonical entity amounts;
5. report both signed difference and the sum of absolute residuals;
6. compare PPB roots and section nodes separately from leaf coverage; and
7. never infer equivalence from a total when finer distributions are available.

## Appendix B. Remaining questions

- Does CEB apply inter-UN eliminations in the downloadable entity cubes, the consolidated figures
  only, or neither? The current page and standard are not worded consistently.
- Can CEB explain why the current standard requests Secretariat departments while the public cubes
  do not publish them?
- Which exact PPB tables define the extrabudgetary perimeter for each section, and is an internal
  fund-to-PPB bridge maintained?
- Can OPPFB provide historical functional-area and funds-centre extracts for 2019–2024, not only
  2025?
- Do Umoja XB actual postings retain stable historical functional areas and can those be joined to
  PPB subprogrammes without allocation?
- Can SOC/Umoja exports provide country-by-mission partial payments and historical restatements in
  bulk?
- What procedure produced the old open fund-to-entity/priority mapping, and is the crosswalk itself
  recoverable?
