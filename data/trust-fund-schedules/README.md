# Trust-fund schedule evidence

This directory retains the source evidence and canonical extraction snapshot
for 2017–2024. Pipeline instructions and data definitions are in
[the extraction documentation](../../docs/trust-fund-schedules.md).

## Versioned files

- `raw/schedule-YYYY.pdf`: original source documents, used for extraction and
  page-specific references. Checksums and source URLs are in the manifest.
- `source-manifest.json`: source provenance, retrieval details and SHA-256 hashes.
- `stage1/tables.jsonl`: literal extracted tables, including page and row coordinates.
- `stage1/table-index.csv`: searchable index of those tables.
- `stage2/*.csv`: canonical normalized funds, fund-years, statement facts and
  counterparty flows, consumed by downstream exports.
- `quality-profile.json`: extraction validation results and known source exceptions.
- `crosswalk/*.csv`: entity assignments and unresolved cases.
- `crosswalk/quality-profile.json`: mapping coverage and provenance.

## Local duplicate exports

The per-table CSVs in `stage1/tables/`, nested
`stage2/trust-fund-schedules.json`, and crosswalk JSON duplicate the canonical
tables and remain ignored. The nested Stage 2 JSON alone exceeds 100 MB.
Optional DOCX downloads remain ignored because extraction uses the PDFs.
These files can remain locally and are recreated by the pipeline; deleting
them is unnecessary. Public website JSON exports are tracked in `public/data/`.
