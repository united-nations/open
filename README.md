![WIP](https://img.shields.io/badge/status-WIP-yellow)

# UN Transparency Portal

**[open.un.org](https://open.un.org)**

The UN Transparency Portal makes financial data from across the UN System accessible through interactive visualizations. Explore who contributes, which organizations receive funding, where resources are deployed, and which Sustainable Development Goals they support.

## Features

- UN System
  - **Contributors** — Treemaps and trends showing government and donor contributions by financing instrument
  - **Entities** — Expenditure breakdowns for 48+ UN organizations
  - **Countries** — Interactive world map with geographic expenditure data
  - **Functions** — Expenditure treemap and compact trends across the four CEB functions
  - **Goals** — SDG expenditure treemap; annual snapshots are not directly comparable
- UN Secretariat
  - **Regular-budget contributors** — Member State assessments and paid-in-full status
  - Switch between audited-statement expenses and PPB + PKO budget-document expenditure

The Functions and Goals tabs use separate routes (`/system/functions/` and
`/system/goals/`). Function deep links shared on the former combined Goals page
continue to open on Functions. A function-by-financing-mechanism chart is deferred:
the current CEB function expenditure export does not report that cross-dimension,
and organization revenue proportions are not treated as function financing.

## Site variants

The same branch supports three build profiles, configured centrally in
`config/features.json`:

- `public`: the production profile for open.un.org (GitHub Pages).
- `preview`: selected future features for the Vercel preview, including outstanding
  regular-budget assessments; UNINFO is disabled.
- `full`: every feature flag enabled, including UNINFO, outstanding regular-budget
  assessments, additional trust funds, Peace Operations, sorting controls, entity
  impacts. The function/geography plot is available in every profile.

Set `SITE_VARIANT` to select a profile. An unset variable defaults to `public`;
an invalid value fails the build. Selection happens at build time, so changing
profiles requires rebuilding or restarting the development server.

```bash
SITE_VARIANT=public pnpm build
SITE_VARIANT=preview pnpm dev
SITE_VARIANT=full pnpm dev
SITE_VARIANT=full pnpm build
SITE_VARIANT=full node scripts/check-feature-export.mjs
```

To release a feature, enable it in `public` and rebuild. The `routes` map associates
route prefixes with their flags. Page flags govern the entire route subtree,
Secretariat navigation, and homepage shortcuts. Disabled routes return 404. Use
`pnpm build` so post-export pruning removes disabled route files (Next.js otherwise
exports 404 HTML at those URLs).

The `uninfo` flag controls data loading, sidebar sections, and source disclosures
in Locations and Goals; it is enabled only in `full`. The `additionalTrustFunds`
flag includes separately reported UNEP, UNODC, UN-Habitat and ITC data in Trust
Funds. It is disabled in `public` and `preview`: those profiles use only the
Secretariat Volume I schedules and mention the excluded entities in the intro.
The parent `trustFunds` flag controls the whole route.
The `peaceOperations` flag enables a Peace Operations subtab under Peacekeeping
Budget only in `full`. It combines peacekeeping operations (PKO) with special
political missions (SPM); SPM are programme-budget-funded, outside the peacekeeping
budget. Source JSON remains
available regardless of the selected profile.

GitHub Actions builds and checks all three profiles, then uploads only the public
export for deployment. Configure Vercel with `SITE_VARIANT=preview`, `pnpm build`,
and the static `out` output for the selected-feature preview.

`node scripts/check-feature-export.mjs` checks the current export against the
selected profile. With a static server running, use
`SITE_VARIANT=full PORTAL_URL=http://localhost:8766 node tests/browser/feature-profiles.mjs`
(or `public` / `preview`) to check direct URLs and UNINFO requests. Run the full
feature browser suite against a `full` build.

## Data Sources

| Source                                                                           | Coverage                                               | Description                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| [CEB Financial Statistics](https://unsceb.org/financial-statistics)              | Dataset-specific coverage through 2025                 | Current CEB release; audited-statement-based UN System data |
| UN Secretariat Expenditure                                                          | 2019–2023                                              | Granular breakdown into 150+ departments and missions   |
| [Programme Budget Data](https://github.com/united-nations/programme-budget-data) | PPB expenditure 2019–2025; PKO cycles 2022/23–2024/25  | PPB hierarchy plus separately assessed mission budgets  |
| [Committee on Contributions](https://www.un.org/en/ga/contributions/)            | Regular-budget assessments and honour rolls, 2019–2026 | Member State assessments and paid-in-full status        |
| [Schedule of Individual Trust Funds](https://digitallibrary.un.org/record/4125943) | 2017–2025                                             | Audited fund statements and contributor schedules       |
| [UNINFO](https://uninfo.org/)                                                    | 2022–2024                                              | Cooperation Framework data for 127 countries            |

The two Secretariat treemap sources are deliberately selectable rather than
merged. Both source views follow the budget hierarchy and contain separate
Programme Budget and Peacekeeping blocks. Their treemap areas share one USD
scale, while remaining separate because the datasets use different scopes and
accounting bases and peacekeeping follows a July–June fiscal cycle.
Funding-source shades remain orthogonal to that hierarchy: support-account
expenditure is shown as other assessed funding in the responsible
programme-budget section, not as a mission.

## CEB methodology and nominal values

[data/ceb-methodology.json](data/ceb-methodology.json) is the single content source
for CEB source notes and the portal processing summary. About holds this note,
separate methodology subsections for the Secretariat views, and the UNINFO note
when that feature is enabled. Data pages link to the relevant About section and
retain basic source links in their introductions. Selected-year references,
signed adjustments and nonpositive-fund navigation remain in local data details.

System financial totals remain CEB-only. Contributor classifications follow the
source, reported aggregates stay distinct from calculated balances, and
unresolved historical financing records are disclosed without guessed main types.
The portal uses nominal source USD; CPI adjustment is disabled. See
[the current methodology contract](docs/ceb-methodology.md).

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts, [UNDP Data Visualization Library](https://github.com/UNDP-Data/undp-visualization-library) (for map component)

**Data Processing:** Python 3.13+, pandas, requests

## Project Structure

```
src/
├── app/                 # Next.js app router (single-page app)
├── components/          # React components
│   ├── *Treemap.tsx     #   Interactive treemap visualizations
│   ├── *Sidebar.tsx     #   Detail panels for selections
│   ├── *TrendsChart.tsx #   Time series charts
│   ├── charts/          #   Reusable chart primitives
│   └── ui/              #   Base UI components (shadcn)
├── lib/                 # Data loading, entity/SDG/region mappings
├── hooks/               # Custom React hooks
└── types/               # TypeScript interfaces

python/                  # Data pipeline scripts (numbered, run in order)

public/data/             # Processed JSON served to frontend
├── {view}-{year}.json   #   Year-specific data per visualization
├── uninfo-countries/    #   Per-country UNINFO data (127 files)
└── manifest.json        #   Data availability metadata

data/                    # Source/intermediate data; caches selectively ignored
├── ceb/{raw,clean,fused}/ # CEB data processing stages
└── uninfo/raw/          #   Cached UNINFO API responses

docs/                    # Methodology documentation
└── research/            # Data source research notes
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Data Pipeline

Python scripts in `python/` fetch and process raw data into JSON. Run them in numbered order with `uv run <script>.py`.

## Documentation

See [`docs/`](docs/) for detailed documentation:

- [Data Availability](docs/data-availability.md) — What data exists for which years
- [CEB Methodology](docs/ceb-methodology.md) — Shared source notes and agreed transformation contract
- [Revenue Processing](docs/data-fusion-revenue.md) — Source classifications, controls and signed reconciliation
- [Expense Processing](docs/data-fusion-expenses.md) — CEB-only system expenses, geographic levels, functions and SDGs
- [Regular-budget Contributors](docs/regular-budget-contributors.md) — Assessment and payment-status methodology
- [Trust-fund Schedules](docs/trust-fund-schedules.md) — PDF extraction, schema, validation gates, and entity crosswalk
- [Research Notes](docs/research/) — Background research and data source analysis

## License

MIT
