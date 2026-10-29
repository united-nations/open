# Data Availability

## CEB Financial Statistics

https://unsceb.org/financial-statistics

Organization revenue and expenses: 2011–2025; contributor exports: 2011–2025
(government detail starts in 2013).
Geography: 2010–2025 (early geographic coverage differs from organization totals).
SDG actual expense records: 2018–2025; source budget observations are excluded.
All available historical observations now use the current CEB release, captured
29 October 2026. ITC did not report for 2025. Source hashes, missing amount cells
and coverage are recorded in `public/data/ceb-source.json`. The shared processing
contract is [CEB methodology](ceb-methodology.md), rendered from
[`data/ceb-methodology.json`](../data/ceb-methodology.json).

### Coverage policy

- Organization revenue, financing timelines and revenue/expense trends retain
  2011–2025. Government donor coverage no longer truncates organization totals.
- Contributor exports and all contributor views cover 2011–2025. The incomplete
  2009–2010 non-government records remain in source/fused data for audit and are
  excluded from annual exports, trends, coverage metadata and selectors.
  Revenue controls cover 2011 onward, with the balance after known donors
  retained as Unattributed. Government donor detail starts in 2013. The shared
  `revenue-coverage.json` register discloses these differences. Unobserved early
  donor years are marked unavailable rather than asserted to be zero.
- System Flows retains the union of imported spending years, 2010–2025,
  but its year selector starts in 2011.
  Organization expense controls are unavailable in 2010, and SDGs are unavailable
  before 2018. The view loads only available files, labels missing
  dimensions, and never infers SDG allocations from other totals.
- Functions retain 2011–2025. Before 2018 the source's legacy Other category
  (combined normative and technical cooperation) remains separate. A visible
  classification warning qualifies comparisons across 2018.
- Function/geography retains 2010–2025. Earlier missing function attribution is
  shown under Function not reported, retaining its geographic amounts. Complete
  attribution begins in 2020; unknown current classifications still fail checks.
- PPB includes the 2020 edition as a partial view: expenditure 2018, approved
  regular budget 2019 and proposed regular budget 2020. Its expenditure covers
  regular budget only, with sparse lower hierarchy and explicit omissions.
  Other assessed and extrabudgetary amounts remain unavailable. It is not
  comparable to the combined funding-stream totals of later editions.
- Organization expenses, geography, SDGs, imported Secretariat expenses and
  trust-fund exports otherwise retain their available imported source years.

UNINFO remains a separate 2024 snapshot. Refreshing CEB does not re-query the
UNINFO API or expand its coverage.

- **Revenue by Entity**
  - Total Revenue
    - Year
    - Entity
    - Revenue Type
    - Revenue Sub-Type
  - Revenue by Entity [same data, just more detailed visualization]
  - Revenue by Financing Intrument [same data, but with explanations for the Revenue Sub-Type codes] -- only government donor data!
- **Revenue by Donor**
  - Revenue by Government Donor
    - Year
    - Government Donor
    - Entity
    - Revenue Type
  - Revenue by Non-Government Donor -- not _all_ non-government donors!
    - Year
    - Donor (e.g. EU, World Bank, MPTF, GEF, GFATM, OCHA, Gates Foundation, Gavi)
    - Entity
  - Revenue by Contributor Type [aggregation of the two above into categories]
    - Year
    - Contributor Type
    - Entity
    - Revenue Type
- **Expenses**
  - Total Expenses
    - Year
    - Entity
  - Expenses by Function
    - Year
    - Entity
    - Expense Function (Humanitarian Assistance / Development Assistance / Peace Operations / Global Agenda and Specialized Assistance / Other)
  - Expenses by Geographic Location
    - Year
    - Region
    - Subregion
    - Country
    - Entity
    - Location Type [= aggregation helper for subregion/region level]
  - Expenses by SDG
    - Year
    - Entity
    - SDG (only highest level, no subcodes)

In summary, we have the following cross-dimensions:

- Revenue: Year x Entity x Donor x Revenue Type
- Expenses: Year x Entity x Country
- Expenses: Year x Entity x Expense Function
- Expenses: Year x Entity x SDG

What would be nice and what is lacking is:

- Expenses: Year x Entity x Country x SDG

## Proposed Programme Budget (PPB)

The Secretariat treemap can also read the standalone expenditure view supplied
by [`united-nations/programme-budget-data`](https://github.com/united-nations/programme-budget-data).
The current portal payload covers expenditure for 2018–2025, as reported two
years later in the 2020–2027 PPB editions, with this hierarchy:

- Budget part x section x budget unit x detail row
- Regular-budget, other-assessed and extrabudgetary values, kept distinct in the
  data even when the treemap shows their published combined total
- Source-document links and an explicit basis for each displayed value

The seven years 2019–2025 publish regular-budget, other-assessed and
extrabudgetary expenditure. The 2020 PPB edition provides expenditure for 2018 as a separately
disclosed partial view because it publishes regular-budget expenditure only.
Its sparse hierarchy is retained as printed. A source-evidenced entity overlay
covers the 2021–2027 editions. It adds the canonical organization name and known abbreviation without changing
the financial hierarchy or any amount. Three older section 1 budget headings
(`Policymaking organs`, `Executive direction and management`, and
`Secretary-General`) remain as printed because they are not organizations.

The local PPB cache applies the source-reconciliation rules from the
`codex/financial-source-reconciliation` branch on top of the immutable v1.6
base. The main user-facing completeness measure is the area of generic
budget-unit tiles. For 2023 expenditure, this falls from $1,467.4 million in
the v1.6 view to zero material remainder, or 0.000% of the combined PPB view.
The remaining generic shares are 0.234% for 2019, 0.145% for 2020, 0.097% for
2021, 0.096% for 2022, 0.034% for 2024, and 0.127% for 2025.

A residual tile is retained when the source corpus does not establish an exact
lower schedule. Its label now names the missing funding stream when possible,
for example `Regular-budget amount not itemized in source`. Deeper residuals
can also appear in the sidebar when a document prints one funding stream only
at the parent level. These rows preserve the printed parent total and are not
invented entity allocations. The largest remaining chart gap is $16.3 million
in 2019 section 1. Section 3 has a further $10.2 million gap because the
available mission documents do not provide a complete consolidated mission
schedule.

This is a separate dataset choice, not an extension of the audited-statements
series. Its scope and accounting basis differ, so the two totals must not be
merged or presented as a continuous time series. In either source view, the
plot uses two blocks on one USD area scale: Programme Budget and Peacekeeping,
rendered by the same tree component. Tiles use shades of their budget-part
colour to retain the funding-source split: regular assessed/regular budget,
other assessed, and voluntary/extrabudgetary.

The blocks describe budget location, while the shades describe funding source.
They must not be inferred from one another. In particular, the peacekeeping
support account is `other assessed` but remains in the responsible programme
sections (for example OICT in section 29C); the Peacekeeping block contains the
separately assessed mission accounts. Peacekeeping mission budgets use
July–June fiscal cycles and remain separate from the calendar-year PPB.
