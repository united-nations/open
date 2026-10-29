# Concept

> **Historical document — current CEB policy:** This document retains the findings, source vintage or design proposals of its original investigation. It is not the current CEB transformation contract. See [CEB methodology](ceb-methodology.md) and the current source register/manifest for active rules and coverage.

Concept for content of new open.un.org website (see [historical content](./content-old.md)):

- Welcome text: "Welcome to the Transparency Gateway – The gateway at open.un.org is designed to facilitate access to transparency information from across the UN System and the UN Secretariat."
- Who is contributing?
  - Image: [family + UN logo + GA](public/images/banners/hero-banner-homepage.png)
  - Treemap: Level 1 – Contributor Type, Level 2 – Contributor; colours: Revenue Type
  - Areachart/Linechart: Year x [Contributor Type / Contributor / Revenue Type]
  - Sidebar:
    - List: Revenue Type
    - Barchart/Treemap: Entities; colour: Revenue Type
    - Area chart: Year x Revenue Type
- Which organizations are funded?
  - Image: [peacekeeper](public/images/banners/hero-banner-secretariat-expenses.png)
  - Toggle: Revenue / Expenses
  - Treemap: Level 1 – Systemchart Group, Level 1.5 (Secretariat only) – Priority Area; Level 2 – Entity; colours: Revenue Type
  - Areachart/Linechart: Year x [Systemchart Group / Entity]
  - Sidebar:
    - Description text
    - Links from open.un.org data
    - Links and data from Systemchart
    - List: Revenue Type
    - Barchart/Treemap: Contributors; colour: Revenue Type
    - Area chart: Year x Revenue Type (with Revenue / Expenses toggle)
- Where are funds spent?
  - Image: [girl/boy + conference with SDG](public/images/banners/hero-banner-system-revenue.png)
  - World map: Country (either as area fill or as circles)
  - Linechart: Year x [Region / Country]
  - Sidebar:
    - Link to country page
    - Barchart/Treemap: Entities
- Which goals are funds spent towards?
  - Image: [child/grandma + SDGs](public/images/banners/hero-banner-system-expenses.png)
  - Toggle: show goals / show expenses per goal
  - Treemap: Level 1 – SDG, Level 2 – Entity
  - Linechart: Year x SDG
  - Sidebar:
    - SDG definition
    - links to unsdg.org, uninfo.org, etc
    - Barchart/Treemap: Entities
- Background
  - Methodology (expandable) [=footnotes]
  - UN Financial Data Standards (expandable)
  - UN Funding Compact (expandable)
- Guterres quote and image
- Further resources
  - systemchart.un.org
  - CEB
  - results.un.org
  - unsdg.org
  - uninfo.org
  - mandates.un.org

For each treemap, sidebar: select year (synchronized across page)

Trends:
- Contributors
  - Contributor (Hierarchy of non/gov type; contributor)
  - Revenue Type (no select)
- Entities
  - Revenue vs Expenses (Hierarchy of all; System Group; Entity)
  - Sidebar:
    - compare SDGs for given entity
    - compare countries for given entity
    - compare contributors (hierarchy)
    - compare revenue type
- Countries
  - Spending (Hierarchy of region; country)
  - Sidebar: compare entities for given country (Hierarchy of all; System Group; Entity)
- SDGs
  - ~~Spending (select SDGs)~~
  - ~~Sidebar: compare entities for given SDG (Hierarchy of all; System Group; Entity)~~
  - historical data for SDGs is not good, drop timeline chart here
