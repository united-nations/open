# Separately reported Secretariat trust funds and extrabudgetary resources

This integration supplements the UN Secretariat trust-fund schedules with
separately reported UNEP, UNODC, UN-Habitat and ITC resources. It preserves the
Volume I fund identities, amounts and deep links. Broad XB coverage is
intentional; inclusion does not establish that every account is legally a trust
fund.

## Current spending view

One treemap contains two source groups, selected independently with the shared
legend controls:

- **UN Secretariat trust-fund schedules**: individual fund expenses accompanying
  the United Nations Volume I accounts.
- **Separately reported entities**: direct report extracts for the four entities
  in 2023–2024. Missing earlier years remain unavailable, not zero.

One headline reflects the selected sources and search. It is labelled
**Reported expenditure (unconsolidated)** because the reporting boundaries differ.

| Source | Published expenditure measure |
|---|---|
| Volume I | Sum of current-period IPSAS expenses for individual funds, without cross-fund eliminations |
| UNEP | Audited entity expenses less regular-budget expenses; includes intersegment eliminations |
| UN-Habitat | Audited entity expenses less regular-budget expenses; includes intersegment eliminations |
| UNODC | Audited reporting-entity expenses less regular-budget expenses; no separate fund-elimination column was verified |
| ITC | Reported gross XB programme delivery from the financial report, outside the audited statement expense measure |

The 2024 source totals are $3,198,967,527 for the schedules and $1,545,627,000
for the four separate entities. Their arithmetic sum is $4,744,594,527, not a
verified consolidated Secretariat expenditure total. No duplicate account was
identified in the present crosswalk, but cross-source transfers have not been
reconciled or eliminated. A grant can be expenditure for a funding account and
finance expenditure reported by a recipient. Do not add these figures to PPB or
other consolidated Secretariat totals.

Entity labels appear at the top left. UNEP's six fund groups and Habitat's five
funding segments appear as child tiles. Their source expenses precede
eliminations, so relative gross shares subdivide each entity's net area; tile
amounts retain the printed gross figures. Tooltips explain this basis and omit
source links. UNODC and ITC have no qualified XB fund-expense split and therefore
show entity labels only. Category clicks open the entity sidebar, not separate
segment sidebars.

