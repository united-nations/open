# Tracking Member State Contributions Across the UN System

_ChatGPT DeepResearch report, Jan 31, 2025_

## Core concepts and why the data is fragmented

Member State funding to the UN system falls into two fundamentally different categories that create most downstream tracking problems:

**Assessed (mandatory) contributions** are legal obligations set by a governing body and apportioned by a scale (a formula-based allocation across members). For the UN Secretariat’s *regular budget*, the UN Financial Regulations and Rules treat assessed contributions as due and payable within a defined window after the Secretary‑General’s request, and they define how payments are credited and how arrears accrue. citeturn53view0

**Voluntary contributions** are discretionary and (especially in the UN development and humanitarian ecosystem) often arrive as earmarked grants or trust-fund deposits, sometimes with pledges that do not immediately translate into cash. System-wide reporting standards exist, but they typically rely on audited financial statements and therefore trail reality. citeturn28view0turn57view0

Because these streams are governed by different rules, many “contribution” datasets are not actually about the same thing. You will see at least five non-equivalent financial notions across portals: **assessment/voted**, **commitment/pledge**, **invoice/letter of assessment**, **cash receipt/deposit**, and **recognized revenue/expenditure (financial statements)**. The UN system’s own statistical reporting explicitly notes that it aggregates organization-reported financial statement data and does not net out inter‑entity transfers (a major source of double counting for system-wide voluntary flows). citeturn28view0turn57view0

## Official UN and UN-system portals and systems

The UN system has strong “official but lagged” transparency at *system level* and uneven “near-real-time” transparency for pooled funds and some operational funding streams.

### Comparative map of major systems

| Portal / system | Operator | Best for tracking | Regular budget assessed? | Voluntary? | Typical granularity | Update frequency (as stated) | Practical limitations |
|---|---|---|---|---|---|---|---|
| Financial Statistics Database (UN system) | UN System Chief Executives Board (CEB) secretariat | UN‑system totals: assessed vs voluntary core vs voluntary non‑core; donor type; entity totals | Yes (system-wide) | Yes | Primarily annual, entity-level; some donor-country breakdowns | Collected annually; charts updated annually; validated against audited financial statements “wherever possible” citeturn28view0turn57view0 | Not real-time; relies on financial statements; explicitly **no adjustment for inter‑agency transfers** citeturn28view0turn57view0 |
| UN system statistical report to GA (A/79/494 etc.) | CEB → Secretary‑General → General Assembly | Official UN-system statistical reporting (incl. assessed collections and arrears by organization) | Yes | Yes | Report tables, plus Excel extracts hosted by CEB | Annual/biennial reporting cycles; data in the 2024 report cover 2017–2023 citeturn57view0turn57view1 | Time lag (report focuses through 2023); tables with large volumes moved to downloadable spreadsheets, not an API-first design citeturn57view0turn57view1 |
| open.un.org | UN Secretariat transparency gateway (powered by UN data standards / CEB feeds) | Public-facing dashboards for UN system-wide financials and UN Secretariat spend/implementation views | Indirectly (via system-wide data) | Yes (system-wide categories) | Dashboards and exports (varies by module) | Not “real-time” (system-wide modules rely on audited/statistical sources); positioned as a transparency gateway citeturn5view0turn28view0 | Inherits the annual-cycle and transfer/double-counting constraints of the underlying system-wide financial statistics citeturn28view0turn57view0 |
| Committee on Contributions / UN GA contributions pages (assessments, status, honour roll) | UN Secretariat + GA web presence | **Assessed contributions and payment status** for UN regular budget & related assessed accounts | Yes (UN) | Limited | Country-level lists (paid in full, dates); references to monthly status reporting | The honour roll explicitly ties “paid in full” to the 30‑day rule (Financial Regulation 3.5) citeturn51search2turn53view0 | Public pages are not an API; separation between “who paid in full early” vs full arrears tables; some content may be posted in PDFs/HTML with scraping friction citeturn51search2turn53view0 |
| UN pooled funds gateway (MPTF Office) | Multi‑Partner Trust Fund Office (Administrative Agent) | **Pooled funds**: commitments vs deposits; transaction-level voucher/receivables | No (not regular budget) | Yes | Fund → contributor → commitment/deposit; transaction details via “Track Transactions” | “Real-time data from the MPTF Office General Ledger” (with a separate transaction layer); interim expenditure optionally reported; final year-end expenditures by April 30 the following year citeturn33view1turn32search1 | Covers only funds administered by the MPTF Office; distinguishes ledger vs transaction records and warns of discrepancies after corrections citeturn33view1 |
| OCHA Financial Tracking Service (FTS) | UN OCHA | Humanitarian funding flows (reported pledges/contributions/funding received) | No | Yes | Contribution-level records (as reported) | Described as providing “up-to-date information”; processing time depends on data quality; relies on partner reporting templates citeturn36view0 | Reporting is voluntary/operationally driven; verification and classification can create delays; not designed as a comprehensive system-wide donor registry citeturn36view0 |
| IATI Registry + Datastore | International Aid Transparency Initiative | Transaction/budget/activity data for publishers (incl. many UN entities and donors) | No (mostly) | Yes | Activity + transaction-level (where published) | Datastore Search: up to date within 24 hours of publishing to the registry citeturn46view3turn46view0 | Coverage is inconsistent (not all UN entities publish full transaction data; not all donors publish to IATI); donor attribution may be partial for core/assessed-like receipts citeturn46view0turn46view3 |

