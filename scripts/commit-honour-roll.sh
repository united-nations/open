#!/usr/bin/env bash
# Run only in CI, after the validated data has passed the production build.
set -euo pipefail

: "${HONOUR_ROLL_DIAGNOSTICS:?Honour-roll diagnostics directory is required}"
year=$(python3 - <<'PYCODE'
import json, os
from pathlib import Path
report = json.loads((Path(os.environ['HONOUR_ROLL_DIAGNOSTICS']) / 'report.json').read_text())
year = report['year']
assert type(year) is int and 2000 <= year <= 9999
assert not report['check_only'], 'Cannot commit a check-only run'
print(year)
PYCODE
)
data_file="public/data/regular-budget-contributors-${year}.json"
evidence_file="data/honour-roll/honourroll-${year}.html"

# Do not rebase data onto a baseline that was not validated and built.
git fetch --no-tags origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "::error::main changed during the sync. Nothing will be committed or deployed; rerun against the new baseline."
  exit 1
fi
if ! git diff --cached --quiet; then
  echo "::error::Unexpected staged files before honour-roll commit."
  exit 1
fi
if ! git diff --quiet HEAD -- . ":(exclude)$data_file" ":(exclude)$evidence_file"; then
  echo "::error::Unexpected changes outside the honour-roll files."
  exit 1
fi
git add -- "$data_file"
if [ -f "$evidence_file" ]; then
  git add -- "$evidence_file"
fi
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
if git diff --cached --quiet; then
  # Public-repository cron is disabled after 60 days without repository activity.
  # Keep it active without changing any source dates or website data.
  last_commit=$(git log -1 --format=%ct)
  if [ "$(( $(date -u +%s) - last_commit ))" -lt 2592000 ]; then
    exit 0
  fi
  git commit --allow-empty -m "chore: keep nightly honour-roll schedule active"
else
  git commit -m "data: sync ${year} honour roll"
fi
# Normal fast-forward push: a concurrent change or branch rule fails closed.
git push origin HEAD:main
