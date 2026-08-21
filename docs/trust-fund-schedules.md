# Schedule of Individual Trust Funds extraction

**Status:** production extraction, validation, and audited-entity crosswalk
implemented; compact frontend exports and UI integration remain deferred.

The pipeline retrieves the English annual *Schedule of Individual Trust Funds*
records discovered through the UN Digital Library. The 2020 document is absent
from that exact-title search, so it is registered from its
[official Documents System landing page](https://docs.un.org/en/%28DMSPC%2FOPPFB%29%20FINANCIAL%20STATEMENTS%20FOR%20THE%20YEAR%20ENDED%2031%20DECEMBER%202020).
The pipeline also attempts the Documents API DOCX endpoint and uses the PDFs
consistently for table extraction.

## Run it

From the repository root:

```bash
uv sync
uv run python python/14-extract_trust_fund_schedules.py
```

To rerun against already retrieved source files without network access:

```bash
uv run python python/14-extract_trust_fund_schedules.py --no-download
```

Build the entity crosswalk after Stage 2 exists:

```bash
uv run python python/15-build_trust_fund_entity_crosswalk.py
```

Use `--years 2023 2024` for a subset. The default output directory is
`data/trust-fund-schedules/`; source PDFs and generated outputs are reproducible
and gitignored.

## Outputs and grain

- `source-manifest.json`: one row per annual source, including source catalogue,
  optional Digital Library record ID, symbol, source URLs, local path, byte
  size, and SHA-256.
- `stage1/tables.jsonl` and `stage1/tables/*.csv`: literal physical table cells.
  Each table records its page, schedule number, canonical fund identity, column
  bands, and source row coordinates.
- `stage2/funds.csv`: one row per three-character trust-fund code.
- `stage2/fund-years.csv`: one row per calendar year and trust-fund code.
- `stage2/statement-facts.csv`: long-form statement facts by fund, period,
  statement, section, and line item.
- `stage2/counterparty-flows.csv`: contributor, receivable, transfer, adjustment,
  and printed-total rows. `is_total` must be excluded when aggregating named
  counterparties.
- `stage2/trust-fund-schedules.json`: the same logical model nested by fund and
  annual period.
- `quality-profile.json`: validation gates, source exceptions, warnings, and
  per-year extraction counts.
- `crosswalk/trust-fund-entity-crosswalk.csv` and `.json`: one row per fund
  code, with audited entity, historical priority/section evidence, match method,
  confidence, and optional PPB entity ID.
- `crosswalk/unresolved-review.csv`: funds deliberately excluded from entity
  aggregation pending authoritative review.
- `crosswalk/quality-profile.json`: mapping cardinality, value-weighted coverage,
  unresolved cases, section changes, and known limitations.

All monetary values are integer United States dollars. A printed dash is stored
as zero with a separate `*_reported_as_dash` flag. Negative parenthesized values
remain negative. Source page, table, row, and reported text are retained for
audit and manual comparison.

## Validation policy

Stage 2 is written only if all blocking gates pass:

1. each base schedule resolves to one canonical fund identity;
2. each fund-year has exactly one financial-position and one
   financial-performance table;
3. normalized statement keys are unique and the position/performance equations
   reconcile;
4. each counterparty row reconciles its components to its printed total, subject
   only to explicit source-layout exceptions;
5. each financial-performance voluntary-contribution amount reconciles to a
   printed contribution-schedule total.

`--allow-validation-failures` is available only for parser diagnosis. It writes
stage 2 but still exits non-zero. Normal downstream runs should never use it.

The current full-corpus run finds 157 fund codes, 1,118 fund-years, and 4,511
literal tables across 2017–2024. The exact-title Digital Library search does not
return the 2020 schedule, but the official Documents System serves its PDF. The
pipeline records 2020 as a Documents-only source rather than synthesizing it or
pretending it has a Digital Library record ID.

The Documents endpoint is sensitive to URL construction: the slash in the
`DMSPC/OPPFB` pseudo-symbol must remain unescaped. With that corrected, DOCX is
available for the 2017 source but not the other seven; the manifest preserves
every attempted URL and response. PDF remains the extraction format so that all
years use one consistent parser and validation path.

The quality report preserves one known source inconsistency: in fund `PDF`'s
2022 financial position, printed total assets less printed total liabilities is
$124,041,540, while printed total net assets is $124,131,540. The $90,000 source
difference is not silently corrected.

## Entity crosswalk policy and limitations

The old Secretariat expense extract stores the trust-fund label in `NOTE` and
assigns each observed label to one `ENTITY` and one `PRIORITY_AREA`. The
crosswalk accepts presentation-only normalized name matches and the reviewed
aliases in `data/trust-fund-entity-crosswalk-review.csv`; it never auto-accepts
a fuzzy match. Its expected grain is exactly one row per schedule fund code.

The mapping is one-way, not one-to-one: a mapped fund has one audited entity in
the 2019–2023 extract, while an entity commonly has many funds. Section is not
used as the entity key because three historical fund labels move between
sections over those five years. All observed parts and sections remain in the
output as audit evidence.

The old site's procedure for assigning fund names to entities was not
published, so this is a reproducible reconstruction of observed assignments,
not an official UN crosswalk. Seven fund codes are left unresolved rather than
assigned from institutional guesswork. The reviewed CSV records candidates and
reasons for manual verification. One accepted mapping, the CERF loan component
(`CLR`) to OCHA, is medium confidence because the old extract includes CERF but
does not itemize the dormant loan component separately; it is marked
`relation_type=inferred` rather than `name_match`.

Annual expense patterns are retained as an independent diagnostic, not as a
join rule. The old extract does not exactly reproduce every schedule expense:
it contains rounding and larger legacy adjustments. This prevents a false
claim that the reconstructed name bridge is also an accounting reconciliation.

PPB entity IDs are attached when the audited entity has a stable match in the
local PPB entity dimension. Missing PPB IDs are expected for missions, envoys,
pooled funds, residual mechanisms, and other entities outside the PPB
dimension; this does not invalidate their audited-entity mapping.

Finally, the relationship is organizational attribution only. It does not show
that a donor financed a particular entity expense or subprogramme in the same
year. Schedule amounts are gross fund accounts with transfers and must not be
added to PPB extrabudgetary expenditure or consolidated Secretariat totals.

## Suggested manual checks

- DDN, 2023: total expenses should be **$1,482,068,475**; the contribution
  schedule spans PDF pages 308–309 and totals **$1,643,872,511**.
- CER, 2023: the final contribution total is printed without a `Total` label;
  it should be retained as **$251,048,887** with source coordinates.
- QGA, 2017–2019: verify the older horizontal statement layout, especially
  leading digit groups and the split between current and prior periods.
- CAF/AHA/CCR continuation pages: verify they remain attached to those funds and
  do not create the false codes EOH/TUM/WHP.
- HCB, 2020: its unnumbered contribution page should remain attached to HCB and
  total **$402,562**.
- CLO/JTA/HBP, 2020: verify the split contribution labels and the HBP transfer
  row with **$214,000**, **($25,867)**, and **$188,133**.
- Review every entry in `known_source_exceptions`, `flow_arithmetic_exceptions`,
  and `warnings` before approving a new source vintage.

Run the focused parser tests with:

```bash
uv run python -m unittest discover -s python/tests
```
