# Data Availability

## CEB Financial Statistics

https://unsceb.org/financial-statistics

2011 - 2024

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
The current portal payload covers expenditure for 2019–2025, as reported two
years later in the 2021–2027 PPB editions, with this hierarchy:

- Budget part x section x budget unit x detail row
- Regular-budget, other-assessed and extrabudgetary values, kept distinct in the
  data even when the treemap shows their published combined total
- Source-document links and an explicit basis for each displayed value

All seven years publish regular-budget, other-assessed and extrabudgetary
expenditure. The 2020 PPB edition also provides expenditure for 2018, but the
portal excludes it because that edition publishes regular-budget expenditure
only. A source-evidenced entity overlay covers every displayed edition. It
adds the canonical organization name and known abbreviation without changing
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
