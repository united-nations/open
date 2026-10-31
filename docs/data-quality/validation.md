# Reproducing the data-quality checks

Use Node 24, pnpm and uv from the repository's toolchain. Install dependencies with
`pnpm install --frozen-lockfile` and `uv sync`.

## Python source/export checks

The CEB input CSVs used by the regression tests are tracked. The immutable budget
release cache is deliberately ignored. On a fresh checkout, download and verify
that release before running the source-dependent tests:

```bash
gh release download financial-data-v1.8 \
  --repo united-nations/programme-budget-data \
  --pattern financial-data-v1.8.tar.gz --dir /tmp/open-budget-release

tar -xzf /tmp/open-budget-release/financial-data-v1.8.tar.gz \
  -C /tmp/open-budget-release

PYTHONPATH=python uv run python - <<'PY'
import runpy
from pathlib import Path
exporter = runpy.run_path('python/12-export_budget_json.py')
exporter['prepare'](Path('/tmp/open-budget-release/financial-data-v1.8'))
PY

uv run python -m unittest discover -s python/tests
uv run python python/test_budget_source_citations.py
```

`prepare` verifies the imported files against the release's SHA256SUMS and fills
`data/references/programme-budget-data-financial-v1.8/` without regenerating the
published JSON. CEB views use the current official release. Refresh through the validated CEB
pipeline, record current file hashes and coverage, regenerate dependent exports,
and investigate source changes before updating numerical regression expectations.
Do not hand-edit source amounts or fabricate a legacy-code crosswalk to make
tests pass. See [current CEB methodology](../ceb-methodology.md).

## PPB 2027 Section 1 funding coverage

The original `financial-data-v1.8` chart hierarchy omits Section 1 OA/XB even
though its normalized observations contain the controls. The producer must load
the preliminary Section 1 supplement before building section/Part/whole totals,
and recompute existing derivations when rebuilding. Use a corrected producer
build with `--local-financial` until a corrected release is available. The
importer rejects the known loss rather than silently regenerating incomplete
exports from the original release. Regenerate the matching hash-bound PDF page
sidecar when rebuilding source files; never bypass the citation hash check.

The 26 affected controls across 19 entities are recorded in
`ppb-funding-coverage-audit.csv`. Corrected 2025 section expenditure is
$224,719,800 and the programme-wide total is $12,085,071,200. EOSG includes
$34,180,200 XB, $1,195,900 OA and $17,602,100 RB, supported by PDF page 34.
Expenditure fields absent from the canonical hierarchy remain unavailable;
arithmetic remainders must not create numeric expenditure observations.

Run `node tests/budget-funding.mjs` and
`uv run python -m unittest discover -s python/tests -p 'test_ppb_funding_coverage.py'`
for the focused data checks. `tests/browser/budget-funding.mjs` checks restored
EOSG funding, a failed trend year remaining unavailable, and signed amounts.
The budget routes require a `SITE_VARIANT=preview pnpm build` for browser tests.

## Application checks

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:browser
```

The browser runner serves the completed `out/` export on localhost port 8766 and
stops its server afterward. Run it from the repository root. To inspect an
already running local preview, set `PORTAL_URL` instead. An optional
`PLAYWRIGHT_EXECUTABLE_PATH` selects an existing Chromium installation.

The suite checks failed and superseded year requests, UNINFO period/workspace
disclosures, anomalous funding bars, signed financial totals, all peacekeeping
stages and mission details, and hydration across all 14 routes (five passes).
It exits unsuccessfully when an assertion fails. Each check can also be run as
`node tests/browser/<name>.mjs` against an existing `PORTAL_URL`.

Generated evidence goes to ignored `audits/browser/`. `HYDRATION_REPEATS` can
reduce the repeated route sweep for development; leave it at five for release
verification. Original September audit PDFs, screenshots, snapshots and detailed
logs remain in the ignored local `audits/2026-09-16/` archive. Preserve that archive
outside Git when handing off the underlying evidence.

See [the historical audit](audit-2026-09-16.md), [remediation status](remediation-status.md)
and [remaining source-verification plan](remaining-source-audit-plan.md). Passing
these tests does not resolve the independent-source gaps described there.
