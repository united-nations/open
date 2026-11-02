# Entity identity and reporting-scope audit

Audit findings dated 27 October 2026; consolidated on 2 November 2026 from the
mapping inventory and substantive-findings tables. This is a dated assessment of
the mappings inspected, not a claim that every recommendation is implemented or
that current code still has every issue described. The consolidation changes
documentation only.

## Conclusion

A shared name or code can represent an ordinary alias, a successor institution,
a financial aggregate or a budget reporting scope. Those cases require different
treatment. Ordinary aliases can share an identity; successor histories need
dated names; related scopes must not be merged solely because one office
manages the other body's activities.

The audit examined **165 mapping entries** and recorded **14 substantive cases**.
The inventory spanned `python/utils.py:ENTITY_MAPPING`, Secretariat entity aliases,
overview identity overrides and dated labels,
`python/trust_fund_entity_crosswalk.py:PPB_ENTITY_KEYS`, and the union of PPB
entity-dimension aliases across local editions.

| Inventory classification | Entries | Interpretation |
|---|---:|---|
| Ordinary entity/code alias | 56 | Mainly spelling, formatting or code variants; does not by itself imply a historical successor relationship |
| Substantive mapping flagged for findings | 7 | Requires source and scope interpretation |
| Scope-sensitive alias | 4 | Related reporting objects may cover different activities |
| Dated historical identity | 3 | Date matters to the institution represented |
| Dated budget identity | 4 | Edition-specific reporting label requires temporal context |
| PPB source-dimension alias | 91 | Budget headings may denote programme scope rather than a standalone organization |

These are entry counts across mapping layers, not counts of unique entities or
independent defects. Some of the 14 cases concern several entries or a boundary
check rather than a confirmed bad alias.

## Financial aggregates and managing offices

### UN Secretariat and peacekeeping aggregates

Three related mappings need an explicit distinction:

| Inspected mapping | Finding | Recommended treatment |
|---|---|---|
| `UN` → UN Secretariat | CEB financial reporting scope, not the whole UN system or automatically every Secretariat unit | Retain the aggregate label and its explicit source scope. Independently reported UNEP, UNODC, UN-Habitat and ITC must not be assumed inside it. |
| `UN-DPO` → Peacekeeping Operations | Financial aggregate of peacekeeping operations, not the headquarters Department of Peace Operations | Keep aggregate and department identities distinct. |
| Historical `DPKO` → Peacekeeping Operations | Evidence supports continuity of the historical CEB financial series after relabeling; this does not turn the aggregate into headquarters departmental finances | Preserve the financial lineage with an aggregate-scope label. Exact year-to-year perimeter comparability remains a separate accounting question. |

