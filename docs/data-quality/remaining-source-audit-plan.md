# Remaining source verification plan

> **Historical document — current CEB policy:** This document retains the findings, source vintage or design proposals of its original investigation. It is not the current CEB transformation contract. See [CEB methodology](../ceb-methodology.md) and the current source register/manifest for active rules and coverage.

Updated 2026-09-24. This plan separates extraction accuracy from source coverage and accounting methodology.

## Peacekeeping assessments (2025/26)

The outstanding inaccessible sample concerns Member State assessments, not the mission budget expenditure/proposal tables. The shipped contributor dataset describes 20 PDF files, 39 statement sections, 11 mission accounts and 193 Member States. Assessments are bills issued to States; they are not proof of cash payment. Ordinary/additional assessments add and prior-period credits subtract.

On 2026-09-24 both the Committee on Contributions prior-year index and the direct MINURSO July 2025 statement returned HTTP 403. Direct requests also returned HTML, not a PDF. This is an access failure, not evidence of an incorrect financial amount. The existing cached extraction and internal reconciliation cannot substitute for an independent source check.

1. Obtain the original PDFs through an accessible official download or from the Committee on Contributions. Record URL, retrieval date, document symbol, mandate/assessment period, PDF signature, file hash and page count. Never accept a 200 HTML response as a PDF.
2. Audit all 20 files and all 39 sections: independently transcribe printed gross/net totals, section sign (assessment or credit), period, and mission. Compare those controls to the extraction before comparing contributor sums.
3. Independently verify Member State rows for the largest five assessments plus rotating small States in every section; cover all 193 States over the audit. Include the United States tax-credit treatment, split mandate periods and the sparse UNMIK credit table. Escalate any discrepancy to a full second extraction of that table.
4. Require every extracted amount to lead to the correct original file/page/row/column. Report verified, discrepancy, and inaccessible separately. Do not classify inaccessible as passed.

## Peacekeeping mission budgets

The immutable financial-data-v1.8 source supplies the detailed mission tables. The portal defaults to expenditure 2024/25. It covers expenditure 2022/23–2024/25, approvals 2023/24–2026/27 and proposals 2024/25–2026/27.

The [supplementary extraction](../../data/peacekeeping-budget-supplement.json) records the support account, the missing MINUSMA drawdown and liquidation amounts, UNSOH, the 2023/24 UNMISS commitment authority, and the 2026/27 approved annex. Each amount retains its source document, physical PDF page, row and column. The exporter checks each stage against the official gross total and applies the separately cited $1,951,000 reduction to UNSOH for 2025/26 when replacing the commitment authority with the final appropriation. The gross charts carry voluntary contributions in kind separately. Account-level and cost-group figures are available where the official consolidated tables supply them. Some accounts lack detailed line items in the release.

The ARWO peacekeeping and support-account rows reconcile to expenditure in 2022/23 and 2023/24 and to approved allocations in 2024/25. The comparison uses the source fiscal period, which ends in the ARWO reporting year. ARWO departmental amounts use a different presentation and remain separately sourced.

Continue to audit the release's detailed mission lines against the original reports. Verify fiscal period, gross versus net amounts, in-kind exclusions, unit multiplier and page links. The annual gross totals do not include the separate financial positions of closed missions or peacekeeping missions funded by the regular budget.

## Honour-roll payment dates

Archive dated official honour-roll snapshots with hashes. Check every exported State/year/date/status against a snapshot; distinguish payment date, source publication date and our retrieval date. Compare consecutive snapshots for additions or revisions. Absence means not listed as fully paid as of that snapshot; it does not establish zero payment or the outstanding balance. Where historical snapshots cannot be obtained, label the date unverified rather than reconstructing it from later lists.

## Trust-fund entity mappings

Review all 157 mappings in an evidence register: fund code, historical fund name, assigned entity, applicable years, source document/page, confidence and reviewer decision. Use audited fund schedules and official administrative mandates; similar names alone are insufficient. Prioritize high-value funds, renamed funds, jointly administered funds and cross-entity arrangements, then finish the full register. Validate unique mappings by effective year, unmapped funds and ambiguous multiple owners. Preserve unresolved ownership explicitly rather than force an assignment.

## Budget discrepancies

Deduplicate the 217 flagged comparisons by original document/table/row/column and funding scope. Classify each as rounding, overlapping/non-additive presentation, missing extraction, or source inconsistency. Retain printed parent totals. Repair extraction only with direct source evidence; record child-sum differences without modifying the printed total. Generated chart groups may sum included rows, and must retain their derived basis.
