# Remediation status — 24 September 2026

> **Historical document — current CEB policy:** This document retains the findings, source vintage or design proposals of its original investigation. It is not the current CEB transformation contract. See [CEB methodology](../ceb-methodology.md) and the current source register/manifest for active rules and coverage.

All 21 audit findings have a disposition below. Source limitations are explicitly distinguished from corrected implementation defects. This is a local implementation and verification result, not a deployed-site or comprehensive source certification.

| Finding | Disposition | Evidence |
|---|---|---|
| REV-01 — Known entity revenue replaced by incomplete donor detail | fixed and verified | Independent original-text instrument controls and PAHO/IRMCT regression fixtures. |
| REV-02 — Unattributed donor revenue assigned Other financing | fixed and verified | UNICEF Other control and every entity/year/instrument reconciliation. |
| REV-03 — Legacy R02 core financing defaults to earmarked | fixed and verified | Explicit R02 mapping; unknown codes fail validation. |
| REV-04 — Other financing folded into earmarked trend | fixed and verified | Annual/trend comparisons preserve all four instruments for every named contributor/year. |
| REV-05 — Negative-net contributors omitted from headline | existing fix verified | Existing signed totals retained; browser confirms negative-amount disclosure and access. |
| REV-06 — All contributors trend excludes unattributed rows | fixed and verified | All trend reconciles to every signed annual donor cell; restricted selectors labelled Named. |
| SYS-01 — UNINFO unfiltered-period data labelled 2024 | fixed and verified | All 13 legacy fallback countries have null year and unverified-period disclosure; annual comparisons exclude them. |
| SYS-02 — Shared workspaces repeated as country allocations | fixed and verified | Shared workspace membership exported and disclosed; country comparisons exclude shared totals. |
| SYS-03 — UNINFO values clipped to required funding | fixed and verified | All full and compact bars use the maximum of all three metrics. Haiti project 135479 is browser-verified: Required 9.09334%, Available/Spent 100%. |
| SYS-04 — Goals denies UNINFO while rendering it | fixed and verified | Goals methodology identifies CEB and the separate UNINFO sidebar. |
| SYS-05 — Curaçao malformed source label drops expenditure | fixed and verified | Independent historical Curaçao source-to-country reconciliation passes. |
| SYS-06 — Agency-project rows counted/keyed as unique projects | fixed and verified | Distinct project counts and unique source-occurrence row keys verified across every country file. |
| SYS-07 — Old CEB download links return 404 | source access repaired; geographic vintage retained with disclosed limitation | All nine current official download endpoints return 200; hashes and geographic-vintage differences recorded. Frozen geography retained and revision limit disclosed. |
| SB-01 — Negative Overview entities omitted from Total/search | existing fix verified | Existing signed Overview totals retained; browser confirms negative-amount disclosure for 2023. |
| SB-02 — ARWO reconstruction not a single consolidated audited basis | source limitation disclosed and bridged | Unsupported consolidation claim removed; UNEP bridge explains the mixed-basis difference. Financial totals remain faithful to ARWO. |
| SB-03 — OLA proposed2022 printed component values missing | fixed and verified | OLA four component amounts and citations restored using the evidenced physical table/column year exception. |
| CR-01 — Proposed2025 section24 misses corrected total | fixed and verified | Corrected section control $240,210,200; calculated ancestors updated; source subtotal discrepancy remains explicit. |
| CR-02 — Proposed2024 section33 new budget line omitted | fixed and verified | Printed $3,500,000 future-only line included without inventing historical spending. |
| SC-01 — Trust-fund net totals cite refunds column | fixed and verified | All 18 flagged destinations now cite Total; every contributor/destination amount across all eight years is unchanged. |
| UI-01 — Failed year requests retain values beneath new year | fixed and verified | 503 injection passes for Organizations and Locations; delayed superseded request cannot replace 2024 with 2023. |
| UI-02 — Unavailable 2011/12 funding displayed as $0 | fixed and verified | 2011 Funding shows Unavailable and a no-data message instead of zero. |

## Initial validation (superseded by the follow-up below)

