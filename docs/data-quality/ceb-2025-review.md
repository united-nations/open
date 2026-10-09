# CEB 2025 integration review

The portal now uses the complete CEB publication downloaded on 9 October 2026, including its revised historical records. Organizations, Contributors and Locations offer 2025. Goals remain at 2024 because CEB has not published 2025 SDG records in this download. The changes are prepared locally; they have not been deployed.

## Source and reconciliation

Nine files from [CEB Financial Statistics](https://www.unsceb.org/statistics/financial-statistics/) are preserved byte for byte in `data/ceb/raw/`. The generated [source provenance](../../public/data/ceb-source.json) records download URLs, SHA-256 hashes, coverage, missing cells and differences between CEB's revenue presentations. Re-running the pipeline on unchanged bytes retains the retrieval date.

| Check | Result |
| --- | --- |
| 2025 revenue | $62,970,982,927.21 |
| 2025 expenses | $64,396,743,592.99 |
| 2025 reporting agencies | 47; ITC did not report |
| Contributor totals versus revenue controls, 2013–2025 | Reconcile in every year |
| Historical revenue headline totals versus previous portal snapshot | Unchanged for 2013–2024 |
| Geographic exports versus published geographic totals, 2010–2025 | Under $0.10 difference per year from output rounding |
| Raw files versus recorded hashes | All nine match |

Historical donor attribution and geographic allocation can change even when the revenue headline is unchanged. We adopt the current publication across all available years rather than retaining a mixture of source vintages. Country/geographic coverage now includes 2010–2025; revenue exports retain their established 2013 start.

## Missing amounts and unallocated balances

A blank amount means the source does not give a number. It is not treated as zero, and the pipeline does not guess the donor's contribution. If an organization has a known total of 100 and named contributions of 70, the remaining 30 appears in Other/Unattributed. This preserves the known total without claiming to know who provided the balance.

There are five blank numeric cells in four downloaded files: UNDP/Austria 2019 in both government donor presentations; UNRWA 2024 revenue; and WFP 2023 and UNRWA 2024 contributor-type data. These blanks also existed in the previous raw snapshot; the earlier cleaning stage silently turned them into zeros. The updated cleaning stage preserves them.

For a missing revenue control, a complete independent detailed CEB presentation supplies the control. Other revenue controls retain the published summary classification. Missing contributor-type amounts remain unknown; the overall revenue balance supplies an unattributed remainder without inventing a category value. Known amounts from Secretariat reporting units are assigned to their reported parent only when the unit has no standalone control for that year.

Balances can be negative where reported detail exceeds its control. These signed corrections remain visible rather than being clamped to zero. In 2025 the net explicit Unattributed balance is approximately −$5.62 million; it is a reconciliation balance, not a measure of missing donor funding. Existing contributor-type Other categories remain distinct from this balance.

## Other consequential changes

- Geographic data now includes E06 totals and E06A/B/C components. Only E06 totals enter geographic exports; summing components together with totals would double-count expenses. The geographic source differs from the expense backbone by about $1.14 in 2025; its published allocations are preserved.
- SDG data contains both actual expenses (`EXP`) and budget records (`BUD`/`BUG`). Only actual expenses now feed Goals. Reported 2024 actuals total $51.51 billion. This is a meaningful correction to the previous mixed total, and SDG coverage remains incomplete. We do not create a remainder from a comparison of datasets with different scopes.
- `rev_name` describes the financing instrument, not donor identity. Fewer named non-government donors mean less attribution detail; contributor-type amounts remain available. No missing names are reconstructed.
- Unmatched or multi-country geographic labels retain their money and source label rather than being dropped or assigned to an arbitrary country. They do not imply a known single-country allocation.
- ITC's 2025 sidebar explicitly reports unavailable data. Entity links can open known organizations absent from the current treemap. SDG and UNINFO sidebars use their independent available years and avoid requests for nonexistent 2025 files.
- Secretariat expense fusion remains disabled in the current configuration. UNINFO and Secretariat source downloads were not refreshed as part of this change.

## Reproducibility and validation

The normalization, missing-value handling, source selection, reporting-parent mapping and reconciliation rules live in the pipeline, not in manually edited output. Download a candidate with `uv run python/02-fetch_ceb_data.py --fetch-snapshot`, review it, and promote it with `uv run python/02-fetch_ceb_data.py --snapshot <directory>`. Running step 02 without arguments revalidates the existing raw files. Then run the existing dependent CEB stages: 03, 05, 06, 07, 09, 19, 20 and 99. Stage 99 updates the manifest from the actual exported files.

Validation includes 64 Python regression tests, 10 budget source-citation tests, TypeScript checking, lint, a production static build and browser review. The added regression checks cover blanks, independent controls, signed remainders, parent mappings, E06 selection, SDG actuals and dataset-specific availability. Browser checks cover 2025 defaults, unavailable ITC/SDG data, independent UNINFO coverage, missing JSON requests and existing portal behavior.

Local detailed evidence is under ignored `audits/ceb-2025/`, including `integration-review.json`, the frozen download and test/build logs. Browser evidence is under `audits/browser/`. The linked shared UI build also required React aliases relative to the Turbopack workspace root; that configuration fix is included.
