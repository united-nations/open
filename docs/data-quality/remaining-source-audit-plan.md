# Remaining source verification plan

Updated 2026-09-24. This plan separates extraction accuracy from source coverage and accounting methodology.

## Peacekeeping assessments (2025/26)

The outstanding inaccessible sample concerns Member State assessments, not the mission budget expenditure/proposal tables. The shipped contributor dataset describes 20 PDF files, 39 statement sections, 11 mission accounts and 193 Member States. Assessments are bills issued to States; they are not proof of cash payment. Ordinary/additional assessments add and prior-period credits subtract.

On 2026-09-24 both the Committee on Contributions prior-year index and the direct MINURSO July 2025 statement returned HTTP 403. Direct requests also returned HTML, not a PDF. This is an access failure, not evidence of an incorrect financial amount. The existing cached extraction and internal reconciliation cannot substitute for an independent source check.

1. Obtain the original PDFs through an accessible official download or from the Committee on Contributions. Record URL, retrieval date, document symbol, mandate/assessment period, PDF signature, file hash and page count. Never accept a 200 HTML response as a PDF.
2. Audit all 20 files and all 39 sections: independently transcribe printed gross/net totals, section sign (assessment or credit), period, and mission. Compare those controls to the extraction before comparing contributor sums.
3. Independently verify Member State rows for the largest five assessments plus rotating small States in every section; cover all 193 States over the audit. Include the United States tax-credit treatment, split mandate periods and the sparse UNMIK credit table. Escalate any discrepancy to a full second extraction of that table.
4. Require every extracted amount to lead to the correct original file/page/row/column. Report verified, discrepancy, and inaccessible separately. Do not classify inaccessible as passed.

## Peacekeeping mission budgets

The immutable financial-data-v1.8 source contains expenditure 2022/23–2024/25, appropriations 2023/24–2025/26 and proposals 2024/25–2026/27. Later source editions supersede earlier observations for the same fiscal year and measure. The portal exports every available stage and defaults to expenditure 2024/25.

The latest proposal lacks UNSOH canonical detail. All stages omit the support account, enterprise items and some closed-mission accounts. Root totals are source-provided sums of included missions, not the complete UN peacekeeping appropriation. Printed mission/class totals stay authoritative even when detail disagrees.

Independently inspect at least one original report per mission/edition and every selected stage column; verify fiscal period, gross versus net amounts, in-kind exclusions, unit multiplier and page links. For overlapping appropriations, reconcile revisions between editions. Expand any failing sample to all rows for that mission. Compare coverage to the official appropriation resolution separately from the arithmetic of this limited corpus.

## Honour-roll payment dates

Archive dated official honour-roll snapshots with hashes. Check every exported State/year/date/status against a snapshot; distinguish payment date, source publication date and our retrieval date. Compare consecutive snapshots for additions or revisions. Absence means not listed as fully paid as of that snapshot; it does not establish zero payment or the outstanding balance. Where historical snapshots cannot be obtained, label the date unverified rather than reconstructing it from later lists.

## Trust-fund entity mappings

Review all 157 mappings in an evidence register: fund code, historical fund name, assigned entity, applicable years, source document/page, confidence and reviewer decision. Use audited fund schedules and official administrative mandates; similar names alone are insufficient. Prioritize high-value funds, renamed funds, jointly administered funds and cross-entity arrangements, then finish the full register. Validate unique mappings by effective year, unmapped funds and ambiguous multiple owners. Preserve unresolved ownership explicitly rather than force an assignment.

## Budget discrepancies

Deduplicate the 217 flagged comparisons by original document/table/row/column and funding scope. Classify each as rounding, overlapping/non-additive presentation, missing extraction, or source inconsistency. Retain printed parent totals. Repair extraction only with direct source evidence; record child-sum differences without modifying the printed total. Generated chart groups may sum included rows, and must retain their derived basis.