### What this implies about “time lag”

If you need **system-wide comparability**, you are effectively choosing the CEB financial statistics framework, which is explicitly annual-cycle and audit-aligned. citeturn28view0turn57view0 If you need **freshness**, you are pushed toward (a) assessed-contribution status products (GA contributions outputs), (b) pooled fund ledgers (MPTF Office), and (c) operational reporting streams (FTS, IATI)—each of which is narrower in scope or less standardized. citeturn33view1turn36view0turn46view3

## How regular budget assessments are calculated

### UN Secretariat regular budget scale of assessments

The UN Secretariat’s regular budget scale is set through a **multi-step methodology** advised by the entity["organization","UN Committee on Contributions","ga subsidiary body"] and adopted by the General Assembly for multi-year periods. The Committee’s latest report (A/80/11) provides the current methodological backbone and parameter values. citeturn6view0turn7view1turn7view2

At a high level, the procedure measures “capacity to pay” using **Gross National Income (GNI)** as the base, with adjustments for (a) exchange-rate distortions, (b) external debt burden, and (c) low per-capita income, and then applies floors/ceilings and smoothing across base periods. citeturn7view1turn7view2turn7view3

### Formula components in a usable tabular view

| Component | What it does | Core inputs | Simplified mechanics (conceptual) | Key parameters explicitly stated |
|---|---|---|---|---|
| Base income measure | Establishes comparable national income | GNI series (national accounts), population; exchange rates | Convert GNI to a common unit using market exchange rates and (where required) a price-adjusted conversion approach to reduce volatility distortions | Price-adjusted exchange rates depend on market exchange rates and purchasing power parity factors; methodology documented in the Committee’s annex citeturn7view1turn7view2 |
| Debt-burden adjustment | Reduces assessed share for eligible countries with significant external debt | External debt stock, GNI | Adjusts the income measure downward based on an external-debt burden factor, subject to eligibility criteria | Uses a **12.5% “debt stock” parameter**; eligibility tied to a per-capita income threshold (explicitly specified for the methodology period) citeturn7view1turn7view2 |
| Low per-capita income adjustment (LPCIA) | Reduces shares for countries below a graduated per-capita income benchmark | GNI per capita | Applies a graduated reduction to the assessable income measure for countries below the benchmark | Uses an **80% “gradient”** and explicit benchmark mechanics in the annex citeturn7view2turn7view3 |
| Floors and ceilings | Prevents extreme minimum/maximum shares | Resulting calculated rate | Clamp rates to minimum/maximum; apply special least-developed-country cap | Minimum rate **0.001%**; LDC maximum **0.01%**; global maximum (ceiling) **22%** citeturn7view3turn7view4 |
| Smoothing across base periods | Reduces year-to-year discontinuities | Two “machine scales” based on different base periods | Computes scales with different base periods (e.g., three-year vs six-year income bases) and averages | The annex specifies the averaging step across the two machine scales citeturn7view4 |

### Do similar formulas apply outside the UN Secretariat PPB framework?

“Similar” is only partly true:

* **Many assessed UN system entities anchor to the UN regular budget scale**, then adjust arithmetically for different membership and entity-specific financial rules. citeturn43view0turn39view1  
  * Example: entity["organization","World Health Organization","un specialized agency"] explicitly uses the UN scale approved for 2025–2027, adjusted for membership differences, to formulate assessed contributions (with scenarios reflecting additional entity-specific policy choices). citeturn43view0turn43view1turn42view0  
  * Example: entity["organization","UNESCO","un specialized agency"] assesses Member States’ regular budget contributions using its own governing-body decisions and financial rules, while maintaining an explicit relationship to UN/UNESCO scale alignment (and it publishes detailed tables and payment rules). citeturn40view0turn40view1turn39view1  
