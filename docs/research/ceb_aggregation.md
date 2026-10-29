# CEB Data Aggregation: UN vs UN-DPO Entity Codes

> **Historical document — current CEB policy:** This document retains the findings, source vintage or design proposals of its original investigation. It is not the current CEB transformation contract. See [CEB methodology](../ceb-methodology.md) and the current source register/manifest for active rules and coverage.

## Summary

The UN System Chief Executives Board (CEB) uses two separate entity codes for Secretariat-related operations:

- **`UN`** — UN Secretariat (including Special Political Missions)
- **`UN-DPO`** — Peacekeeping Operations aggregate (distinct from the Secretariat Department of Peace Operations)

This separation reflects the fundamentally different funding mechanisms for peacekeeping vs political missions.

## Funding Mechanisms

| Aspect | Peacekeeping (DPO) | Special Political Missions (SPMs) |
|--------|-------------------|----------------------------------|
| **Budget** | Separate peacekeeping budget (~$5.4B/biennium) | Regular UN programme budget (~$640M/year) |
| **Oversight** | Department of Peace Operations (DPO) | Department of Political Affairs (DPPA) |
| **CEB entity code** | `UN-DPO` | Included in `UN` (Secretariat) |
| **Funding type** | Assessed peacekeeping scale | Regular budget assessed contributions |

## Implications for Our Data

### Revenue Data (government-donor-revenue.csv)

The CEB revenue data reports contributions to:
- `UN` = aggregate for entire UN Secretariat (~$6.3B), includes:
  - All Secretariat departments (OCHA, DPPA, DSS, etc.)
  - Special Political Missions (UNAMA, BINUH, UNSOM, etc.)
- `UN-DPO` = peacekeeping operations only (~$6.6B), includes:
  - All peacekeeping missions (MONUSCO, UNMISS, UNIFIL, etc.)

### Our Entity Groupings

Our `entities.json` groups missions under "Peacekeeping Operations and Political Missions" which conflates two different funding streams:

| Mission Type | Examples | CEB Revenue Source |
|--------------|----------|-------------------|
| Peacekeeping Missions (PKM) | MONUSCO, UNMISS, UNIFIL, MINUSCA | `UN-DPO` |
| Special Political Missions (SPM) | UNAMA, BINUH, UNSOM, UNSMIL | `UN` (Secretariat) |

### Matching Challenges

1. **No individual mission revenue**: CEB reports aggregate `UN-DPO`, not per-mission breakdown
2. **SPM included in Secretariat**: Political missions share revenue pool with OCHA, DPPA, etc.
3. **DPO headquarters vs operations**: The Secretariat entity `DPO` (~$130M spending) is just HQ; `UN-DPO` (~$6.6B) covers all peacekeeping operations

## Revenue-Expense Comparison (2023-2024)

| Entity | Revenue (2024) | Spending (2023) | Notes |
|--------|---------------|-----------------|-------|
| `UN-DPO` | $6.64B | $7.23B (CEB) | PKM aggregate |
| PKM missions combined | — | $5.97B | Sum of individual missions |
| `DPO` (Secretariat) | — | $0.13B | HQ only |
| `UN` | $6.33B | — | Secretariat aggregate |

## Separately Reported Secretariat Entities

Some entities have **separate CEB entries** despite being administratively part of the Secretariat:

| Entity | Revenue | Governance | Why Separate? |
|--------|---------|------------|---------------|
| UNEP | $485M | UN Environment Assembly (UNEA) | Own governing body, direct voluntary contributions |
| UNODC | $369M | Commission on Narcotic Drugs (CND) | Intergovernmental commissions, Vienna-based |
| UN-Habitat | $108M | UN-Habitat Assembly + Executive Board | Own governing body, own Foundation |
| ITC | $50M | Joint UNCTAD/WTO governance | Hybrid UN/WTO entity |

### The Dual Nature Explained

The official [UN System Chart](https://sdgs.un.org/sites/default/files/2025-05/un_system_chart.pdf) (Note 6) states:

> **"The secretariats of these organs are part of the United Nations Secretariat."**

This creates a dual classification:

| Aspect | Classification |
|--------|---------------|
| **Governance** | "Funds & Programmes" — GA subsidiary organs with own governing bodies |
| **Administration** | Part of the UN Secretariat — staff, systems, under SG authority |

**In practice:**
1. **Programmatic independence**: Own governing bodies set policy and approve budgets
2. **Administrative integration**: Staff are UN Secretariat staff, use UN HR/finance systems, Executive Directors report to the Secretary-General
3. **Financial reporting**: CEB reports them separately because they receive direct voluntary contributions

### Implications

- Our `entities.json` correctly classifies them as "UN Secretariat" (administrative reality)
- CEB correctly reports them separately (financial/governance autonomy)
- The `UN` aggregate likely excludes these entities to avoid double-counting
- Total Secretariat-related revenue = `UN` ($6.3B) + UNEP + UNODC + UN-Habitat + ITC ≈ $7.3B

## Recommendations

For the revenue treemap:
1. Map `UN-DPO` to a synthetic "Peacekeeping Operations" aggregate entity
2. Keep `UN` as "Other UN Secretariat (incl. Political Missions)" — the remainder after autonomous entities
3. Group UNEP, UNODC, UN-Habitat, ITC under "UN Secretariat" category alongside the `UN` aggregate
4. Note that SPM revenue is included in `UN`, not separately available

## Sources

- [CEB Financial Statistics](https://unsceb.org/financial-statistics)
- [UN Data Standards for system-wide reporting](https://unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data)
- [UN peacekeeping budget 2025-2026](https://news.un.org/en/story/2025/07/1165191) — $5.38B approved
- [Special Political Missions budget](https://digitallibrary.un.org/record/4086140) — $639.8M proposed for 2026