For 2024 UNEP's six printed segment controls total $921.522m against $808.064m
entity XB expenditure. Habitat's segments total $188.704m against $172.645m.
Eliminations are retained at their reported level rather than assigned to funds.
UNEP Note 4 explicitly defines its segments as groupings of trust funds
([PDF p.84](https://digitallibrary.un.org/record/4090384/files/A_80_5_Add.7-EN.pdf#page=84));
Habitat describes funding segments
([PDF p.80](https://digitallibrary.un.org/record/4090387/files/A_80_5_Add.9-EN.pdf#page=80)).

## Sidebar contract

Each sidebar describes exactly one year. Its header selector starts with the
page year and then changes the sidebar independently, using the same pattern
as System sidebars. Unavailable years show a notice instead of prior-year
figures. Peacekeeping selectors show fiscal cycles such as 2024/25; calendar-year
sources retain calendar labels. The four new entity sidebars follow this order,
omitting unavailable sections:

1. Expenditure and trend.
2. Inline expandable fund groups/accounts or funding segments, using the shared
   FinancialBreakdownRow primitive also used by the programme-budget sidebar.
3. Contributors, where supported for that entity/year.
4. Collapsed accounting details.
5. One collapsed source-reference section combining expenditure and contributor
   provenance.
6. Visible additional resources, such as UNEP annual reports and CBD read-up links.

Source references identify the original document, physical PDF page, table and
row/column. HTML dashboard or ledger references do not receive invented PDF
pages. Rounding controls remain in the data, not as user-facing error notices.

UNEP financial-position/net-asset blocks are hidden at all sidebar detail
levels. Habitat retains qualified positions for its five reported funding
segments in 2023–2024, before intersegment eliminations. UNODC pillar balances
include regular-budget resources; ITC operating reserves alone are not a full
fund financial position. Neither is replaced with whole-entity balances.
Existing Volume I fund identities and source amounts remain unchanged.

Financial-position sections group asset, liability and net-asset balances in
compact rows. Inline chevrons next to the total labels expand their components;
source references remain available on each amount.
The non-positive expenditure list is collapsed by default. Entity headings are
shown for meaningful schedule groups while tiny groups remain tooltip-only.

## Contributor views

The shared segmented control appears above search and the year slider. Its
order is schedules, UNODC, UN-Habitat, ITC, UNEP. The selected year persists across
source changes. Habitat, ITC and UNODC each show the overall entity series without
additional funding-scope selectors. Missing years remain unavailable.

| Source | Measure and coverage |
|---|---|
| Volume I | Recognized contributions and inter-agency/internal transfers, net reported refunds/adjustments; gross fund flows |
| UNODC | Indicative calendar-year pledges, not receipts, recognized revenue or expenditure; 2023–2024 |
| UN-Habitat | Interim contributions and transfers before separately reported refunds; Foundation/technical-cooperation coverage in 2023–2024 and core-only historical observations |
| ITC | Source-defined XB funding received for Trust Fund Windows I/II; 2022–2023, with 2024 unavailable |
| UNEP | Availability note and annual-report link only; no published contributor series |

These measures must not be summed into one comparable contributor total.
UNODC combines GP (unearmarked) and SP (earmarked) pledge rows into one donor
series. The 2024 rows total $519,320,861 and match the independent documentary
control. Its 2023 rows total $453,853,084.35, $16,382.65 below a later report
vintage. Neither this difference nor differing donor-label counts creates an
invented contributor.

ITC's revolving-funds category is not a named donor. Its $208,000 in 2023 is
retained in source notes and the source reconciliation, rather than drawn as a
donor. Exact-zero rows are hidden in the UI; negative corrections remain in
signed totals and can be inspected separately. All observations remain in the
extraction. UNEP annual-report top-15 and CBD collection extracts remain
research-only; the website does not publish these partial donor subsets.

Audited UNEP aggregate contribution information does exist. For 2024, excluding
regular budget, assessed contributions of $231.882m plus voluntary contributions
of $387.606m give $619.488m; adding $336.169m of transfers gives $955.657m after
intersegment eliminations. These are recognized amounts, including multiyear
agreements, rather than current-year cash receipts
([PDF pp.102–103](https://digitallibrary.un.org/record/4090384/files/A_80_5_Add.7-EN.pdf#page=102)).
A future aggregate-only view could use this measure, but it would not make the
current other donor series comparable. A harmonized audited-flow dataset would
need reviewed scope, transfer treatment and separately stated donor coverage.

## Reproduction and evidence

```bash
uv run python python/22-extract_secretariat_xb.py
uv run python python/23-extract_secretariat_xb_contributors.py
uv run python python/16-export_trust_fund_json.py
```

The commands use retained official PDFs and public report responses. Source
manifests record URLs, document symbols, years, physical page inventories and
SHA-256 hashes. The main extractor writes literal tables, normalized facts,
source controls and a validation profile. The frontend adapter selects direct
report facts; ARWO comparison controls never supply fallback amounts.

The contributor bundle contains 22 source-specific series, including retained
Habitat/ITC component scopes for provenance and fund-specific uses, but the
entity charts publish only their aggregate scope. The exporter never adds
component rows and their printed total as independent money.

- [Main extraction pack and limitations](../data/trust-fund-source-candidates/README.md)
- [UNODC pledge sources and reconciliation](../data/trust-fund-source-candidates/unodc-contributors/README.md)
- [Archived UNEP contributor research](../data/trust-fund-source-candidates/unep-contributors/README.md)
- [Fund-only financial-position evidence](../data/trust-fund-source-candidates/fund-position-research/README.md)
- [Historical report inventory and extraction pilot](../data/trust-fund-source-candidates/historical-research/README.md)
- [Secretariat reporting boundaries and ARWO comparison](research/data-sources-overview/secretariat-separate-xb-funds.md)
- [Volume I extraction and attribution](trust-fund-schedules.md)

Historical research retrieved the 16 official 2019–2022 entity reports and a
validated UNEP 2022 pilot. This is source-ready research, not published historical
coverage. Earlier layouts require their own semantic group mapping and reviewed
controls before integration. All four current amounts and source-specific
contributors remain independent of ARWO substitutions.

Validation lives in the standard Python suite and the focused browser scripts:

```bash
uv run python -m unittest discover -s python/tests
uv run python python/test_budget_source_citations.py
node tests/browser/trust-fund-sources.mjs
node tests/browser/trust-fund-contributor-sources.mjs
node tests/browser/secretariat-sidebar-years.mjs
```