* **Some specialized agencies use separate formulas or modified scales**, even if they reference UN scale principles. A recent entity["organization","Congressional Research Service","us legislative agency"] summary explicitly notes that “some agencies follow the scale of assessment for the UN regular budget, while others use their own formulas.” citeturn48view0turn47view0  
* **Peacekeeping assessments** are explicitly based on modifications to the regular budget scale and apply differentiated rates (e.g., higher shares for permanent Security Council members). citeturn48view0turn47view0  

In practice, this means you cannot treat “assessed share” as a single universal field across UN system entities; it is entity- and governance-specific even when it is derived from a common UN anchor. citeturn48view0turn43view0

## Expected versus actual payments for assessed contributions

### What is publicly knowable “in advance”

For the UN Secretariat regular budget:

* **Expected percentage shares** are knowable for the full scale period once the General Assembly adopts the scale methodology and rates (multi-year). citeturn6view0turn7view4  
* **Expected dollar amounts** require at least: (a) the adopted appropriations for the annual budget period, and (b) the application of assessment offsets/credits and funds like the Tax Equalization Fund. The UN Financial Regulations describe how assessments are constructed and adjusted (e.g., revenue offsets and tax equalization adjustments) and how the Secretary‑General requests payment. citeturn53view0turn52view0  

For near-real-time “anticipation,” the friction is not the formula—it’s that the *budget base* and *adjustment components* are political/administrative decisions and accounting processes that do not run in real time.

One useful operational note from Fifth Committee proceedings: the Secretariat explicitly provides **estimates** to Member States interested in advance payments, implying that forecasted assessments can be produced administratively before formal cash receipt. citeturn31view0

### How payments, dates, and arrears are recorded

The UN Financial Regulations and Rules are unambiguous on *what should be trackable*:

* Requests for payment are transmitted after the General Assembly adopts/revises the programme budget, and contributions are considered due within 30 days of receipt of that communication (or the first day of the year, whichever is later). citeturn53view0turn52view0  
* Unpaid balances become “one year in arrears” as of 1 January of the following year. citeturn53view0turn52view0  
* Payments are credited in a defined order (first to the Working Capital Fund, then to contributions due in the order assessed). citeturn52view0  

Separately from these rules, UN administrative reporting practice shows the existence of operational ledgers and recurring publication products. A historical but explicit UN administrative description of the Contributions Service says it produces: monthly status reports, monthly lists of unpaid contributions, bimonthly summaries for largest contributors, daily reports of contributions received, and end‑of‑year warning letters related to Article 19 risk. citeturn50view0turn49view0

### Flow from assessment to cash and how discrepancies emerge

```mermaid
flowchart LR
  A[GA adopts budget & scale] --> B[SG transmits assessment communications]
  B --> C[Member State budget authorization \n(parliament/treasury rules)]
  C --> D[Payment instruction executed]
  D --> E[UN receives cash \n(records receipt; allocates per rules)]
  E --> F[Status reporting \n(paid, partial, arrears)]
  F --> G[Financial statements \n(audited; annual)]
  C -.->|delay/withhold/cap| F
  D -.->|partial payment or FX issues| E
  E -.->|timing vs recognition differences| G
```

The most operationally important “discrepancy class” is: **assessed amount ≠ cash received by date**. Recent Fifth Committee proceedings show the Secretariat tracking collection rates intra‑year (e.g., the share of assessed contributions received by a cut‑off date), unpaid assessment totals, and the number of Member States paying in full by specified dates—precisely because this timing drives liquidity. citeturn31view0

## Voluntary contributions: reporting, structured data, and timeliness

### System-wide classification exists, but it is annual-cycle

The CEB statistical framework classifies revenues into four common types: assessed contributions, voluntary core (unearmarked), voluntary non-core (earmarked), and revenue from other activities. citeturn56view0turn57view0 This is analytically powerful but structurally late: the 2024 UN-system statistical report focuses on data through 2023. citeturn57view0turn56view0

### Near-real-time voluntary funding is feasible only for specific channels

There are two channels where “near real time” is explicitly supported by the systems themselves:

