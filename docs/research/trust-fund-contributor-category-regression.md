# Trust-fund contributor categories: regression investigation

Investigated and adversarially reviewed on 9 November 2026 (client date).
Baseline: repository commit `f3b2d8c`; retained 2017–2025 trust-fund sources.
The original investigation was committed as `675b563` without a production
repair. A subsequent implementation fixes the parser, export and frontend;
its validation is recorded below. The historical experiment and measurements
in the first sections describe the pre-repair baseline.

## Finding

The 2025 Government/Others split is materially wrong. Two existing rules combine:

1. `normalize_flow_table` in `python/trust_fund_schedules.py` discards text-only
   rows whose PDF vertical coordinate exceeds 720, before it checks whether the
   text is a recognized contributor-category heading.
2. `flow_breakdown` in `python/trust_fund_frontend_exports.py` assigns every
   voluntary-contribution row without the exact category `Government` to `other`,
   including missing categories.

Several 2025 PDF pages are much taller than the cutoff. A skipped Government
heading leaves its rows unclassified; a skipped Others heading can leave the
preceding Government category active. Continuation pages carry the resulting
category state forward. The frontend draws the exported `flow.group` values.

For example, physical PDF page 300 of
`data/trust-fund-schedules/raw/schedule-2025.pdf` explicitly prints Government
above Germany's CERF contribution of **$39,561,029**. The heading is at
approximately y=845.63 on a page approximately 1,237.5 points high. The literal
table retains it, but normalization discards it. Germany's exported Others
amount consequently includes that contribution.

## Measured impact and scope

The diagnostic experiment exempts recognized category headings from the cutoff;
it leaves all other parser behavior intact. It preserves every normalized field
except `counterparty_group`, including source-row identities, names, monetary
values, missing monetary values, total flags and provenance. All categories in
2017–2024 remain unchanged. In 2025, 494 normalized flow rows change category;
442 belong to the selected voluntary-contribution schedules.

The selected schedule rows include accounting adjustments:

| Before | Experiment | Rows | Signed USD |
| --- | --- | ---: | ---: |
| Missing | Government | 350 | 620,332,243 |
| Government | Others | 68 | 29,710,443 |
| Missing | Others | 24 | 6,852,828 |

After excluding adjustment rows using the exporter's contributor rules, the
changes relevant to contributor amounts are:

| Before | Experiment | Rows | Signed USD |
| --- | --- | ---: | ---: |
| Missing, displayed as Others | Government | 350 | 620,332,243 |
| Government | Others | 57 | 27,300,623 |
| Missing, displayed as Others | Others | 23 | 7,784,946 |

The last row changes source classification without changing the displayed group.
These figures are signed source-row sums, not the positive-only area of the
treemap. The initial chat answer's 68 rows/$29.7m described selected schedule
rows, including 11 adjustments; it overstates the reverse error affecting
contributor amounts. The second table corrects that ambiguity.

Unclassified selected voluntary-contribution rows fall from 392 to 18 in 2025.
The remaining cases must not be silently classified by donor name:

- **LLB:** 16 rows, $31,075,564. Physical PDF page 122 omits the opening
  Government heading for contributions, but closes those rows with an explicit
  `Total Government`. This provides evidence for a separately bounded subtotal
  reconstruction, not a global identity-based rule.
- **OUN:** two negative rows, −$29,537, with no printed contributor categories.
  Unknown classification remains appropriate absent further source evidence.

The older sources contain a few unclassified observations too: counts for
2017–2024 are respectively 2, 2, 1, 0, 4, 1, 1 and 1. The experiment does not
resolve or change those classifications.

## Regression history