- Python: 56 regression tests pass; 10 source-citation tests pass.
- TypeScript and static production build pass.
- Browser: all 14 routes return 200; PAHO Funding, signed contributor/Overview disclosures, delayed-request ordering, injected year failures, unavailable 2011 funding, COD/BRN/MYS scope disclosures, and the Haiti anomalous funding scale pass. Successful final runs record no JavaScript errors. One earlier repeat emitted an intermittent React hydration warning; it did not recur in the final rerun.
- Lint remains blocked by 13 pre-existing errors and 4 warnings. Baseline lint checks for modified files are recorded separately; no new lint findings remain.
- All nine replacement CEB download URLs return HTTP 200. Every trust-fund contributor/destination amount across eight years is unchanged.
- Existing user edits and the audit stash are preserved. No staging, commit, push or deployment was performed.

## Remaining assurance limits

The newer CEB geographic vintage is not silently adopted: its grain and historical allocations differ. The old snapshot remains explicitly identified pending version reconciliation. UNINFO unfiltered periods and within-workspace country allocations remain unknown and are no longer claimed as verified country-year observations. The Secretariat reconstruction remains mixed-basis, with a documented UNEP bridge. Original-source sampling gaps (including the inaccessible 2025/26 peacekeeping sample, honour-roll dates and unverified fund/entity identities) remain limits of assurance, not passed checks.

**9 October 2026 update:** The CEB 2025 integration supersedes the frozen-geography limitation above and in SYS-07. The portal now uses the complete current CEB historical vintage, selects E06 geographic totals to avoid overlapping components, and preserves revised source allocations. See the [integration review](ceb-2025-review.md) for reconciliation and validation. The separate UNINFO and Secretariat limitations remain applicable.

See [implementation notes](../data-integrity-remediation.md), [Python regressions](../../python/tests/test_audit_remediation.py), and [reproducible validation](validation.md). Detailed original evidence remains in the ignored local archive `audits/2026-09-16/`.

## Follow-up: peacekeeping stages and React checks (2026-09-24)

- Peacekeeping now exposes expenditure, approved appropriations and proposed budgets. Available fiscal years end at 2024/25, 2025/26 and 2026/27 respectively. Default remains expenditure 2024/25. Mission details, tooltips, trend data and source columns follow the selected stage.
- Each stage is exported from its own released source view, with the most recent edition used for overlapping fiscal years. Printed mission/class values are retained; the root is the source's derived sum of included missions. The incomplete 2026/27 proposal and missing/non-applicable lens values are distinguished in scope text.
- All 13 existing lint errors and four warnings have been resolved. Annual sidebar values now derive from initial props or keyed, cancellation-protected requests, and loading/error states no longer copy older years into the selection. Deep-link synchronization and animation state no longer trigger the flagged immediate effect updates; ref updates occur after commit.
- Follow-up validation: 57 Python tests, 10 citation tests, clean lint, TypeScript and static build. Browser evidence is saved in `peacekeeping-stages-browser.json` and the follow-up validation directory. Repeated checks reproduced the hydration issue on contributor pages. Development traces showed generated ID mismatches in contributor selectors and the payment-timeline toggle during initial chart loading. Those controls now mount with their asynchronously loaded data, avoiding hydration of IDs across the changing chart tree. Verification passed across 30 development loads and 70 production loads (14 routes repeated five times), with no hydration or JavaScript errors. Seven peacekeeping-stage cases and eight sidebar-year cases also passed.
- Source-access retest: the 2025/26 MINURSO assessment PDF and prior-year index still return HTTP 403. This is separate from the newly exposed mission budget stages. Independent verification remains open.
- Remaining source checks have a concrete plan in [remaining-source-audit-plan.md](remaining-source-audit-plan.md).
- Changes remain in the local workspace; this follow-up does not commit, push or deploy the combined pre-existing and remediation changes.

## Integration verification (2026-09-25)

The shared UI Sankey and visual-refinement branches were merged and published as
`UN-EOSG-Analytics/ui@510c8022fcf31fc25eb1bb3b450ad8fd630a4eb1`. Open now pins that
fetchable commit. The frozen-lockfile installation, typecheck, lint and production
build pass against it, along with 57 Python regressions and 10 citation checks.

The preserved `pnpm test:browser` suite passes the data-disclosure, signed-total,
UNINFO funding-scale, peacekeeping-stage and sidebar-year checks, followed by 70
page loads without hydration errors. These are local checks of the production
export. Open has not been pushed or deployed as part of this integration.

The audit report, this register and the remaining-source plan are versioned here.
Raw evidence remains ignored; reusable browser checks are in `tests/browser/`
and fresh-checkout instructions are in [validation.md](validation.md).
