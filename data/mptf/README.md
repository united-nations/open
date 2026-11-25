# MPTF Office portfolio

The public MPTF Gateway supplies a separate portfolio dataset. It does not
replace CEB financial statistics and is not joined to Secretariat trust-fund
accounts. The `pooledFunds` feature is enabled in the `preview` and `full`
site profiles and disabled in `public`.

## Refresh

```bash
uv run python python/28-export_mptf.py --fetch --years 2025
uv run python python/99-generate_manifest.py
```

Without `--fetch`, the exporter replays retained responses. `--years` selects
years to refresh; all complete retained years are revalidated and exported,
including the fund registry and trends. Initial retained coverage is 2016–2025.
The most recent incomplete calendar year is not part of this initial release.

Fund introductions retain the complete descriptive text from the current MPTF profile
metadata, not historical financial observations. The sidebar uses the shared
expandable-text component for long descriptions; text is not truncated in the
export. Donation prompts are excluded. Refresh them separately with
`uv run python python/mptf_fund_descriptions.py --fetch`, then replay step 28.
The tracked `fund-profile-metadata.json` retains the exact source heading and
meta-description content before text cleanup. `fund-description-sources.json`
records source URLs, retrieval dates, original HTML hashes and canonical metadata
hashes. This compact evidence supports offline replay from a clean checkout.
Full compressed HTML in `fund-pages/` is an optional ignored local cache, not a
build or replay dependency. An unavailable profile does not receive an invented purpose;
the sidebar retains its reported category and Gateway link. Failed refreshes
do not remove a previously retained introduction.

The Gateway uses unversioned public JSON endpoints, discovered through its
own data-explorer scripts. There is no assumed API support guarantee. Raw
responses and `source-manifest.json` retain exact requests, retrieval times,
SHA-256 hashes and row counts. The importer checks complete pagination,
acknowledgement of year filters, fund identities, printed aggregate controls,
per-fund contributor and recipient reconciliation, and cross-endpoint totals.
All selected sources validate before browser-facing files are rewritten.
The annual raw financial JSON is tracked because it preserves the observations
and independent controls needed to reproduce the financial reconciliation.

## Measures and scope

- Deposits are cash received, before separately reported signed donor refunds.
  The main deposits measure excludes observations explicitly classified by
  the source as `MULTILATERAL_FEEDER_FUND`. Feeder deposits and the gross control
  remain in the export and fund sidebar. Do not classify transfers from names.
- Net transfers are annual transfers less participating-organization refunds.
  Both net transfers and reported expenditure are **unconsolidated**: some
  recipients are themselves funds. Do not add incoming and outgoing measures,
  or add these amounts to CEB, UNINFO or Secretariat accounts.
- Expenditure uses participating organizations' own accounting bases and can
  be revised. Annual flow observations do not establish year-end fund balances
  or comparable delivery rates. Certified amounts remain on the Gateway.
- Fund categories, typology and geographic scope come from the actual
  `FUND_CATEGORY`, `TYPOLOGY` and `geo_description` recipient dimensions.
  Metadata absent in a year is not borrowed from later years. The registry
  uses the latest observed source name for navigation.
- The registry is the union of fund, contributor and recipient identities;
  refund-only funds remain represented. The literal source placeholder `-`
  retains its amount but has no fabricated fund page. Zero, negative and
  unknown observations remain distinct.
- Source agency codes remain separate, including NGO/UNDP and direct UNDP.
  Country rows are explicitly summed by source fund and geographic identifier;
  regional/global rows remain at their reported scope. There is no donor-to-
  project or donor-to-country allocation.
- The Office portfolio includes source-labelled single-agency, national and
  Secretariat funds alongside inter-agency funds and joint programmes. It is
  not a complete inventory of all UN pooled funding. OCHA reports CERF/CBPF
  data through its own Pooled Funds Data Hub.

## Identity links

Reuse `python/utils.py` normalization, with only reviewed source-specific
aliases in `identity-aliases.json`. Contributor links require exact membership
in that year's donor export; organization links require actual same-year CEB
financial reporting identities. A department in a CEB aggregate does not
automatically become a separately linkable System organization. Unmatched
source names remain visible without invented internal links.

## Outputs

- `public/data/pooled-funds.json`: fund registry and annual metric series.
- `public/data/pooled-funds-{year}.json`: annual figures with contributor,
  source agency and location detail, plus independent source controls.
- `public/data/manifest.json`: available years, regenerated after export.

Authoritative entry points: [Gateway](https://mptf.undp.org/),
[contributions](https://mptf.undp.org/analyze-all-contributions),
[recipients](https://mptf.undp.org/analyze-all-projects), and
[definitions](https://mptf.undp.org/page/un-pooled-funding-key-concepts-and-terms).