**Pooled funds administered by the MPTF Office.** The MPTF gateway states that its contributions view draws **real-time general ledger data**, and it distinguishes this from transaction-level systems (payment vouchers, accounts receivable) that can show transaction date and donor currency. citeturn33view1turn32search1 This is unusually good transparency for a subset of voluntary finance (multi‑partner trust funds and related pooled mechanisms).

**IATI publishers with frequent updates.** IATI’s Datastore Search is designed to be up to date within 24 hours of publishing to the IATI Registry. citeturn46view3 The UNDP publisher record in the IATI Registry shows an explicit “IATI data updated” timestamp and a machine-download link, illustrating how this becomes operationally consumable. citeturn46view0

For humanitarian finance, UN OCHA’s FTS is described operationally as a centralized platform for “up‑to‑date” humanitarian funding information, but with a curation/verification workflow and variable processing time depending on the quality of submitted data. citeturn36view0

### How “voluntary contributions” appear in public documents of UN entities

A key point for database design: many entities publish **member-by-member assessment and payment rules** in their own governance context, sometimes with more frequent status updates than the UN Secretariat web outputs.

For example, UNESCO’s 2026 assessed contributions technical brochure states:
* contributions are due within 30 days of communication,  
* status of contributions is published weekly,  
* and it publishes detailed per‑Member tables (including split-currency assessment rules) in a single structured document. citeturn40view0turn40view1turn39view1

For WHO, assessed contributions calculations are explicitly based on the UN scale and adapted for WHO membership, and the document includes member-by-member tables for scenarios. citeturn43view0turn43view2turn42view0

This pattern repeats across the system: there is no single “UN-wide” ledger for voluntary flows; instead, your best structured sources depend on the financing instrument (pooled fund vs agency grant vs humanitarian flow). citeturn33view1turn36view0turn57view0

## National budget approvals versus actual payments and the feasibility of an integrated database

### Why national approvals and UN receipts diverge

The gap between **parliamentary authorization/appropriation** and **cash disbursement** is not a rounding error; it is structurally baked into many systems. The most concretely documented example is the United States:

A recent CRS brief explains that U.S. assessed and voluntary funding to the UN system is appropriated through several accounts (including *Contributions to International Organizations* for regular-budget dues and *Contributions for International Peacekeeping Activities* for peacekeeping assessments), while the executive branch often has discretion in allocations across entities within broader accounts. citeturn48view1turn47view0 It also documents reasons the U.S. accumulates arrears, including legislative restrictions, fiscal-year mismatches, and deferred payment practices. citeturn48view1turn47view0

Critically, it also notes a systematic “authorization vs obligation” mismatch in peacekeeping: the U.S. peacekeeping assessment can exceed the U.S. statutory/policy cap (example: assessment above 26% with a 25% cap), generating predictable arrears even when budgets are appropriated. citeturn48view0turn47view0

This “approved ≠ paid” pattern generalizes beyond the U.S. whenever:
* governments appropriate aggregated envelopes rather than entity-specific lines,  
* cash management delays payments,  
* foreign policy conditions trigger withholdings, or  
* exchange-rate and multi-currency payments cause accounting timing differences. citeturn52view0turn48view1

### Public data availability and scraping feasibility for national processes

For the U.S., systematic collection is realistically feasible because legislative and spending metadata are programmatically accessible:

* entity["organization","Congress.gov","us legislative portal"] provides an API and explicitly documents offsite data options. citeturn59view2  
* entity["organization","GovInfo","gpo platform"] provides an API and bulk data repository (including structured XML for bill status and bill text for modern Congresses) and actively positions itself as developer infrastructure. citeturn59view1turn59view2  

For other Member States, feasibility depends on whether the state publishes:
1) machine-readable appropriations and budget execution, and  
2) reliable identifiers mapping appropriations to multilateral recipients.

In many cases, you can scrape parliamentary documents, but **the binding constraint becomes classification**, not text extraction: budget lines often encode “international organizations” or “multilateral cooperation” without consistent recipient-level identifiers.

### Is a structured, up-to-date integrated database possible?

**Yes, but only if you accept a hybrid architecture and uneven freshness.** The limiting factor is not compute or scraping—it is the absence of a single authoritative crosswalk between: (a) UN assessment obligations, (b) Member State budget authorizations, (c) Member State disbursement execution, and (d) UN cash receipts.

A realistic integrated design would require four source layers:

