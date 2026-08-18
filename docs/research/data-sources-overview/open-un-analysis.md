# UN Financial Data: A Complete Guide to open.un.org

## Executive Summary

The UN Transparency Portal at **open.un.org** presents financial data from two fundamentally different sources:

| Section | Data Source | Total (2023) | Entities |
|---------|-------------|--------------|----------|
| **UN System Financials** | CEB Financial Statistics | $67.4B | 43 organizations |
| **UN Secretariat Financials** | UN Secretariat Annual Report | $14.8B | 148 departments/offices |

**Key Finding:** These are not the same data reformatted—they use different methodologies, different classifications, and different levels of granularity.

### Critical Numbers

| Comparison | CEB Data | Audited Statements | Difference |
|------------|----------|-------------------|------------|
| UN Secretariat 2022 | $7.277B | $7.71B (Vol I) | **$433M (6%)** |
| UN-DPO 2022 | $7.091B | ~$7.0-7.2B (Vol II) | Minimal |
| **Combined** | **$14.37B** | **$14.8B** | ~$400M (3%) |

The 6% methodology gap at the Secretariat level represents real differences in how expenses are calculated and classified.

---

## Part 1: Understanding open.un.org Architecture

### What open.un.org Actually Is

open.un.org is a **visualization gateway**, not a data producer. It displays data from upstream sources:

```
UN Entities → Primary Sources → open.un.org (dashboards)
     │              │                   │
     │              │                   └── Visualization layer
     │              │
     │              ├── CEB (43 entities aggregated)
     │              └── UN Secretariat Annual Report (148 entities detailed)
     │
     └── Audited Financial Statements (IPSAS-compliant)
```

### The Two Sections Explained

| Aspect | UN System Financials | UN Secretariat Financials |
|--------|---------------------|---------------------------|
| **Stated Source** | "CEB financial statistics" | "UN Secretariat Annual Report" |
| **Actual Source** | CEB CSV files directly | CEB (UN+DPO) + organizational enrichment |
| **Scope** | 43 UN system organizations | UN Secretariat + Peacekeeping combined |
| **Classification** | CEB Data Cube (SDG, Function, Geography) | GA Priority Areas + 148 entities |
| **Adds to CEB?** | ❌ No (pure visualization) | ✅ Yes (entity breakdown, priority mapping) |

---

## Part 2: UN System Data (CEB)

### Data Source

The UN System Chief Executives Board for Coordination (CEB) collects and publishes system-wide financial statistics.

**Collection Process:**
1. 43 UN entities submit financial data annually
2. CEB Secretariat validates against audited statements
3. Data standardized to UN Data Cube framework
4. Published as downloadable CSV files

### Available CEB Data Files

