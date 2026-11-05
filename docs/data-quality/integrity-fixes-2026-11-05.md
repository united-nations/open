# Data-integrity fixes and adversarial review

This change addresses five demonstrated problems from the portal integrity
review. Raw snapshots and source amounts are unchanged.

| Issue | Correction | Reproduced impact |
| --- | --- | --- |
| Competing country parent regions | Preserve signed amounts by every source region/entity; classify merged countries as unresolved rather than retaining the first parent. | Ukraine 2022 retains Europe $2,158,018,977.27 and Africa $267,861 without displaying its entire $2,158,286,838.27 under Africa. All 16 geographic exports retain their previous country/entity amounts. |
| Framework display codes treated as identities | Deduplicate by stable source ID; reject contradictory duplicate observations and orphaned children. | Argentina retains all 12 outcomes, restoring 9 outcome records containing $358,273,806 reported expenditure. Parent and child amounts overlap and must not be added. |
| Unclassified UNINFO resources dropped | Retain the reported null-ID group as `unclassified` and include it in Overall. Global and country observations retain independent scope. | Lebanon's required resources increase from $1,665,495,081.99 to $1,812,711,123.99, including $147,216,042 without an SDG classification. |
| Field Missions used an obsolete group denominator | Annual financial classifications drive all composition segments, connectors and mission membership. | The 2025 denominator includes $1,114,725,018.79 previously omitted; mission share is 43.51%, previously 47.37%. The feature remains disabled. |
| Missing annual observations appeared as zero | Preserve absent country/entity observations as null and show Unavailable; explicit reported zero remains zero. | Finland 2015 and IRMCT 2021 no longer display absent expenditure as $0. |

## Independent review

Three peer checks challenged changes authored by other reviewers:

- The geography reviewer examined the sidebar missingness and unclassified-row
  changes, including initial props, explicit zeros, failed requests, year changes,
  keyed request cleanup and non-navigation of the unclassified group.
- The Secretariat reviewer recomputed geographic parent amounts directly from
  raw CSV E06 rows with Decimal, independently of the exporter: 3,348 country/year
  records preserve all parents and amounts, including 41 conflicts. Record totals
  and per-entity amounts were unchanged in all 16 exports.
- The UNINFO reviewer recomputed annual Field Missions group amounts for
  2019–2025 and checked group ordering, connector positions, map eligibility,
  source identities, annual classifications, and signed/zero geometry.

The lead separately reviewed the UNINFO implementation and its raw-to-export
checks. These reviews found no actionable remaining defect in the five fixes.
They are bounded reviews, not certification of the entire portal or all possible
source revisions. Additional preexisting issues are reserved for the subsequent
independent search.

## Reproduction

```bash
uv run python -m unittest discover -s python/tests
uv run python python/test_budget_source_citations.py
node --test src/lib/tests/*.test.mjs
pnpm run typecheck
SITE_VARIANT=preview pnpm run build
```

Serve `out/` locally and run with its URL:

```bash
PORTAL_URL=http://127.0.0.1:8768 SITE_VARIANT=preview node tests/browser/data-integrity-fixes.mjs
PORTAL_URL=http://127.0.0.1:8768 SITE_VARIANT=preview node tests/browser/sidebar-years.mjs
```

The integrity browser check exercises absent observations and explicitly reported
zeros separately, the unresolved regional group, and the preview-only unclassified
SDG row. Browser fixtures do not modify the tracked data. Source/export tests
also retain signed adjustments, repeated local codes, same-ID duplicates,
contradictory IDs, orphaned nodes and independent global/country scopes.

A broader preview feature-profile probe reported one intermittent React hydration
error (#418) on the unchanged Secretariat overview route. Three subsequent fresh
loads did not reproduce it. This was not accepted as proof of a remediation
regression or dismissed as a verified repair; it remains a separate runtime
observation. The focused integrity and existing sidebar race/error browser checks
passed.

The final preview feature-profile browser check passed. TypeScript, targeted
ESLint, all available Python and JavaScript regression tests, citation tests,
and the focused preview browser checks passed. The repository-wide lint command
is blocked by an unchanged preexisting `@next/next/no-assign-module-variable`
error in `tests/budget-funding.mjs:15`; that unrelated file is outside this commit.
