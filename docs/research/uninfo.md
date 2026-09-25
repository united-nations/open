# UNINFO API Research Report

## Overview

UNINFO (api.uninfo.org) is the UN's platform for Cooperation Framework data management. It provides public API endpoints for accessing structured financial and programmatic data from UN Country Teams.

**API Base URL**: `https://api.uninfo.org/v1.0/`  
**Documentation**: https://help.uninfo.org/un-info/api-documentation/api

## Data Scope

### Coverage
- **162 workspaces** (countries/regions with Cooperation Frameworks)
- **127 countries** with financial data exportable to our site
- **~34,000 sub-outputs (projects)** 
- **65 UN agencies** reporting data
- **Historical data**: 2022, 2023, 2024 (expenditure data available)

### Regional Distribution
| Region | Workspaces |
|--------|------------|
| Africa | 56 |
| Latin America & Caribbean | 44 |
| Asia Pacific | 28 |
| Europe and Central Asia | 20 |
| Arab States | 12 |

### Top Agencies by Project Count (2024)
| Agency | Projects |
|--------|----------|
| UNDP | 3,675 |
| UNICEF | 3,619 |
| UNFPA | 2,031 |
| FAO | 1,890 |
| IOM | 1,680 |
| WHO | 1,634 |
| UNESCO | 1,259 |
| UN Women | 1,255 |
| ILO | 1,128 |
| UNHCR | 1,124 |

## Financial Metrics

UNINFO tracks **three financial metrics**:

| Metric | Description |
|--------|-------------|
| **Total Required Resources** | Budget needed for planned activities |
| **Total Available Resources** | Secured/confirmed funding |
| **Total Expenditure** | Actual spending |

### Global Financial Summary (2024)
- **Expenditure**: $16.57B
- **Available**: $24.54B
- **Required**: $36.77B
- **Funding Gap**: $12.23B

### Historical Expenditure
| Year | Global Expenditure |
|------|-------------------|
| 2022 | $15.36B |
| 2023 | $18.82B |
| 2024 | $16.57B |

## Key API Endpoints

### 1. Finance Overview (Main Endpoint)
```
GET /v1.0/planEntity/finance/overview
```

**Parameters**:
- `workspaceIds` - Filter by country workspace
- `financeYears` - Filter by financial year
- `grouping` - Aggregate by dimension (supports nesting)
- `sdgIds` - Filter by SDG
- `agencyIds` - Filter by agency

**Grouping Options**:
- `sdg` - By Sustainable Development Goal
- `agency` - By UN agency
- `contributingPartner` - By donor/funder
- `planEntity:SOU` - By sub-output (project)
- `planEntity:OU` - By outcome
- `planEntity:OC` - By output

### 2. Workspace Search
```
POST /v1.0/workspace/search
```
Search for countries/regions by name, region, or ID.

### 3. Plan Search
```
POST /v1.0/plan/public/search
```
Search for Cooperation Framework plans by workspace, year, or type.

## Data Structure

### Disaggregated Project Data
The API provides **full project-level (sub-output) data** including:

```json
{
  "id": 154824,
  "code": "2.1.05",
  "name": "Technical Support on agriculture information system",
  "description": "To provide support to the Government on...",
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "parentId": 134652,
  "parentName": "OU2.1 Institutions and systems improved...",
  "metrics": [
    {"metricName": "Total Expenditure", "total": 237000},
    {"metricName": "Total Available Resources", "total": 237000},
    {"metricName": "Total Required Resources", "total": 237000}
  ]
}
```

### Nested Groupings
Multiple groupings can be nested:

**Example**: `grouping=agency&grouping=planEntity:SOU`
Returns agencies with their projects nested inside.

**Example**: `grouping=planEntity:SOU&grouping=sdg`
Returns projects with SDG linkages nested inside.

### Results Framework Hierarchy

Each Cooperation Framework follows a **logical hierarchy**:

```
Strategic Priority (SP)
  └── Outcome (OC)
        └── Output (OU)
              └── Sub-output/Project (SOU)
```

**API Grouping Options**:
- `planEntity:SP` - Strategic Priorities (top level goals)
- `planEntity:OC` - Outcomes (high-level results)
- `planEntity:OU` - Outputs (specific deliverables)
- `planEntity:SOU` - Sub-outputs/Projects (individual activities)

**Example counts (Afghanistan)**:
| Level | Count | Example |
|-------|-------|---------|
| Strategic Priorities | 3 | "Sustained Essential Services" |
| Outcomes | 3 | "By 2027, more people can access essential services..." |
| Outputs | 11 | "Output 1.1: Health systems improved..." |
| Projects | 183 | Individual agency activities |

**Data returned per level**:
- `id`, `code`, `name`, `description`
- `parentId`, `parentName` (links to parent level)
- `startDate`, `endDate`
- `metrics` (required/available/spent)

