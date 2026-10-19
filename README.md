# UN Transparency Portal

**[open.un.org](https://open.un.org)**

The UN Transparency Portal makes financial data from across the UN System accessible through interactive visualizations. Explore who contributes, which organizations receive funding, where resources are deployed, and which Sustainable Development Goals they support.

## Features

- UN System
  - **Contributors** — Treemaps and trends showing government and donor contributions by financing instrument
  - **Entities** — Spending breakdowns for 48+ UN organizations
  - **Countries** — Interactive world map with geographic spending data
  - **SDGs** — Grid visualization of spending by Sustainable Development Goal
- UN Secretariat
  - **Regular-budget contributors** — Member State assessments and paid-in-full status
  - Switch between audited-statement expenses and PPB + PKO budget-document expenditure

## Site variants

The same branch builds two versions. Set `SITE_VARIANT=public` for open.un.org
(GitHub Pages), or `SITE_VARIANT=preview` for the future-feature preview on Vercel.
An unset variable defaults to `public`; an invalid value fails the build.

```bash
SITE_VARIANT=public pnpm build
SITE_VARIANT=preview pnpm dev
SITE_VARIANT=preview pnpm build
SITE_VARIANT=preview node scripts/check-feature-export.mjs
```

`config/features.json` defines both profiles. To release a feature, enable it in
`public` and rebuild. The `routes` map associates route prefixes with their flags.
Page flags govern the entire route subtree, Secretariat navigation, and homepage
shortcuts. Disabled routes return 404. Use `pnpm build` so the post-export pruning
step removes disabled route files (Next.js otherwise exports 404 HTML at those
URLs). The `uninfo` flag
controls data loading, sidebar sections, and source disclosures in both Locations
and Goals. Public JSON data remains available in both versions.

Previously hidden Field Missions, UNINFO sorting, entity impacts, and the budget
sidebar mini treemap remain disabled in both profiles until explicitly enabled.

GitHub Actions builds both profiles and checks exported routes, links, and UNINFO
browser requests, then uploads only the public export for deployment. For Vercel, configure `SITE_VARIANT=preview` in every
Vercel environment that should show future features (including Production if the
project's main URL is the preview). Use `pnpm build` and the static `out` output.
The profile is selected at build time; changing it requires a rebuild and restart
of a running development server.

`node scripts/check-feature-export.mjs` checks the current export against the
selected profile. With a static server running, use
`SITE_VARIANT=public PORTAL_URL=http://localhost:8766 node tests/browser/feature-profiles.mjs`
(or `preview`) to check direct URLs and UNINFO requests in the browser. Existing
full-feature browser suites should run against a preview build.

## Data Sources

| Source                                                                           | Coverage                                               | Description                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| [CEB Financial Statistics](https://unsceb.org/financial-statistics)              | 2011–2024                                              | Audited financial data from 48+ UN System organizations |
| UN Secretariat Spending                                                          | 2019–2023                                              | Granular breakdown into 150+ departments and missions   |
| [Programme Budget Data](https://github.com/united-nations/programme-budget-data) | PPB expenditure 2019–2025; PKO cycles 2022/23–2024/25  | PPB hierarchy plus separately assessed mission budgets  |
| [Committee on Contributions](https://www.un.org/en/ga/contributions/)            | Regular-budget assessments and honour rolls, 2019–2026 | Member State assessments and paid-in-full status        |
| [Schedule of Individual Trust Funds](https://digitallibrary.un.org/record/4060617) | 2017–2024                                             | Audited fund statements and contributor schedules       |
| [UNINFO](https://uninfo.org/)                                                    | 2022–2024                                              | Cooperation Framework data for 127 countries            |

The two Secretariat treemap sources are deliberately selectable rather than
merged. Both source views follow the budget hierarchy and contain separate
Programme Budget and Peacekeeping blocks. Their treemap areas share one USD
scale, while remaining separate because the datasets use different scopes and
accounting bases and peacekeeping follows a July–June fiscal cycle.
Funding-source shades remain orthogonal to that hierarchy: support-account
expenditure is shown as other assessed funding in the responsible
programme-budget section, not as a mission.

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

data/                    # Raw/intermediate data (gitignored)
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
- [Data Fusion: Revenue](docs/data-fusion-revenue.md) — How revenue sources are combined
- [Data Fusion: Expenses](docs/data-fusion-expenses.md) — How expense data is merged
- [Regular-budget Contributors](docs/regular-budget-contributors.md) — Assessment and payment-status methodology
- [Trust-fund Schedules](docs/trust-fund-schedules.md) — PDF extraction, schema, validation gates, and entity crosswalk
- [Research Notes](docs/research/) — Background research and data source analysis

## License

MIT
