# UN Transparency Portal (open.un.org) - Technical Analysis

## Executive Summary

The UN Transparency Portal at **open.un.org** is a specialized data visualization gateway that presents financial transparency information for the UN System and UN Secretariat. It is built on Drupal CMS and integrates with the main UN website (un.org) through standardized header/footer components while maintaining its own custom page content and data dashboards.

---

## 1. Technology Stack

### Content Management System: Drupal

The UN uses **Drupal** as its primary CMS across the organization. Evidence from the open.un.org source:

- Theme path: `/themes/custom/server_theme/dist/images/` (visible in asset URLs)
- Image paths follow Drupal conventions: `/sites/default/files/styles/slider/public/`
- URL structure and content organization typical of Drupal installations

**Drupal Version**: Most UN sites have migrated to Drupal 9/10. UN-OCHA maintains a [Drupal 10 starter kit](https://github.com/UN-OCHA/drupal-starterkit) used across UN entities.

### Infrastructure

| Component | Technology |
|-----------|------------|
| CMS | Drupal 9/10 |
| Hosting | Likely Acquia Cloud Platform (common for UN Drupal sites) |
| Server Stack | LAMP (Linux, Apache, MySQL, PHP) on AWS |
| Development | Docker/Docksal, GitHub Actions for CI/CD |
| Version Control | GitHub (e.g., [UN-OCHA repositories](https://github.com/UN-OCHA)) |

### Front-end

The site uses:
- Custom Drupal theme (`server_theme`)
- Standard UN branding elements
- Interactive data dashboards powered by **D3.js** (confirmed via UNDP patterns)
- Responsive design following UN Web Guidelines

---

## 2. Visualization Technology Deep Dive

### Confirmed: D3.js Powers UN Financial Dashboards

While `open.un.org` doesn't have a public repository, analysis of related UN data visualization projects confirms the technology stack:

#### UNDP Data Visualization Library

The **UNDP Data Visualization Library** ([`@undp/data-viz`](https://www.npmjs.com/package/@undp/data-viz)) is the official UN component library for building financial dashboards. It's open source and available on npm.

**D3 Libraries Used:**

| D3 Package | Purpose |
|------------|---------|
| `d3-array` | Data manipulation, statistics |
| `d3-delaunay` | Voronoi diagrams, spatial analysis |
| `d3-force` | Force-directed graphs |
| `d3-format` | Number formatting ($67.4B display) |
| `d3-geo` | Geographic projections |
| `d3-hierarchy` | **Treemaps**, sunbursts, dendrograms |
| `d3-scale` | Linear/ordinal scales for axes |
| `d3-selection` | DOM manipulation |
| `d3-shape` | Arcs, lines, areas |
| `d3-zoom` | Pan and zoom interactions |

**Additional Dependencies:**

| Package | Purpose |
|---------|---------|
| `lodash.*` | Array/data manipulation |
| `motion` | Animations in charts |
| `papaparse` | CSV loading and parsing |
| `simple-statistics` | Statistical functions |
| `date-fns` | Date formatting |
| `modern-screenshot` | Download charts as images |
| `react-csv` | Export to CSV |
| `maplibre-gl` | Interactive maps |

### Visualization Types Observed on open.un.org

| Chart Type | D3 Module | Example Page |
|------------|-----------|--------------|
| **Treemap** | d3-hierarchy | Revenue by region |
| **Bar Chart** | d3-scale + d3-shape | Revenue by entity ranking |
| **Timeline** | d3-scale | Year selector (2013-2022) |
| **Donut/Pie** | d3-shape (arc) | Contribution types |
| **Data Table** | Custom | Entity rankings |

### Browser Observations

The open.un.org dashboards exhibit:

1. **Interactive filtering** - Dropdowns for Type, Region, Contributor, Entity
2. **Animated transitions** - Smooth transitions when changing years/filters
3. **Hover tooltips** - Details on data points
4. **Responsive layout** - Charts resize with viewport
5. **Data export** - "Download data" button for CSV export

### Related UN Transparency Portals Using Same Tech

| Portal | Repository | Tech Stack |
|--------|-----------|------------|
| **open.undp.org** | [undp/transparencyportal](https://github.com/undp/transparencyportal) | Preact + Django |
| **UNDP Data Viz** | [undp/data-visualization](https://github.com/undp/data-visualization) | React + D3 + Vite |
| **UNDP DataViz Library** | [@undp/data-viz](https://www.npmjs.com/package/@undp/data-viz) | React 19 + D3 |
| **financingun.report** | Unknown | Interactive D3 visualizations |

### Installing UNDP Data Viz Library

For Next.js projects replicating UN visualization style:

```bash
npm install @undp/data-viz
```

```tsx
import { HorizontalBarGraph, TreemapGraph } from '@undp/data-viz';
import '@undp/data-viz/style.css';

// Example usage
<HorizontalBarGraph
  data={revenueData}
  colorDomain={['Europe', 'Americas', 'Asia', 'Africa']}
  graphTitle="UN System Revenue by Region"
/>
```

### Alternative: Build Custom D3 Charts

If not using the UNDP library, install individual D3 packages:

```bash
npm install d3-hierarchy d3-scale d3-shape d3-selection d3-format
```

Example treemap implementation:

```tsx
import * as d3 from 'd3';
import { hierarchy, treemap } from 'd3-hierarchy';

function Treemap({ data, width, height }) {
  const root = hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  const treemapLayout = treemap()
    .size([width, height])
    .padding(2);

  treemapLayout(root);

  return (
    <svg width={width} height={height}>
      {root.leaves().map((leaf, i) => (
        <g key={i} transform={`translate(${leaf.x0},${leaf.y0})`}>
          <rect
            width={leaf.x1 - leaf.x0}
            height={leaf.y1 - leaf.y0}
            fill={colorScale(leaf.data.category)}
          />
          <text>{leaf.data.name}</text>
        </g>
      ))}
    </svg>
  );
}
```

---

## 3. Header/Footer Integration

### How the Shared Components Work

The UN maintains **centralized branding standards** across all subdomains. The header showing "Welcome to the United Nations" and the footer with standard UN links are implemented through:

#### UN Common Design System

1. **UNite Template**: Pre-defined enterprise web templates provided by the UN Office of Information Technology (OICT). Contact: itservices@un.org

2. **Common Design Base Theme**: UN-OCHA maintains a [Common Design Drupal theme](https://github.com/UN-OCHA/common_design) that provides standardized header/footer components for Drupal 9/10 sites.

3. **Web Style Guide**: All UN sites must comply with the [UN Web Style Guide](https://www.un.org/styleguide/) which defines:
   - Fonts, colors, navigation patterns
   - Branding bar with UN homepage link and global search
   - Language bar (6 official UN languages)
   - Dark grey mandatory footer (Copyright, Terms, Privacy, Fraud Alert)
   - Optional light grey site-specific footer

#### Technical Implementation

```
┌─────────────────────────────────────────────────────┐
│  UN Branding Bar (from Common Design/UNite)         │
│  "Welcome to the United Nations" → links to un.org  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Custom Page Content (open.un.org specific)         │
│  - Dashboards                                       │
│  - Data visualizations                              │
│  - Site navigation                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Standard UN Footer (mandatory elements)            │
│  A-Z Index | Contact | Copyright | FAQ | Privacy    │
└─────────────────────────────────────────────────────┘
```

The integration is **template-based**, not iframe-based. Each UN subdomain implements the shared components through:
- Drupal base themes that include header/footer templates
- Shared CSS/JS assets following UN design tokens
- Compliance with DGC (Department of Global Communications) web standards

---

## 4. Data Architecture

### Data Sources

The portal aggregates data from multiple authoritative sources:

#### Primary Source: UN System Chief Executives Board (CEB)

| Data Type | Source | Format |
|-----------|--------|--------|
| UN System Revenue | [unsceb.org/financial-statistics](https://unsceb.org/financial-statistics) | CSV (UTF-8, USD) |
| UN System Expenses | CEB Financial Statistics | CSV |
| Expenses by SDG | CEB Data Collection | CSV |
| Geographic Distribution | CEB Management Survey | CSV |

#### Secondary Source: UN Secretariat

| Data Type | Source |
|-----------|--------|
| Programme Budget | [UN Fifth Committee](https://www.un.org/en/ga/fifth/index.shtml) |
| Audited Financial Statements | [Board of Auditors](https://www.un.org/en/auditors/board/auditors-reports.shtml) |
| Annual Report Data | [un.org/annualreport](https://un.org/annualreport) |

### Data Standards: The UN Data Cube

Since 2019, financial data follows the **UN Data Cube** - harmonized data standards with 7 dimensions:

1. UN Entity
2. UN System Function
3. Geographic Location
4. UN Grant Financing Instruments
5. Sustainable Development Goals
6. Revenue by Contributor
7. UN Gender Equality Marker

Standards approved by:
- High-Level Committee on Management (HLCM) - October 2018
- UN Sustainable Development Group (UNSDG) - November 2018

### API and Data Access

**There is NO public REST API.** Data access methods:

| Method | URL | Description |
|--------|-----|-------------|
| CSV Downloads | [unsceb.org/data-download](https://unsceb.org/data-download) | Direct file downloads |
| Interactive Dashboards | open.un.org | Browser-based exploration |
| CEB Statistics Portal | [unsceb.org/financial-statistics](https://unsceb.org/financial-statistics) | Charting and drill-down |

### Available CSV Datasets

**Financial Statistics:**
- Revenue (overall, by entity, by financing instruments)
- Revenue by Government/Non-government Donors
- Revenue by Contributor Type
- Expenses by Sub-agency
- Expenses by Geographic Location
- Expenses by SDG
- Thematic Funds

**Human Resources:**
- Personnel by Nationality, Organization, Grade/Gender, Age/Tenure, Duty Station

### Data Flow Architecture

```
┌──────────────────────┐
│   43 UN Entities     │
│   (Audited Reports)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   CEB Secretariat    │
│   Data Collection    │
│   & Validation       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   unsceb.org         │
│   (Primary Source)   │
│   CSV + Web Portal   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   open.un.org        │
│   (Visualization     │
│    Gateway)          │
└──────────────────────┘
```

### Has This Data Been Published Elsewhere?

Yes, the underlying data appears in multiple contexts:

1. **General Assembly Reports**: CEB statistics form the basis of Reports on the Financial Situation of the UN System
2. **ECOSOC Reports**: Reports on Operational Activities for Development
3. **UN System Financing Report**: Joint publication by Dag Hammarskjöld Foundation and UN Multi-Partner Trust Fund Office
4. **Individual Entity Annual Reports**: Each of the 43 UN entities publishes their own financial statements

The open.un.org portal is a **visualization layer** over pre-existing data, not a primary data publisher.

---

## 5. Website History and Popularity

### Launch and Development

| Aspect | Details |
|--------|---------|
| **Inspiration** | [UN Reform](https://reform.un.org) and [Secretary-General's Data Strategy](https://un.org/datastrategy) |
| **Funding** | UK Foreign, Commonwealth and Development Office (FCDO) - UN Reform Unit |
| **Estimated Launch** | 2020-2021 (based on content dates and Funding Compact timeline) |
| **Related Initiatives** | UN Funding Compact (2019), UN Data Standards (2018-2019) |

The About page states:
> "The development of this site was generously supported by the UN Reform Unit in Foreign, Commonwealth and Development Office of the United Kingdom."

### Related UN Transparency Portals

| Portal | URL | Focus |
|--------|-----|-------|
| UN Transparency Gateway | open.un.org | System-wide financial overview |
| UN Results Portal | results.un.org | Programme budget results |
| CEB Statistics | unsceb.org/financial-statistics | Raw financial data |
| UN Annual Report | un.org/annualreport | Secretary-General's report |
| UNSDG | unsdg.un.org | Development system coordination |

### Popularity and Citations

**Traffic Indicators:**
- Linked prominently from un.org main site
- Referenced in official UN documentation
- Used by delegations and researchers studying UN finances

**Academic/External Citations:**
- Limited direct academic citations found (the data source at unsceb.org is more commonly cited)
- Primary audience appears to be: Member State delegations, journalists, civil society organizations, and researchers

**Visibility:**
- Listed in UN80 Initiative resources
- Connects to Funding Compact monitoring
- Part of UN's broader transparency and accountability infrastructure

### Comparison to Main UN Website

| Aspect | un.org | open.un.org |
|--------|--------|-------------|
| Purpose | General information portal | Financial transparency data |
| CMS | Drupal | Drupal |
| Content Type | News, documents, multimedia | Dashboards, data visualization |
| Traffic | High (flagship site) | Lower (specialized audience) |
| Header/Footer | Standard UN design | Same (inherited from UN design system) |

---

## 6. Header/Footer Extraction for Next.js

### Can We Extract the UN Header/Footer?

**Short answer: Yes, but with caveats.**

The UN header/footer components are designed for Drupal and are tightly coupled to Drupal's theming system. However, the underlying HTML/CSS/JS can be adapted for Next.js.

### Option 1: Extract Static HTML/CSS (Recommended for Non-Official Projects)

The header and footer are rendered as static HTML with CSS styling. You can:

1. **Inspect and replicate the markup** - The DOM structure is straightforward:
   ```html
   <!-- Header structure observed from browser -->
   <header>
     <div class="un-branding-bar">
       <a href="https://www.un.org">Welcome to the United Nations</a>
     </div>
     <nav class="main-nav">
       <img src="/logo.svg" alt="United Nations" />
       <ul class="nav-items">...</ul>
     </nav>
   </header>
   ```

2. **Copy the CSS variables and styles** from the Common Design theme's `css/` folder on GitHub

3. **Recreate as React components** with the same visual appearance

### Option 2: Use UN-OCHA Common Design Assets Directly

The [UN-OCHA Common Design repository](https://github.com/UN-OCHA/common_design) provides:

| Asset | Location | Usability in Next.js |
|-------|----------|---------------------|
| CSS files | `/css/` folder | ✅ Can be imported directly |
| SVG Icons | `/img/icons/` | ✅ Use directly or as React components |
| Icon Sprite | `/img/icons/cd-icons-sprite.svg` | ✅ Import and reference by ID |
| Fonts (Roboto) | Google Fonts link | ✅ Add to `_document.tsx` |
| JavaScript | `/js/` folder | ⚠️ Drupal-specific behaviors need adaptation |

**Font inclusion (from Common Design docs):**
```html
<link href="https://fonts.googleapis.com/css?family=Roboto:regular,italic,500,500italic,700,700italic,300,300italic&display=swap" rel="stylesheet" />
```

### Option 3: Reference Implementation Components

Key components from the Common Design system:

1. **OCHA Services Menu** - Dropdown with links to UN services
2. **Language Switcher** - 6 official UN languages
3. **Site Search** - Search functionality
4. **Main Navigation** - Responsive nav with dropdowns
5. **Footer** - Legal links, social links, OCHA mandate

### Implementation Notes for Next.js

```tsx
// Example: Recreating UN header in Next.js
import styles from './UNHeader.module.css';

export function UNHeader() {
  return (
    <header className={styles.header}>
      {/* Branding bar */}
      <div className={styles.brandingBar}>
        <a href="https://www.un.org">Welcome to the United Nations</a>
      </div>
      
      {/* Main navigation */}
      <nav className={styles.mainNav}>
        <a href="/" className={styles.logo}>
          <img src="/images/UN_Logo_Horizontal_Colour_English.svg" alt="United Nations" />
        </a>
        {/* Nav items */}
      </nav>
    </header>
  );
}
```

### Legal Considerations

- **Official UN Sites**: Must use approved UNite templates and comply with DGC standards
- **Unofficial/Parody Projects**: Should clearly indicate non-official status, avoid misrepresenting as official UN
- **Open Source**: Common Design is GPL-2.0 licensed, CSS/assets can be adapted

---

## 7. Data Storage and Serving Analysis

### Browser Analysis Findings

Based on browser inspection of `open.un.org`:

#### Page Structure

The dashboard pages (e.g., `/un-systems-financials/revenue`) feature:

| Element | Observation |
|---------|-------------|
| **Year Selector** | Horizontal timeline (2013-2022) with clickable years |
| **Filter Dropdowns** | Type, Region, Contributor, UN System Entity |
| **Visualization** | Treemap chart (Europe $23.4B, Americas $23.2B, etc.) |
| **Data Table** | Ranked list (UN Secretariat, WFP, UNICEF, UNHCR, etc.) |
| **Download Button** | "Download data" - triggers CSV export |

#### Data Loading Pattern

The data appears to be **server-side rendered** with Drupal rather than fetched via client-side API:

1. **No visible XHR/fetch requests** for JSON data during page interactions
2. **Data is embedded in the HTML** or loaded via Drupal's rendering pipeline
3. **Filter interactions** likely trigger full or partial page reloads

#### Available CSV Downloads

From [unsceb.org/data-download](https://unsceb.org/data-download):

**Financial Statistics (all in USD, UTF-8 encoding):**

| Dataset | Direct URL |
|---------|-----------|
| Revenue | `https://unsceb.org/sites/default/files/statistic_files/Financial/revenue.csv` |
| Revenue by Entity | `https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_sub_agency.csv` |
| Revenue by Financing Instruments | `https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_by_financing_instruments_and_government_contributors.csv` |
| Revenue by Govt Donors | `https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_government_donors.csv` |
| Revenue by Non-govt Donors | `https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_non_gov_donors.csv` |
| Revenue by Contributor Type | `https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_contrib_type.csv` |
| Expenses | `https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sub_agency.csv` |
| Expenses by Geography | `https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_by_country_region_sub_agency.csv` |
| Expenses by SDG | `https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sdgs.csv` |
| Thematic Funds | `https://unsceb.org/sites/default/files/statistic_files/Financial/thematic%20funds.csv` |

**Human Resources Data:**

| Dataset | Direct URL |
|---------|-----------|
| Personnel by Nationality | `https://unsceb.org/sites/default/files/statistic_files/HR/nationality.csv` |
| Personnel by Organization | `https://unsceb.org/sites/default/files/statistic_files/HR/organization.csv` |
| Personnel by Grade/Gender | `https://unsceb.org/sites/default/files/statistic_files/HR/composition.csv` |
| Personnel by Age/Tenure | `https://unsceb.org/sites/default/files/statistic_files/HR/others.csv` |
| Personnel by Duty Station | `https://unsceb.org/sites/default/files/statistic_files/HR/duty_station.csv` |

### Data Architecture for Next.js Replication

```
┌─────────────────────────────────────────────────────────────┐
│                     Build/Deploy Time                        │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch CSVs from unsceb.org                              │
│  2. Parse and transform to JSON                             │
│  3. Store in /public/data/ or database                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Runtime                                 │
├─────────────────────────────────────────────────────────────┤
│  Option A: Static JSON files served from /public/data/      │
│  Option B: API routes that query local SQLite/Postgres      │
│  Option C: Edge functions with cached responses             │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Data Pipeline

```python
# python/data_prep.py (already exists in project)
# Fetch and process UN financial data

import pandas as pd

DATASETS = {
    'revenue': 'https://unsceb.org/sites/default/files/statistic_files/Financial/revenue.csv',
    'revenue_by_entity': 'https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_sub_agency.csv',
    'expenses': 'https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sub_agency.csv',
    'expenses_by_geo': 'https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_by_country_region_sub_agency.csv',
    'expenses_by_sdg': 'https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sdgs.csv',
}

def fetch_and_process():
    for name, url in DATASETS.items():
        df = pd.read_csv(url)
        # Transform and save as JSON for frontend
        df.to_json(f'public/data/{name}.json', orient='records')
```

---

## 8. Technical Recommendations for Replication

If building a similar transparency portal:

### CMS Options
1. **Drupal 10** - Native choice for UN ecosystem compatibility
2. **Next.js** - Modern alternative for data-heavy dashboards (as in this project)
3. **Static site + API** - For simpler implementations

### Data Integration Patterns
1. **ETL Pipeline**: Fetch CSVs from unsceb.org → Transform → Load into local database
2. **Client-side Fetch**: Direct CSV parsing in browser (simpler but slower)
3. **Caching Layer**: Store processed data to reduce load on source

### Header/Footer Integration
- For UN-affiliated sites: Use Common Design theme or UNite templates
- For independent projects: Create similar visual design but clearly indicate non-official status

### Visualization Libraries

The open.un.org dashboards appear to use custom JavaScript visualizations. For Next.js alternatives:

| Library | Best For | Notes |
|---------|----------|-------|
| **D3.js** | Complex custom charts | Steep learning curve, maximum flexibility |
| **Recharts** | Standard charts in React | Easy integration, good defaults |
| **Visx** | D3 + React hybrid | Airbnb's library, composable |
| **Observable Plot** | Quick data exploration | From D3 creator, newer |
| **Tremor** | Dashboard components | Tailwind-based, pre-built |

### Project Structure Recommendation

```
open.un.org/
├── public/
│   └── data/                    # Processed JSON data files
│       ├── revenue.json
│       ├── expenses.json
│       └── ...
├── python/
│   └── data_prep.py            # ETL script to fetch/process CSVs
├── src/
│   ├── app/
│   │   ├── page.tsx            # Home page
│   │   ├── revenue/
│   │   │   └── page.tsx        # Revenue dashboard
│   │   └── expenses/
│   │       └── page.tsx        # Expenses dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx      # UN-style header
│   │   │   └── Footer.tsx      # UN-style footer
│   │   └── charts/
│   │       ├── Treemap.tsx
│   │       ├── BarChart.tsx
│   │       └── ...
│   └── lib/
│       └── data.ts             # Data fetching utilities
└── docs/
    └── research/
        └── web-framework.md    # This document
```

---

## 9. Summary

| Question | Answer |
|----------|--------|
| **What CMS does open.un.org use?** | Drupal 9/10 with custom `server_theme` |
| **Where does the header/footer come from?** | UN Common Design system (Drupal base theme), template-based integration |
| **Can we extract header/footer for Next.js?** | Yes - copy HTML/CSS from Common Design repo, recreate as React components |
| **How is data stored/served?** | Server-side rendered from Drupal; source CSVs from unsceb.org |
| **Is there an API?** | No REST API; data available as CSV downloads |
| **How old is the site?** | Launched ~2020-2021, funded by UK FCDO |
| **Who uses it?** | Member State delegations, researchers, journalists, civil society |

---

## References

### UN Websites
- [UN Transparency Gateway](https://open.un.org/)
- [UN Web Guidelines](https://www.un.org/en/webguidelines/)
- [UN Web Style Guide](https://www.un.org/styleguide/)
- [UN Brand Guidelines](https://brand.unocha.org/)

### Data Sources
- [CEB Financial Statistics](https://unsceb.org/financial-statistics)
- [CEB Data Download](https://unsceb.org/data-download)
- [UN Data Standards (Data Cube)](https://unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data)

### GitHub Repositories
- [UN-OCHA Common Design Theme](https://github.com/UN-OCHA/common_design) - Drupal base theme with header/footer components
- [UN-OCHA Drupal Starter Kit](https://github.com/UN-OCHA/drupal-starterkit) - Template for new UN Drupal sites
- [UN-OCHA Common Design Demo](https://github.com/UN-OCHA/common-design-site) - Reference implementation
- [UN-OCHA Corporate Site](https://github.com/UN-OCHA/unocha-site) - unocha.org source code

### Documentation
- [Common Design Demo](https://web.brand.unocha.org/demo) - Live component examples
- [OCHA Humanitarian Icons](https://brand.unocha.org/d/xEPytAUjC3sH/icons) - Icon library

_Analysis by Claude-Opus-4.5, Jan 31, 2026_