**Note**: Some countries have multiple framework cycles (e.g., Mali has 2022-2024 and 2024-2026 frameworks), causing duplicates. Dedupe by keeping latest `endDate` per code.

## Comparison with CEB Data

| Dimension | UNINFO | CEB |
|-----------|--------|-----|
| **Data Type** | Planned + Actual | Actual only |
| **Scope** | Cooperation Framework activities | All UN system spending |
| **SDG + Country** | ✅ Combined | ❌ Separate files |
| **Project-level** | ✅ Full details | ❌ Not available |
| **Agency + Country** | ✅ Available | ✅ Available |
| **Donor info** | ✅ Contributing partners | ✅ Government donors |
| **Year coverage** | 2022-2025 | 2013-2024 |
| **Global total (2023)** | ~$19B expenditure | ~$43B expenditure |

### Key Insight
UNINFO covers ~40-45% of total UN system spending captured in CEB data. The difference represents:
- Headquarters operations
- Peacekeeping missions  
- Global/regional programs not in country Cooperation Frameworks
- Agencies not participating in UNINFO reporting
- Developed/donor countries (not in UNINFO as they don't have Cooperation Frameworks)

## Interesting Data for Our Website

### 1. Project-Level Visualization
- 23,000+ individual projects with names, descriptions, timelines
- Link projects to SDGs, countries, and agencies
- Show funding gaps at project level

### 2. SDG-Country Matrix (Unique to UNINFO)
CEB cannot provide SDG spending by country. UNINFO can:
```
GET /planEntity/finance/overview?workspaceIds=88&grouping=sdg
```

### 3. Funding Gap Analysis
- Compare required vs available resources
- Identify underfunded SDGs by country
- Track funding mobilization over time

### 4. Donor Attribution
- See which donors fund which projects
- Contributing partner breakdowns by SDG/country

### 5. Delivery Rate
Available: Required ratio shows implementation capacity.

## Sample API Calls

### Global SDG Spending
```bash
curl "https://api.uninfo.org/v1.0/planEntity/finance/overview?financeYears=2024&grouping=sdg"
```

### Country + SDG + Agency (Nested)
```bash
curl "https://api.uninfo.org/v1.0/planEntity/finance/overview?workspaceIds=88&financeYears=2024&grouping=sdg&grouping=agency"
```

### All Projects for a Country
```bash
curl "https://api.uninfo.org/v1.0/planEntity/finance/overview?workspaceIds=88&financeYears=2024&grouping=planEntity:SOU"
```

### Projects by Agency with Details
```bash
curl "https://api.uninfo.org/v1.0/planEntity/finance/overview?workspaceIds=88&financeYears=2024&grouping=agency&grouping=planEntity:SOU"
```

## Data Quality Notes

1. **Reporting varies by country** - Some workspaces have complete data, others sparse
2. **Expenditure lags** - 2024 expenditure may be incomplete
3. **API can be slow** - Large queries (global sub-outputs) take 10+ seconds
4. **Caching recommended** - Use joblib.Memory or similar
5. **Year filtering quirk** - Some countries (DR Congo, Ethiopia, etc.) return empty when filtering by `financeYears=2024` but have data when querying without year filter. Must implement fallback.

### Countries Without UNINFO Data

89 countries in CEB data have no UNINFO Cooperation Framework data:

1. **Developed/donor countries** - USA, UK, Germany, France, Japan, Australia, Canada, etc. These are donor countries, not programme countries receiving UN development assistance.
2. **Small territories** - Aruba, Bermuda, Puerto Rico, French Polynesia, Cayman Islands, etc.
3. **Some countries** have workspaces but no financial data in the API (e.g., Fiji, Iraq)

This is expected - Cooperation Frameworks are agreements between the UN and **programme countries** for coordinated development assistance.

## Workspace ID Reference
See `/data/processed/workspace_ids.json` in un-system-chart-navigator for country→workspace ID mapping.

## SDG Granularity

UNINFO reports only at **SDG goal level (1-17)**, not at target (1.1, 1.2) or indicator level.
CEB data occasionally has target-level data from specific agencies (mainly WFP budget data).

## Public URLs

- **Country pages (v2)**: `https://uninfo.org/v2/location/{workspace_id}/programming/analysis/sdgs`
  - Example: https://uninfo.org/v2/location/88/programming/analysis/sdgs (Philippines)
  - Also: `/programming/analysis/un-entities` for agency breakdown
- **Data portal**: https://data.uninfo.org (redirects to uninfo.org)
- **UNSDG country pages**: `https://unsdg.un.org/un-in-action/{country-slug}`
  - Example: https://unsdg.un.org/un-in-action/afghanistan
- **No direct project URLs** - Projects don't have individual public pages

## Project Content

Each sub-output (project) includes:
- **Name**: Descriptive title (avg 141 chars)
- **Description**: 1-3 sentence explanation of activities
- **Code**: Internal reference (e.g., "2.1.05")
- **Dates**: Start and end dates
- **Parent outcome**: Links to higher-level framework
- **Metrics**: Required, Available, Expenditure

**Not included**: External links, project websites, beneficiary data, geographic sub-locations.

## Financial Metric Relationships

The expected ordering is **Required ≥ Available ≥ Spent**, but the source does not consistently satisfy it. Preserve the reported values and disclose anomalies.

| SDG | Required | Available | Spent | Funding Rate | Delivery Rate |
|-----|----------|-----------|-------|--------------|---------------|
| 1 | $3.8B | $2.5B | $1.5B | 65% | 59% |
| 2 | $7.9B | $5.0B | $3.3B | 62% | 67% |
| 3 | $6.3B | $4.6B | $3.5B | 74% | 76% |

- **Funding Rate** = Available / Required (how much secured)
- **Delivery Rate** = Spent / Available (implementation capacity)

## Entity Name Matching

UNINFO uses standard UN abbreviations matching systemchart:
- UNINFO: 65 agencies (UNDP, UNICEF, FAO, WFP, WHO, IOM, etc.)
- Systemchart: 217 entity codes
- Most UNINFO agencies exist with same abbreviations

## Data Size Estimates

| Data Set | Size | Notes |
|----------|------|-------|
| Per-country files (SDGs + projects) | ~9 MB total | 127 files, ~70KB avg |
| Country index (quick lookup) | ~28 KB | uninfo-countries-index.json |
| Per-SDG data (with country breakdowns) | ~236 KB | uninfo-sdgs.json |

### File Structure
```
public/data/
  uninfo-countries/
    AFG.json    # ~50-200KB each
    BRA.json    # Contains: totals, sdgs, projects, framework
    ...
  uninfo-countries-index.json  # Quick lookup (no projects/framework)
  uninfo-sdgs.json             # SDG data with country breakdowns
```

Each country file contains:
- `workspace_id`, `name`, `totals` - Basic info
- `sdgs` - SDG breakdown with financial metrics
- `projects` - All sub-outputs/projects with details
- `framework` - Results Framework hierarchy (SP → OC → OU tree)

## Website Integration Plan

### Sidebar Sections

Each sidebar (country, SDG, entity) will include a **"UN Cooperation Framework Data"** section with:
1. Clear disclaimer that this is different data (link to methodology)
2. Nested bar chart showing Required → Available → Spent
3. Dimension-specific breakdowns

### Country Sidebar (Implemented)
- Overall Required/Available/Spent comparison
- SDG breakdown with funding gaps (unique to UNINFO)
- **Results Framework** - Expandable tree showing Strategic Priorities → Outcomes → Outputs with funding bars
- Top Projects with expandable details
- Link to UNINFO country page
- Link to UNSDG country page

### SDG Sidebar
- Country breakdown with funding gaps
- "Most underfunded countries for this SDG" ranking
- Required/Available/Spent comparison
- Top projects contributing to this SDG

### Entity Sidebar
- Link to entity's projects on UNINFO (if available)
- Skip detailed UNINFO data (CEB already has cross-dimensions)

### Skip: Donor/Contributor Sidebar
- UNINFO "contributing partners" are mostly UN pooled funds
- Not comparable to CEB government donors

### Project Table (Implemented)

Projects are bundled with per-country data files:
- Each country file (~50-200KB) includes SDG breakdown + all projects
- No separate fetch needed - projects load with country data
- Top 5 projects shown initially with "Show all" option
- Projects sorted by required funding (descending)
- Expandable project boxes show description, timeline, outcome

### Results Framework (Implemented)

Displays the logical hierarchy of UN work in each country:
- **Strategic Priorities** (SP) - Top-level goals (2-4 per country)
- **Outcomes** (OC) - High-level results (1-3 per SP)
- **Outputs** (OU) - Specific deliverables (1-6 per Outcome)

Features:
- Expandable tree structure with nested indentation
- Nested funding bars (Required → Available → Spent) at each level
- Code badges extracted from titles (e.g., "1.2.3" shown in UN blue circle)
- Tooltips show full title and detailed funding breakdown
- Uppercase titles converted to title case for readability
- Deduped by framework cycle (keeps latest endDate)

## Future Ideas (Out of Scope)

- **Funding gap map**: World map colored by (Required - Available) per country
- **Delivery rate dashboard**: Which countries/SDGs spend funds well vs poorly
- **Year-over-year trends**: 2022-2024 funding gap changes
- **Project search**: Full-text search across 23K project descriptions

## Recommendations

1. **Add UNINFO as complementary data source** for SDG-country analysis
2. **Show funding gaps** - Highlight underfunded SDGs/countries
3. **Nested bar visualization** - Required (light) → Available (medium) → Spent (dark)
4. **Cross-reference with CEB** - Use UNINFO for SDG-country detail, CEB for global totals
5. **Cache aggressively** - API responses are large and slow
6. **Link to UNINFO pages** - Let users explore full details on uninfo.org