| Dataset | Description | URL |
|---------|-------------|-----|
| revenue.csv | Total revenue by entity | [Download](https://unsceb.org/sites/default/files/statistic_files/Financial/revenue.csv) |
| expenses_sub_agency.csv | Expenses by entity and function | [Download](https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sub_agency.csv) |
| revenue_government_donors.csv | Revenue by member state | [Download](https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_government_donors.csv) |
| expenses_by_country_region_sub_agency.csv | Expenses by geography | [Download](https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_by_country_region_sub_agency.csv) |
| expenses_sdgs.csv | Expenses by SDG | [Download](https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sdgs.csv) |

**All files:** [unsceb.org/data-download](https://unsceb.org/data-download)

### UN Data Cube Framework (Since 2019)

The CEB data follows a 7-dimensional standard:

| Dimension | Description | Status |
|-----------|-------------|--------|
| **UN Entity** | Which organization | ✅ Complete (43 entities) |
| **UN System Function** | Development, Humanitarian, Peace Ops, Global Agenda | ✅ Complete |
| **Geographic Location** | Country/region of spending | ✅ Complete |
| **Financing Instruments** | Assessed, voluntary core, earmarked, other | ✅ Complete |
| **Sustainable Development Goals** | SDG alignment | ⚠️ 85% coverage |
| **Revenue by Contributor** | Donor classification | ✅ Complete |
| **Gender Equality Marker** | Gender impact classification | 🔜 Mandatory Jan 2026 |

### Data Characteristics

- **Currency:** All values in USD
- **Update Frequency:** Annual (mid-year for previous year)
- **Data Lag:** 12-18 months
- **Coverage:** 2016-present (full Data Cube); historical back to 2000
- **Validation:** Against entity audited statements

### What open.un.org Adds to CEB Data

**Answer: Nothing.**

The UN System Financials section uses CEB data with:
- Same entity codes
- Same function categories
- Same SDG mapping
- Same geographic breakdown

open.un.org adds only visualization (charts, filters, download buttons).

---

## Part 3: UN Secretariat Data

### Data Source

The UN Secretariat Financials section uses a **different source**:

> "Based on the UN Secretariat Annual Report, sourced from data published in the UN Secretariat Programme Budget and audited financial statements"
> — open.un.org About page

### Source Documents

#### Programme Budget (Prospective)

The approved financial plan for the coming year.

| Document | Description |
|----------|-------------|
| A/80/6 (Sect. 1-36) | Individual section fascicles |
| A/80/7 | ACABQ advisory report |
| **A/RES/80/XXX** | Final appropriation resolution |

**2026 Budget:** $3.45 billion

#### Audited Financial Statements (Retrospective)

Official IPSAS-compliant statements of actual expenditure.

| Volume | Coverage | 2022 Expenses |
|--------|----------|---------------|
| **Vol I (A/78/5)** | Secretariat (excl. peacekeeping, IRMCT, UN-Habitat, UNEP) | $7.71B |
| **Vol II** | Peacekeeping operations | ~$7.0B |
| Vol III | International Residual Mechanism | Separate |
| Vol IV | UN-Habitat | Separate |
| Vol V | UNEP | Separate |

### What open.un.org Adds for Secretariat

**Answer: Significant enrichment.**

| Classification | In CEB? | Added by open.un.org? |
|----------------|---------|----------------------|
| 148 sub-entity breakdown | ❌ (only "UN", "UN-DPO") | ✅ Yes |
| GA Priority Area mapping | ❌ | ✅ Yes |
| Programme Budget alignment | ❌ | ✅ Yes |

The 148 organizational entities (departments, offices, commissions, missions) come from internal Secretariat sources, not CEB CSVs.

---

## Part 4: The Methodology Gap

### Quantified Difference: CEB vs. Audited Statements

| Source | 2022 Expenses |
|--------|---------------|
| CEB "UN" entity | $7.277B |
| Audited Financial Statements Vol I | $7.71B |
| **Difference** | **$433 million (5.9%)** |

This is a **real methodological gap**, not a rounding error.

### CEB "UN" 2022 Breakdown by Function

| Function | Amount |
|----------|--------|
| Humanitarian Assistance | $2.887B |
| Global Agenda and Specialised Assistance | $1.624B |
| Development Assistance | $1.419B |
| Peace Operations | $1.347B |
| **Total** | **$7.277B** |

### Possible Causes of the $433M Gap

1. **IPSAS Adjustments:** Audited statements include depreciation, pension adjustments, actuarial gains/losses that CEB may not capture
2. **Entity Boundaries:** CEB's "UN" classification may exclude certain funds/programs included in Vol I
3. **Accrual Timing:** Different cutoff dates for expense recognition
4. **Consolidation:** Treatment of inter-fund transfers and eliminations

### The "Same Numbers" Paradox

Despite the methodology gap at component level, the aggregate totals nearly match:

| Source | 2023 Expenses |
|--------|---------------|
| CEB (UN + UN-DPO combined) | $14.87B |
| open.un.org Secretariat section | $14.8B |
| **Difference** | ~$70M (<0.5%) |

**Explanation:** The component-level gaps (Vol I vs. CEB "UN") are offset when peacekeeping is added, suggesting both sources ultimately derive from the same audited statements but process them differently.

---

## Part 5: Inter-Entity Flows and Double-Counting

### The Double-Counting Risk

CEB explicitly states:
> "Revenue and expenses amounts reflect data as reported by organizations in their respective financial statements, **without adjustments for revenue and/or expenses associated with transfers of funding between UN organizations**."

### Quantified Inter-Agency Flows (2023)

| Flow Type | Amount | % of Total |
|-----------|--------|------------|
| Total UN system revenue | $67.6B | 100% |
| Inter-agency pooled fund contributions | $2.8B | 4.1% |
| Transfers to implementing entities | ~$2.5B | 3.7% |

**Double-counting bound:** Maximum ~4% of total figures

### Secretariat-Specific Flows

- **Secretariat as recipient:** ~$500M annually from pooled funds
- **Secretariat as source:** Support account funds to peacekeeping entities

---

## Part 6: Real-Time and Near-Real-Time Data

### The Timeliness Problem

| Data Source | Lag Time |
|-------------|----------|
| CEB Financial Statistics | 12-18 months |
| Audited Financial Statements | 6-12 months |
| Programme Budget | Available immediately (prospective) |

### Faster Data Sources

| Source | Coverage | Update Speed | URL |
|--------|----------|--------------|-----|
| **FTS** | Humanitarian only | Real-time | [fts.unocha.org](https://fts.unocha.org) |
| **MPTFO** | Pooled funds | Near real-time | [mptf.undp.org](https://mptf.undp.org) |
| **IATI** | Activity-level (varies) | Monthly | [iatistandard.org](https://iatistandard.org) |
| **OECD CRS** | All ODA | 6-12 months | [stats.oecd.org](https://stats.oecd.org) |

### IATI Coverage by UN Entity

| Entity | Activities | Update Frequency |
|--------|------------|------------------|
| UNDP | 16,571 | Regular |
| UNICEF | 17,004 | Regular |
| UNHCR | 1,085 | Monthly |
| WFP | ~1,500 | Regular |
| WHO | ~2,000 | Quarterly |

---

## Part 7: Data Extraction Feasibility

### Source Difficulty Assessment

| Source | Format | Extraction Difficulty |
|--------|--------|----------------------|
| CEB CSVs | Structured | ✅ Trivial (already CSV) |
| IATI XML | Structured | ✅ Trivial (standard XML) |
| FTS API | JSON | ✅ Trivial (REST API) |
| Programme Budget PDFs | Tabular in PDF | ⚠️ Moderate-High |
| Financial Statements PDFs | Complex tables | ⚠️ High |

### PDF Extraction Approach

```python
import pdfplumber

with pdfplumber.open("A_80_5_Vol_I.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        # Process tabular data
```

**Challenges:**
- Multi-page tables with headers on each page
- Merged cells and complex formatting
- Footnotes embedded in tables

**Recommended:** AI-assisted extraction (Claude, GPT-4V) for complex layouts

---

## Part 8: Key Contacts and Governance

### CEB Secretariat Structure

```
┌─────────────────────────────────────────┐
│     Chief Executives Board (CEB)        │
│     Chair: UN Secretary-General         │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼───────────┐   ┌───────▼───────────┐
│     HLCP      │   │      HLCM         │
│  (Programmes) │   │   (Management)    │
│   NY-based    │   │   Geneva-based    │
└───────────────┘   └───────┬───────────┘
                            │
                      ┌─────▼────┐
                      │   FBN    │
                      │ Finance  │
                      │ & Budget │
                      └──────────┘
```

### Key Personnel

| Role | Person | Location |
|------|--------|----------|
| Inter-Agency Adviser, Finance & Budget | Laura Gallacher | CEB Secretariat Geneva |
| Secretary, HLCM | Remo Lalli | CEB Secretariat Geneva |
| Director/Secretary of CEB | Maaike Jansen | CEB Secretariat NY |

### Data Harmonization Initiatives

| Initiative | Status | Key Feature |
|------------|--------|-------------|
| Data Cube Strategy 2022-2025 | Year 3 | 85% SDG coverage |
| CEB-IATI-OECD Harmonization | In progress | Unified dataset |
| Gender Equality Marker | Mandatory Jan 2026 | New dimension |

---

## Part 9: Document Reference

### 2025 Budget Documents

| Symbol | Title |
|--------|-------|
| A/79/6 (Sect. 1-36) | Individual section fascicles |
| A/79/7 | ACABQ first report |
| A/79/652 | Fifth Committee report |
| **A/RES/79/259 A-C** | **Final appropriation ($3.72B)** |

### 2026 Budget Documents

| Symbol | Title |
|--------|-------|
| A/80/6 (all sections) | Secretary-General's proposed budget |
| A/80/7 | ACABQ first report |
| A/80/400 | UN80 revised estimates |
| **A/RES/80/XXX** | **Final appropriation (pending)** |

### Key URLs

| Resource | URL |
|----------|-----|
| CEB Financial Statistics | [unsceb.org/financial-statistics](https://unsceb.org/financial-statistics) |
| CEB Data Download | [unsceb.org/data-download](https://unsceb.org/data-download) |
| UN Board of Auditors | [un.org/en/auditors/board/auditors-reports.shtml](https://www.un.org/en/auditors/board/auditors-reports.shtml) |
| Fifth Committee Documents | [un.org/en/ga/fifth/](https://www.un.org/en/ga/fifth/) |
| Financing UN Report | [financingun.report](https://financingun.report) |
| IATI Dashboard | [dashboard.iatistandard.org](https://dashboard.iatistandard.org) |
| OCHA FTS | [fts.unocha.org](https://fts.unocha.org) |

---

## Appendix A: Complete CEB Entity List

The 43 entities reporting to CEB as of 2024:

**Programmes and Funds:**
UNDP, UNICEF, UNFPA, WFP, UNHCR, UN-Habitat, UNEP, UNODC, UN Women, UNCTAD, UNOPS, UNRWA

**Specialized Agencies:**
FAO, ICAO, IFAD, ILO, IMO, ITU, UNESCO, UNIDO, UNWTO, UPU, WHO, WIPO, WMO

**Related Organizations:**
IAEA, IOM, ITC, OPCW, WTO

**UN Secretariat:**
UN (Secretariat), UN-DPO (Peacekeeping)

**Other:**
CTBTO, ICC, ISA, ITLOS, UNAIDS, UNCCD, UNHCHR

---

## Appendix B: Comparison Summary

### Question: Does open.un.org add anything to CEB data?

| Section | Answer | Details |
|---------|--------|---------|
| **UN System Financials** | ❌ No | Same data, same classifications, just visualized |
| **UN Secretariat Financials** | ✅ Yes | Adds 148 entity breakdown, GA priority areas |

### Question: What's the methodology difference between CEB and Secretariat data?

| Aspect | CEB (UN System) | Secretariat Section |
|--------|-----------------|---------------------|
| Source | CEB entity self-reporting | UN Annual Report + audited statements |
| Classification | Function (Dev, Humanitarian, Peace, Global) | GA Priority Areas |
| Entities | 43 organizations | 148 departments/offices |
| Granularity | Entity-aggregated | Sub-entity detail |

### Question: How big is the methodology gap?

| Level | Gap |
|-------|-----|
| UN Secretariat only (CEB vs. Vol I) | **$433M (6%)** |
| Combined Secretariat + DPO | ~$70M (<0.5%) |

---

_Analysis by Claude-Opus-4.5, Jan 31, 2026_