The UN-hosted [Financing the UN Development System report](https://mptf.undp.org/sites/default/files/documents/2024-09/financing_the_unds_resourcing_the_future.pdf)
states that the former DPKO data series was renamed UN-DPO for consistency after
the 2019 reform. The [Department of Peace Operations description](https://peacekeeping.un.org/en/node/132237)
helps distinguish the directing department from mission finances. The inspected
local [CEB aggregate reference](../../data/references/ceb-aggregate-entities.json)
records the portal's perimeter; a local mapping is not independent proof of
CEB's full source definition. Current handling is specified in
[CEB methodology](../ceb-methodology.md).

### DCO and the Resident Coordinator system

The inspected aliases `RCS` → `DCO` and the PPB crosswalk from DCO to the RC
system can collapse two scopes. The system includes resident coordinators and
their offices as well as the Development Coordination Office. The transfer,
restructuring and renaming of DOCO as DCO in 2019 does not make RCS a former name
for DCO.

The [Resident Coordinator system results framework](https://unsdg.un.org/sites/default/files/2023-10/2022_RCS%20Results%20Framework%202023%20-%20FINAL%20-%20with%20Logo.pdf)
provides the institutional context. Represent office and system separately, or
label the combined reporting scope explicitly when that is what a source funds.

## Successor bodies and predecessor activity

### OSET / ODET

The inspected mapping grouped OSET and earlier activity under ODET. The Envoy's
office was established in 2021 and transitioned into the new Office for Digital
and Emerging Technologies on **1 January 2025**. Digital Agenda fund activity in
2019–2020 predates both offices.

The [official ODET announcement](https://www.un.org/digital-emerging-technologies/content/press-release-new-un-office-digital-and-emerging-technologies)
supports dated institutional identities. A combined lineage series can be useful
if labeled as such; an undifferentiated ODET series would imply the current
office existed in years when only predecessor activity was reported.

### System-wide evaluation activity / SWEO

The inspected history placed earlier SWEO funding activity under the current
office. Official reporting places formal establishment in **2023**; 2019–2022
records instead describe General Trust Fund for Independent System-wide
Evaluations activity.

[DP/FPA/2024/5](https://documents.un.org/api/symbol/access?l=en&s=DP%2FFPA%2F2024%2F5&t=pdf)
is the cited institutional evidence. Keep historical activity distinct from the
office: a recurring local code does not prove the office existed throughout.

### UNSOM / UNTMIS

The inspected 2024 reporting label maps UNSOM to UNTMIS. Resolution 2753 provides
an explicit rename and transition from **1 November 2024**, with a changed
mandate and exit trajectory; see the [official UNTMIS mandate](https://untmis.unmissions.org/en/untmis-mandate).
A lineage series is defensible with dated names. A whole-year 2024 budget label
does not establish that the successor name applied from January.

## Panels and committee support

| Case | Source evidence | Recommended treatment |
|---|---|---|
| Somalia Panel of Experts → `PoE-RES2713` | [Resolution 2713, 1 December 2023](https://main.un.org/securitycouncil/en/content/sres2713-2023) renews and renames the existing panel | Shared identity is supported, with an effective rename date and edition-specific reporting labels. |
| CAR Panel of Experts → `PoE-RES2745` | [Resolution 2745, 30 July 2024](https://digitallibrary.un.org/record/4055582) extends the existing panel's mandate and renames it | Preserve continuity while retaining the July date rather than assuming the new label applied throughout 2024. |
| DPRK Panel of Experts → `SC-RES1718` | The [official panel mandate history](https://main.un.org/securitycouncil/en/sanctions/1718/panel_experts/work_mandate) records the panel's expiry on 30 April 2024; the target budget identity is support to the resolution 1718 committee | Panel and committee support are related but different scopes. Committee-support expenditure after April does not establish continued panel operation. Preserve original and budget identities. |

These cases were found in dated overview reporting labels. A budget mapping can
be appropriate for matching source expenditure without establishing that two
institutional identities are interchangeable everywhere.

## Aliases and terminology that need less intervention

### UNWTO / UN Tourism

The [official announcement of 23 January 2024](https://www.untourism.int/news/unwto-becomes-un-tourism-to-mark-a-new-era-for-global-sector)
describes UNWTO adopting the UN Tourism name and brand. A shared stable identity
is appropriate. Historical display names can be retained where they help users
interpret an older document; the rename does not require inventing a new entity.

### UNLB / UNGSC

The inspected mappings connect UNGSC to UNLB and label UNLB as UNGSC Brindisi.
There is institutional continuity, but the audit did not establish a simple
completed legal rename or two unrelated budget entities.

The [ACABQ statement of 12 May 2022](https://www.un.org/en/ga/fifth/76/statements/150_ABA_PKO_Overview_UNLB_RSCE/C5_76_2r_ST_2022_05_12_Item150_Overview_UNLB_RSCE_Vice-Chair_ACABQ_.pdf)
discusses proposed UNGSC terminology for Brindisi and Valencia and recommends
retaining General Assembly-endorsed nomenclature. UNLB budget reports cover both
sites. Use aliases within their attested budget/location context and distinguish
a both-site budget from a map placement at Brindisi alone.

### UNYO / UN Youth

This was a boundary check rather than an observed predecessor merger. Both names
identify the current Youth Office; inspected overview records start in 2023.
[A/78/949](https://documents.un.org/doc/undoc/gen/n24/189/97/pdf/n2418997.pdf)
distinguishes the Envoy on Youth predecessor and the transition starting in
January 2023. Keep the current-office alias without automatically backfilling
Envoy history. No Envoy-to-Youth mapping was found in the inspected records.

## Opaque legacy identifiers: Burundi envoy

The inspected normalization maps `OSESG-BDI` to `OSESG-FG`, but the local taxonomy
resolves the latter to Burundi. The [official closure notice](https://oseb.unmissions.org/en/news/office-special-envoy-secretary-general-burundi-closes)
dates the Burundi office's closure to **31 May 2021**. No evidence was found that
FG represents a historical rename or denotes the separate Great Lakes office.

Keep the Burundi identity explicit and consider replacing the opaque canonical
code. Later-year balances require investigation; they do not by themselves
establish continued office operation after closure.

## Applying the findings

For a proposed mapping change, identify the source dataset, year, financial
scope and affected amounts first. Use an alias for the same reporting object, a
dated lineage for succession, and an explicit crosswalk for different scopes.
Preserve the source label so a budget heading cannot silently become an
institutional claim.

The cited sources were assessed as strong institutional evidence in the audit.
Confidence in a rename or closure date is not the same as evidence of accounting
perimeter continuity. The audit's original CSV inventory is not needed to read
these findings; no source download or companion script is required.
