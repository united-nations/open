# Data integrity remediation — September 2026

The September 16–17 audit contained 21 findings. Its original report and evidence
are summarized in [the audit report](data-quality/audit-2026-09-16.md) and [remediation register](data-quality/remediation-status.md), with raw evidence retained locally under `audits/2026-09-16/`; they describe that historical baseline. Corrections
were implemented against `b126147` plus the existing local changes. The current
regression contract is `python/tests/test_audit_remediation.py`.

## Revenue: controls, attribution and financing

Revenue now reconciles independently to CEB's entity × year × financing-instrument
controls. Named government and non-government observations are retained. From
2021, contributor-type controls add attributed category remainders; a signed
unattributed residual closes each instrument to the authoritative entity control.
An unknown contributor is never automatically classified as Other financing.
Detailed R-subtypes are collapsed to the four instruments for reconciliation
because donor sources do not all preserve the finer subtypes. Unknown financing
codes fail validation; legacy R02 is core/un-earmarked.

The All contributors trend includes unattributed rows and retains Other as a
fourth instrument. Named-government/non-government selections are labelled with
their restricted scope. PAHO 2024 is $1,195,033,314; IRMCT 2023 is $76,239,000;
UNICEF 2020 Other is $246,046,799.78. Signed corrections are preserved. The later
signed-total chart implementation is retained, with negative records accessible
outside the positive-area treemap.

## UNINFO: reporting period, geography and row grain

Country exports and the index carry `year`, `period_status`, `geographic_scope`,
`workspace_countries`, `projects_year` and `framework_year`. The 13 legacy
unfiltered country totals have no verified year. Shared-workspace totals are
explicitly labelled for the entire workspace; they are not divided among its
countries. Unfiltered totals and shared-workspace values are excluded from the
SDG country comparison and ranking. Such comparisons therefore do not sum to the
separate global source aggregate.

Historical project/framework queries and the global SDG snapshot did not retain
query-period evidence. Their period is now explicitly unverified; the country
SDG flag cannot establish the period of independently fetched project/framework
responses. Future fetches use only the requested year and record query provenance;
no unfiltered fallback is substituted. No attempt is made to invent corrected
2024 amounts for the affected snapshots.

Projects are counted by distinct project ID. Agency/source occurrences have
unique row keys, including repeated agency/project pairs, without deleting or
adding financial observations. Funding bars share a maximum across all three
reported metrics; anomalies and negative adjustments are disclosed. Required ≥
Available ≥ Spent is an expectation, not an invariant of the source.

## Budget source exceptions and reconciliation

The immutable programme-budget release is unchanged. The exporter applies narrow
source-evidenced exceptions in `python/budget_source_exceptions.py`:

- OLA proposed 2022: Table 8.32 in A/76/6 (Sect.8), PDF p54, prints an erroneous
  2021 estimate heading. Adjacent tables and Table 8.34 p57 establish 2022. Only
  that physical table/column is rebound; the original header remains in citations.
  The four component amounts are $1,795,700, $1,147,700, $23,714,400 and $903,300.
- Proposed 2025 section 24: Corr.1 Annex III p9 explicitly gives $240,210,200.
  This replaces the superseded section control and updates calculated ancestors.
  The separate printed programme subtotal of $198,776,300 remains, with its
  $861,200 discrepancy against corrected children explicitly recorded.
- Proposed 2024 section 33: Table 33.1 p4 supplies the new $3,500,000 conferencing
  line under ICT. It is added to the proposed hierarchy without inventing earlier
  spending; the section control remains $30,985,800.

Approved/proposed trees now retain their own parent/child reconciliation metadata.
Missing values are not marked complete. Other mismatches remain reconciliation
candidates; they are not automatically replaced by child sums. The audit's 217
flagged comparisons were not 217 independently established numerical defects.

## Trust-fund citation columns

The parser now detects embedded transitions from voluntary four-column tables to
three-column contribution/refund/total tables and internal-transfer tables even
when the section heading is omitted. Totals are consequently bound to the printed
Total column. All 18 flagged destinations were checked; every contributor × fund
amount across all eight exported years remains unchanged. Extraction validation
passes, retaining its documented source exceptions.

## Secretariat accounting basis

The ARWO view remains a mixed-source reconstruction. It does not establish
consolidated IPSAS expense or elimination of internal transfers. For UNEP 2023:

| Component | USD |
|---|---:|
| Audited total expense | 696,642,000 |
| Less audited regular-budget expense | −24,701,000 |
| Non-regular-budget residual retained in ARWO | 671,941,000 |
| Add PPB-based regular expense | 20,859,739 |
| ARWO reconstruction | 692,800,739 |
| Difference from audited total | −3,841,261 |

The non-regular-budget residual is not necessarily pure voluntary spending.
Methodology and agent guidance now state these limitations. Changing the entire
portal to a consolidated accounting basis would require a separate source bridge
for every entity and year; no unsupported total adjustment has been made.

## Geography, source access and availability

The malformed Curaçao label is normalized centrally, restoring $834,112.63 to
historical country exports. All-geography exports preserve the same signed source
totals, merging normalized country identities rather than inventing allocations.
CEB downloads now use `https://unsceb.org/assets/data/FS/`. Fetching writes a
hashed candidate snapshot and does not overwrite the source vintage in use.

The recovered newer geographic source has different grain and allocations.
The published frozen input is retained pending a source-version reconciliation;
this is disclosed in flow metadata and the Locations methodology. Live source
access, hashes and annual vintage comparisons are saved in
`audits/2026-09-16/remediation-source-checks.json`.

Year loading checks response status, ignores superseded requests, and binds
visible values to the loaded year. Failed requests cannot relabel earlier figures.
Unsupported financing years show Unavailable rather than zero. The manifest
matches exact dataset prefixes, avoiding nonexistent legacy aliases for 2026/27.

## Verification limits

Regression tests establish source/export arithmetic, declared scope, source
exceptions and citation binding. Browser fault injection verifies year failures
and unavailable data. These do not independently certify every underlying
financial statement, honour-roll date, or fund/entity identity. The original
inaccessible 2025/26 peacekeeping source sample and incompletely sampled identity
mappings remain assurance gaps. Deployment verification is separate from local
build verification; no deployment is performed by the remediation scripts.