1) **Assessed obligations layer (expected):** scale-of-assessments rates + adopted budget bases + rule-based adjustments (TEF, revenue offsets). For the UN Secretariat core rules, regulation-level logic and due dates are explicit. citeturn53view0turn52view0turn7view4  
2) **Assessed payment-status layer (observed):** UN-published status products (honour rolls, monthly status reporting) and/or official documents and meeting records that publish collection metrics and unpaid assessment totals. citeturn51search2turn31view0turn50view0  
3) **Voluntary finance layer (observed):** pooled fund ledgers (MPTF), humanitarian reporting (FTS), structured aid activity systems (IATI), and entity-level disclosures. citeturn33view1turn36view0turn46view3turn57view0  
4) **National authorization/execution layer (member-state-specific):** parliamentary appropriations and budget execution. For the U.S., the legislative data infrastructure is robust enough to automate collection of bill text/status and correlate appropriations structures over time. citeturn59view2turn59view1turn48view1  

### Main obstacles you cannot “engineer away”

* **Data fragmentation by design:** the UN system statistical framework aggregates across 43 entities and explicitly keeps transfers unadjusted; transaction-level truth lives in entity-ledgers and is not centralized. citeturn28view0turn57view0  
* **Non-standard semantics:** “pledge,” “commitment,” “deposit,” and “revenue” are not interchangeable and often coexist in the same funding instrument (explicitly noted in the MPTF ledger vs transaction distinction). citeturn33view1  
* **Time lags in authoritative comparability:** audit alignment is the price of comparability (CEB annual collection and validation). citeturn28view0turn57view0  
* **Identifier gaps:** Member State budget systems usually do not carry consistent recipient identifiers that match UN entity names or donor-recipient codes—especially for core multilateral contributions. (The U.S. case is already complex despite strong data infrastructure.) citeturn48view1turn47view0  

### Concrete methods that are worth using anyway

For a “best-possible” integrated dataset, the practical approach is:

* Use **CEB Financial Statistics** as the system-wide reconciled backbone (annual, comparable). citeturn28view0turn57view0  
* Attach **fresh voluntary finance** via MPTF for pooled funds and via IATI for publishers that update frequently (tagged with timeliness metadata). citeturn33view1turn46view3turn46view0  
* Attach **assessed payment timing** via GA contribution status/honour roll outputs and Fifth Committee financial situation records for intra-year liquidity signals. citeturn51search2turn31view0  
* For Member-State national layers (starting with the U.S.), build automated legislative ingestion using the Congress.gov API and GovInfo bulk data, then map appropriations accounts (e.g., CIO/CIPA/IO&P style constructs) to UN assessed vs voluntary categories rather than forcing an entity-level mapping where it does not exist. citeturn59view2turn59view1turn48view1  

## Key portals and primary references

```text
UN-system financial statistics (CEB):
- https://unsceb.org/financial-statistics

UN-system statistical report to the General Assembly (example: A/79/494 PDF):
- https://unsceb.org/sites/default/files/2024-10/A.79.494%20Budgetary%20and%20Financial%20Situation%20of%20UN%20system%20organizations.pdf

open.un.org (UN transparency gateway):
- https://open.un.org

UN Secretariat financial rules (ST/SGB/2013/4 copy with Regulation 3.5, 3.6 etc.):
- https://www.wider.unu.edu/sites/default/files/Procurement/PDF/UN-financial-regulations-and-rules-2013.pdf

UN scale of assessments methodology (A/80/11 annexes):
- https://documents.un.org/access.nsf/get?DS=A%2F80%2F11&Lang=E&OpenAgent=

MPTF Office pooled funds transparency (real-time general ledger for contributions):
- https://mptf.undp.org/analyze-all-contributions

OCHA FTS documentation (operational description; link to FTS):
- https://humanitarian.atlassian.net/wiki/spaces/imtoolbox/pages/2359263233/Financial+Tracking+Service+FTS

IATI (timeliness and tools):
- https://iatistandard.org/en/news/iati-technical-update-september-2022/
- https://iatiregistry.org/organization/undp?_country_limit=0&_filetype_limit=0&_license_id_limit=0&filetype=Organisation&publisher_source_type=primary_source

US parliamentary example (CRS brief, Dec 2025):
- https://www.congress.gov/crs_external_products/IF/PDF/IF10354/IF10354.43.pdf

US legislative data scraping infrastructure:
- https://www.congress.gov/help/using-data-offsite
- https://www.govinfo.gov/developers
```

