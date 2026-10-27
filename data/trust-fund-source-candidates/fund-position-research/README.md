# Explicit fund/group financial positions

Checked 27 October 2026. This extraction is deliberately restricted to funding
**groups with their own reported position columns**. It does not substitute an
entity balance sheet, an RB-inclusive pillar or a reserve component for the
financial position of a trust fund/XB group. It uses no ARWO data.

## Ready API

```python
from secretariat_xb_fund_positions import fund_positions
positions = fund_positions('UN-HABITAT', 2024, stage2)
# positions['UN-HABITAT:segment:TECH'] is the financialPosition object.
```

`stage2` is the existing `data/trust-fund-source-candidates/stage2` path. The API
reads the isolated validated files in this directory. It returns **five own-year
Habitat group objects** for2023/2024, keyed by the same source IDs used in the
expense export:

- `UN-HABITAT:segment:FNDN` — Foundation non-earmarked
- `UN-HABITAT:segment:FNDE` — Foundation earmarked
- `UN-HABITAT:segment:TECH` — technical cooperation
- `UN-HABITAT:segment:PSC` — programme support
- `UN-HABITAT:segment:BEN` — end-of-service/post-retirement benefits

Each object has the existing `financialPosition` shape: `asOf`, `fundCount`,
`scopeNote`, and `metrics` with amounts, optional current/non-current components
and page-specific `supportingSources`. `fundCount=1` refers to one reported
funding group, not a claim that it contains only one legal trust fund. The scope
note explicitly identifies a funding segment rather than a complete individual-
fund account inventory.

Metrics include cash, investments, voluntary contributions receivable, other
receivables, advance transfers, advance receipts/deferred revenue, conditional
liabilities, total assets, total liabilities and net assets. Repeated current and
non-current investment/receivable rows are combined, with their distinct section
references retained. These stocks overlap and must not be added together.
Printed dashes are retained as observed zero amounts; missing/unsupported
positions do not receive invented zeros.

The API returns **`{}` for UNODC, ITC, UNEP and unsupported Habitat years**.
UNEP already has source-specific account/group closing net assets in the main
adapter; that existing data is not replaced or duplicated by this module.

## Sources and checks

- Habitat2023 [A/79/5/Add.9, physical PDF pp100–101](https://digitallibrary.un.org/record/4061097/files/A_79_5_Add.9-EN.pdf#page=100).
- Habitat2024 [A/80/5/Add.9, physical PDF pp81–82](https://digitallibrary.un.org/record/4090387/files/A_80_5_Add.9-EN.pdf#page=81).
- The2024 Note5 segment definition is on physical p80. The position table itself
  has five named funding columns, elimination and total columns; **no regular-
  budget column is used or inferred**. Each returned balance comes from its
  explicit funding-group column.

`habitat-position-facts.csv` retains **424 observations**, including source
comparative/total/elimination columns for independent controls. Only five named
current-period funding columns are returned by the API. Validation totals are
never published as fund positions. `habitat-position-tables.jsonl` retains four
literal tables and extraction specifications.

`quality-profile.json` contains **93 passing checks**: for every funding group,
assets less liabilities equal net assets; current plus non-current assets and
liabilities match totals; surplus plus reserves matches net assets; and each
source row's five funding columns plus the signed elimination match the printed
current-year entity total. All original PDF hashes are checked before parsing.

Independent2024 examples, USD:

| Group | Cash | Investments | Assets | Liabilities | Net assets |
|---|---:|---:|---:|---:|---:|
| Foundation non-earmarked |966,000|7,923,000|10,312,000|1,163,000|9,149,000|
| Technical cooperation |20,635,000|169,006,000|438,764,000|79,675,000|359,089,000|
| Employee benefits |2,583,000|21,195,000|23,778,000|36,257,000|**−12,479,000**|

The negative benefits balance is preserved. Intersegment stock eliminations
(−2.104m in2024; −4.847m in2023 for both assets/liabilities) remain validation
facts, not fund accounts or an expense adjustment. Own2023 group positions use
the2023 report, not the2024 report's whole-entity comparative column.

## UNODC: no pure-XB/fund-position substitute

The2023 pillar-position tables are physical pp78–79;2024 pp64–65. The segment
policy (2023 physical p77) describes drug/crime mandates, including UNICRI, and
allocates non-earmarked activity between pillars. The corresponding performance
tables explicitly include regular-budget allocations. No own-position columns
for the general-purpose/special-purpose funds were verified.

Note17's restricted/unrestricted net-asset columns (2023 p98;2024 p81) are also
not explicit GP/SP fund-position tables. A restricted balance consisting of
earmarked donor contributions does not establish a full fund cash/asset/liability
position or justify assigning the whole column to an invented fund grouping.
Consequently the API returns unavailable (`{}`), with no proportional allocation,
RB subtraction from stocks or whole-entity proxy.

## ITC: operating reserves only, research-only

-2023 [A/79/5(Vol.III), Note14, physical p82](https://digitallibrary.un.org/record/4060838/files/A_79_5_%28Vol._III%29-EN.pdf#page=82).
-2024 [A/80/5(Vol.III), Note14, physical p71](https://digitallibrary.un.org/record/4090394/files/A_80_5_%28Vol._III%29-EN.pdf#page=71).

These notes explicitly report two fund operating-reserve components:

| Fund |2023 closing operating reserve|2024 closing operating reserve|
|---|---:|---:|
|ITC Trust Fund|18,480,000|23,748,000|
|Programme Support Fund|1,791,000|2,020,000|

These are **reserve components only**, not full net assets, cash or spendable
balances. The2024 table also has a **−199,000 fair-value reserve** that is not
assigned to either fund. The source's whole-reserve total25,569,000 is retained
only as a control. No allocation of that fair-value reserve is manufactured.

`itc-operating-reserve-facts.csv` retains14 current/comparative reserve
observations; `itc-reserve-quality.json` validates four closing rows exactly and
marks `publish_as_financial_position=false`. The API returns no ITC position.
Do not create zero-expenditure fund tiles merely to attach these reserves.

## Reproduction and tests

From the repository root, using retained PDFs only:

```bash
uv run python python/secretariat_xb_fund_positions.py
uv run python data/trust-fund-source-candidates/fund-position-research/verify_fund_positions.py
```

The second command runs **eight independent API/scope regressions**, checking
known amounts, signed balances, own-report selection, combined-component
citations, empty unsupported scopes and the separation of reserve-only facts.
The module and this directory are the only files owned by this subtask. It does
not alter the main manifest/pipeline, public JSON or frontend automatically.
