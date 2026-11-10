"""Verify the category repair against retained sources and pre-repair Git data.

Read-only: run from the repository root with uv run python and this file's path.
The baseline is the reviewed investigation commit, before the production repair.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

import pandas as pd
import trust_fund_schedules as schedules
from trust_fund_frontend_exports import is_adjustment, selected_funding_rows

BASELINE = "675b5635b872041a438e7679d4702ef61dec9890"
FLOW_PATH = "data/trust-fund-schedules/stage2/counterparty-flows.csv"
KEYS = ["calendar_year", "fund_code", "flow_type", "source_table_id", "source_row_index"]


def summary(frame: pd.DataFrame, dimensions: list[str]) -> list[dict]:
    result = (
        frame.groupby(dimensions, dropna=False)["effective_amount_usd"]
        .agg(rows="size", signed_usd="sum").reset_index()
    )
    return json.loads(result.to_json(orient="records"))


def main() -> None:
    stage = ROOT / "data/trust-fund-schedules"
    baseline_csv = subprocess.check_output(
        ["git", "-C", str(ROOT), "show", f"{BASELINE}:{FLOW_PATH}"], text=True,
    )
    current_csv = (ROOT / FLOW_PATH).read_text()
    old_records = list(csv.DictReader(io.StringIO(baseline_csv)))
    current_records = list(csv.DictReader(io.StringIO(current_csv)))
    old_keys = [tuple(row[key] for key in KEYS) for row in old_records]
    new_keys = [tuple(row[key] for key in KEYS) for row in current_records]
    assert len(set(old_keys)) == len(old_keys), "Duplicate baseline row identities"
    assert old_keys == new_keys, "Source row identities/order changed"
    for old, new in zip(old_records, current_records, strict=True):
        assert {k: v for k, v in old.items() if k != "counterparty_group"} == {
            k: v for k, v in new.items() if k != "counterparty_group"
        }, f"Non-category field changed: {tuple(old[key] for key in KEYS)}"

    tables = [json.loads(line) for line in (stage / "stage1/tables.jsonl").open()]
    _, _, facts, replay, _ = schedules.normalize_tables(tables)
    retained = pd.read_csv(io.StringIO(current_csv))
    old = pd.read_csv(io.StringIO(baseline_csv))
    a = replay.set_index(KEYS, verify_integrity=True)
    b = retained.set_index(KEYS, verify_integrity=True)
    pd.testing.assert_index_equal(a.index, b.index)
    monetary = [column for column in replay if column.endswith("_usd")]
    pd.testing.assert_frame_equal(a[monetary], b[monetary], check_dtype=False, check_exact=True)
    # CSV serialization merges absent/empty reported-text cells. Monetary blanks
    # are checked above without filling; source text cells are compared as text.
    for column in a:
        if column.endswith("_reported_text"):
            a[column] = a[column].fillna("")
            b[column] = b[column].fillna("")
    pd.testing.assert_frame_equal(a, b, check_dtype=False, check_exact=False, rtol=0, atol=1e-10)
    changed_all = old.counterparty_group.fillna("<missing>").ne(
        retained.counterparty_group.fillna("<missing>")
    )
    years = []
    for year in sorted(old.calendar_year.unique()):
        before, _ = selected_funding_rows(year, old, facts)
        after, _ = selected_funding_rows(year, retained, facts)
        before = before.loc[before.flow_type.eq("voluntary_contribution")]
        after = after.loc[after.flow_type.eq("voluntary_contribution")]
        joined = before.set_index(KEYS, verify_integrity=True).join(
            after.set_index(KEYS, verify_integrity=True)[["counterparty_group"]],
            rsuffix="_repaired", validate="one_to_one",
        )
        changed = joined.loc[joined.counterparty_group.fillna("<missing>").ne(
            joined.counterparty_group_repaired.fillna("<missing>")
        )].reset_index()
        all_changes = int((changed_all & old.calendar_year.eq(year)).sum())
        if year < 2025:
            assert all_changes == 0, f"Historical categories changed in {year}"
        record = {
            "year": int(year), "all_flow_category_changes": all_changes,
            "unclassified_voluntary_rows_before": int(before.counterparty_group.isna().sum()),
            "unclassified_voluntary_rows_after": int(after.counterparty_group.isna().sum()),
            "voluntary_category_changes": summary(
                changed, ["counterparty_group", "counterparty_group_repaired"],
            ),
        }
        if year == 2025:
            adjustment = changed.counterparty.str.contains(
                "present value adjustment|discounting of non-current receivable", case=False, regex=True,
            ) | changed.counterparty.map(is_adjustment)
            record["contributor_only_category_changes"] = summary(
                changed.loc[~adjustment], ["counterparty_group", "counterparty_group_repaired"],
            )
            record["remaining_unclassified_by_fund"] = summary(
                after.loc[after.counterparty_group.isna()], ["fund_code"],
            )
            assert record["remaining_unclassified_by_fund"] == [
                {"fund_code": "OUN", "rows": 2, "signed_usd": -29_537}
            ], "Re-review changed unclassified source observations"
        years.append(record)
    print(json.dumps({
        "baseline": BASELINE, "only_persisted_category_fields_changed": True,
        "retained_data_matches_source_replay": True, "years": years,
    }, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
