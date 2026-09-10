# ARWO expenditure extension

The latest consolidated workbook reproduces all 1,739 historical financial rows from `data/un-secretariat-expenses.csv`, counting repeated rows and ignoring order. Comparison keys are priority, entity, reporting year, financial year, amount, funding source and reference. It does not reproduce every descriptive field.

- Three notes differ only in trailing quote escaping.
- Two 2023 UNOG voluntary rows move from section 1 to section 29E: Local Support Services ($2,990,651) and Library Endowment Fund (−$1,521).
- Historical CSV and previously generated years are preserved, including their existing section assignments.

## New reporting years

| Year | Rows | Expenditure (USD) |
|---|---:|---:|
| 2024 | 365 | 14,527,960,692.00 |
| 2025 | 352 | 13,682,358,567.34 |

Use `ARWO_2019-2025.xlsx`, sheet `Data_Raw_19-25`, once. Do not append cumulative workbooks to one another or add source tabs to their consolidated sheet. The 2024 workbook has cents for that year's amounts; the later consolidated sheet rounds them to dollars (net difference $4.17). The selected latest sheet is consistent with the historical CSV's integer precision; 2025 retains source cents. Negative adjustments are retained: 36 rows in 2024 and 13 in 2025. No duplicate complete rows occur in the new years. Existing historical duplicates are preserved, not deduplicated.

`python/10-extract_arwo_expenses.py` verifies historical financial rows before writing the two annual CSVs. Its private audit records workbook/baseline hashes and descriptive differences. `python/secretariat_expenses.py` appends only non-overlapping annual extracts; step 11 builds overview/audited trees, step 17 exports classifications, and step 99 updates available years. The CEB fusion script and separate programme-budget-document datasets are not changed.

## Classification additions

| Code | Portal group | Basis |
|---|---|---|
| UNTMIS | Special political missions | Successor to UNSOM in Somalia |
| MENUB | Special political missions | Historical Burundi electoral observation mission |
| OPCW-UN | Special political missions | Historical Syria mission code; exact mission/mechanism expansion is not asserted |
| UNOCI | Peacekeeping operations | Historical Côte d’Ivoire operation; later trust-fund residual |
| IIMP-SYRIA | Secretariat | Human-rights institution, workbook section 24 |
| ODPP | Secretariat | System Chart: Office of Data Protection and Privacy |
| Focal Point | Secretariat | Non-field sanctions mechanism, consistent with existing cluster-II grouping |
| POE-IRAN | Secretariat | Non-field sanctions panel, same convention |
| PESG-SUDAN | Secretariat | Non-field personal envoy, same convention |

The portal's SPM grouping is a **field-placement convention**, not the full official SPM budget classification: sanctions panels and non-field envoys are currently retained under Secretariat. This extension preserves that pre-existing treatment rather than reclassifying historical data. ODET already resolves through the existing mappings and needs no new classification. Map coordinates for added historical missions are approximate country placements, not deployment headquarters or evidence of current operation.

Sources: [DPPA mission list](https://dppa.un.org/en/special-political-missions), [Security Council political mission history](https://main.un.org/securitycouncil/en/content/repertoire/political-missions-and-offices), [OPCW-UN mission history](https://opcw.unmissions.org/en), [UNOCI history](https://onuci.unmissions.org/en), and the local System Chart reference for ODPP.

New other-assessed references are classified from the workbook's source tabs: mission accounts A/79/788 and A/80/643; support accounts A/79/680 and A/80/631; residual mechanism A/80/505 (A/79/555 already present). Support-account spending stays with departments. Mission account totals plus the remaining programme tree reconcile to the source totals. Calendar reporting years and the source's fiscal-year labels remain distinct.

This is a reconciliation of supplied workbooks, not an independent audit of the underlying financial statements. Annual-report context links on the new outputs do not claim the internal source workbook is downloadable there.
