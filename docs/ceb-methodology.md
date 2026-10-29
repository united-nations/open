# CEB methodology

The canonical user-facing summary of CEB methodology is [data/ceb-methodology.json](../data/ceb-methodology.json).
The frontend renders this one content source in the methodology section at the
end of every CEB-relevant page and on [About](/about/). Page-specific notes remain
separate from the shared CEB note. Source information and methodology belong to
the page, rather than an individual treemap.

The central note has two explicitly separate parts:

1. All seven **Notes to the Financial Statistics pages** supplied by CEB, including
   the IRMCT contributor-coverage caveat, ITC non-reporting note, Taiwan terminology
   note and Kosovo note. The Taiwan note has the requested bracketed statement
   that terminology on this website has been standardized to **Taiwan Province of China**.
2. A concise **Portal processing and transformations** summary for readers of the
   financial views. It covers the transformations that change interpretation:
   consolidated names and reporting parents, revenue reconciliation, unresolved
   historical financing, expense scope, geographic corrections, SDG coverage and
   historical functions. Implementation details and the complete processing
   contract remain in this document and the detailed references below.

The quoted CEB notes are not silently rewritten to match one downloaded file.
For example, the 2023 IRMCT entity revenue control is available while CEB's
published note excludes its contributor breakdown. The current files contain
nominal $1 entries in the government and category presentations; their presence
does not establish complete contributor detail. Coverage qualifications are
separate from the source quotation.

## Current data contract

- Use the current CEB release for all available historical years. Do not combine
  different vintages to preserve previous headline figures. Current file hashes,
  retrieval information, missing cells and coverage are in
  [public/data/ceb-source.json](../public/data/ceb-source.json); available view
  years are in [public/data/manifest.json](../public/data/manifest.json).
- Preserve downloaded source files and source wording. Parsing and presentation
  mappings do not authorize changing reported amounts or source categories.
- Use CEB classifications without donor-name overrides or inferred categories.
  A contributor may have records in multiple source categories. Keep contributor
  identity, observation category and financing type as separate attributes.
- Reconcile known detail against reported revenue controls, with signed category
  and financing balances. Keep reported named contributors, reported aggregates
  and calculated balances distinguishable and inspectable.
- Preserve unresolved historical financing records without assigning one of the
  four main types by guesswork. Keep their known donor amounts separate from
  already-reconciled instrument totals to avoid counting them twice.
- Keep system expenses CEB-only; Secretariat and UNINFO remain separately sourced.
  Only use cross-dimensions actually reported together by a source.
- Display nominal source USD. CPI adjustment is disabled.

## Detailed implementation references

- [Revenue processing](data-fusion-revenue.md)
- [Expense, SDG, function and geographic processing](data-fusion-expenses.md)
- [Data availability](data-availability.md)
- [Historical legacy-code investigation](research/ceb-legacy-revenue-codes/README.md)

Dated audits, investigations and old content concepts are retained as historical
evidence. They do not supersede the central methodology or current processing
contract. Changes to processing require corresponding changes to the relevant implementation
document. Update the frontend summary when a change affects the meaning or
interpretation of displayed figures; do not turn it into a decision log or an
implementation inventory.