- [`8339ce1`](https://github.com/united-nations/transparency/commit/8339ce1d7a870e8536a70cedd37e464db03a0e69),
  21 August 2026: the original extraction already contains the fixed 720 cutoff.
- [`b94cfcc`](https://github.com/united-nations/transparency/commit/b94cfcc),
  25 August 2026: the frontend already treats any contributor category other
  than Government as Others. Thus the fallback behavior predates September.
- [`5b5dafa`](https://github.com/united-nations/transparency/commit/5b5dafad480f2cf148157e7302e71827f155a64c),
  16 September 2026: introduces the current observation-level exporter rule and
  separate flow categories. This is not the first unknown-to-Others behavior.
- [`1bf0988`](https://github.com/united-nations/transparency/commit/1bf09883444cb04af8a66cde573b93aac41c5905),
  5 November 2026: integrates the taller 2025 sources and changes the contributor
  default from 2024 to 2025. Its first 2025 export already contains Germany's
  split of $159,619,640 Government, $91,908,142 Others and $162,597
  inter-organizational. Later UI changes did not introduce that split.

The regression is an old parser assumption exposed by a newly integrated source
layout and default year. The retained earlier sources have no text-only
recognized category headings below the cutoff. The 2025 source has 19 such
headings. A further occurrence of `Others` below the cutoff is a monetary donor
row, not a heading, and must remain a donor row.

## Validation, review and limits

The original diagnostic experiment is preserved at commit `675b563`. The
current read-only audit validates the production repair against that baseline:

```bash
uv run python docs/research/trust-fund-category-audit.py
uv run python -m unittest discover -s python/tests -p 'test_trust_fund_schedules.py'
uv run python -m unittest discover -s python/tests -p 'test_trust_fund_frontend_exports.py'
```

The current audit reads retained tables and pre-repair observations from Git.
It writes no files and does not invoke an export. It checks unique source keys,
exact preservation of every persisted non-category cell (including blanks),
agreement with a fresh parser replay, and unchanged historical categories.
It stops for review if the remaining unclassified source observations change.

At investigation time, all 16 parser and 10 frontend-export tests in the two focused files passed. Those
tests do not cover category headings below y=720 or missing categories on
voluntary-contribution rows. Arithmetic reconciliation cannot detect this
category-only failure because amounts remain intact. Other trust-fund test
modules were not included in this focused test result.

Three adversarial agents independently reviewed source evidence, history, and
methodology. The source reviewer used a different experiment: moving only the
19 recognized text-only headings to y=720 in a copy of the literal tables and
running the unchanged parser. It reproduced the schedule-row transition counts
and amounts. The history reviewer checked the first 2025 export and earlier
fallback behavior. The methodology reviewer checked row uniqueness, historical
category stability and adjustment exclusions, and identified the distinction
between the two impact tables above. Their corrections are incorporated here.

The live deployment could not be fetched in the investigation environment.
Checked-in 2025 exports reproduce the screenshot's amounts; deployment identity
was not independently verified.

## Repair requirements established by the investigation

- Preserve recognized headings on tall pages; ensure any footer handling also
  preserves wrapped names and legitimate table text below the old cutoff.
- Keep unknown source categories distinct from explicit Others. This must not
  reuse `unitemized`/`Contributors unspecified`, which identifies unnamed
  Schedule 8.1 contributions. Known contributors with unknown categories are
  a different condition; the sidebar also uses `Unspecified` specially.
- Reconstruct LLB only from its reviewed source-subtotal evidence. Preserve
  genuinely absent categories such as OUN. Do not infer contributor categories
  from names or force one category across all of a contributor's source rows.
- Add tests for both skipped heading directions, continuation state, unknown
  voluntary categories, and signed amounts. Regenerate and compare stage 2 and
  frontend exports across all years, including amounts, provenance and category
  reconciliation. The diagnostic exemption alone is not this full repair.

Inter-organizational arrangements and internal transfers are flow types. The
same contributor may legitimately occur in several flow groups, so eliminating
all repeated contributor names across categories would not be a valid repair.

## Production repair and validation

Implemented on 10 November 2026 (client date):

- Recognized category headings survive the old text-only cutoff, without
  converting monetary counterparty rows named Others into headings.
- A narrowly reviewed parser rule recovers LLB's 16 Government rows and its
  subtotal. It checks exact table/page identity, source row positions, absent
  prior categories and both the printed subtotal and signed row sum. Source
  references explicitly disclose the printed Total Government basis.
- Explicit Government/Governments and non-government source headings are
  classified separately from absent categories. Unrecognized nonempty source
  categories fail export for review rather than being labelled absent. A new
  `category_unknown` flow group is labelled Category not reported; it preserves
  named contributors, source citations and signed amounts. The MPTF-specific
  `unitemized` flow and Unspecified contributor behavior remain distinct.
- The frontend supports the new category in tiles, filters and sidebar flow
  breakdowns. Negative-only categories retain a filter and signed total without
  artificial positive area.

The regenerated stage-2 observations change 511 category cells and no other
persisted fields. All changes are in 2025; earlier years retain every category.
The additional 17 changes beyond the heading-only experiment are LLB's 16
contribution rows and printed subtotal. Raw PDFs and stage-1 tables are unchanged.
All existing source validation gates pass. The normal frontend export step
regenerates the annual contributor data; source monetary amounts, contributor
and destination identities, reconciliations and overall totals are preserved.
Only the 2025 contributor JSON changes. Running the existing exporter also
refreshes its previously missing citation operands and applies existing reviewed
fund-title corrections for IIT, OAU and HCB. Physical source locators and their
observation counts remain unchanged. The 16 LLB contribution references gain
the explicit subtotal-basis explanation; subtotal amounts are not added as
extra financial operands.

The final 2025 signed voluntary flow totals are Government $2,154,538,701,
Others $274,125,384 and Category not reported −$29,537. Germany has
$251,527,782 under Government and $162,597 in inter-organizational flows, with
no Others flow. These are classifications within its unchanged $251,690,379
contributor total.

The parser tests now cover tall-page heading transitions, signed monetary rows
named Others, continuation state, and rejection of altered LLB evidence. Export
tests cover unknown categories, plural Governments, signed additivity and LLB's
category-source explanation. Browser coverage in
`tests/browser/trust-fund-categories.mjs` checks Germany's actual corrected 2025
classification and the named negative OUN category. A separate marked fixture
tests positive unknown-category tiles and signed filter behavior.

Final checks: the full Python suite passes (213 tests), the focused parser/export
files pass (18 and 12 tests), and source-citation checks pass (13 tests).
TypeScript, targeted ESLint, and the full-profile static production build pass.
The production build required network access for the application's existing
Google Fonts dependency. Browser checks pass at 1440px and 390px, with no page
errors or horizontal overflow; the resulting chart was also visually inspected.
The existing MPTF browser script's contributor checks pass. Its spending checks
assume only the individual schedules are selected; the full profile defaults to
both spending sources and therefore fails its unadapted total assertion. A
temporary test copy selecting the intended schedules-only scope passes the
remaining assertions at both widths. The repository's older MPTF test is
unchanged. The schedules-only visibility test skips on the full profile.

Two independent adversarial reviewers approved the production parser, exporter,
tests and regenerated data after comparing all source rows, financial identities,
source locator multiplicities and citation operand sums. A separate frontend
agent implemented and exercised the browser regression. Review required one
additional safeguard: nonempty unrecognized source categories now fail for review
instead of being incorrectly described as unreported. The safeguard and its
regression test are included in the final change.
