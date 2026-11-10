"""Read-only category-loss experiment on the retained trust-fund tables.

This diagnoses the existing parser; it does not implement or export a repair.
Run from the repository root with uv run python followed by this file's path.
"""

from __future__ import annotations

import inspect
import json
from pathlib import Path
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

import pandas as pd
import trust_fund_schedules as schedules
from trust_fund_frontend_exports import is_adjustment, selected_funding_rows


KEYS = [
    "calendar_year", "fund_code", "flow_type", "source_table_id", "source_row_index",
]


def summary(frame: pd.DataFrame, dimensions: list[str]) -> list[dict]:
    result = (
        frame.groupby(dimensions, dropna=False)["effective_amount_usd"]
        .agg(rows="size", signed_usd="sum")
        .reset_index()
    )
    # JSON serialization preserves missing categories as null, not a source label.
    return json.loads(result.to_json(orient="records"))


def main() -> None:
    stage = ROOT / "data/trust-fund-schedules"
    tables = [json.loads(line) for line in (stage / "stage1/tables.jsonl").open()]
    _, _, facts, baseline, _ = schedules.normalize_tables(tables)
    retained = pd.read_csv(stage / "stage2/counterparty-flows.csv")
    baseline_index = baseline.set_index(KEYS, verify_integrity=True)
    retained_index = retained.set_index(KEYS, verify_integrity=True)
    pd.testing.assert_index_equal(baseline_index.index, retained_index.index)
    monetary = [column for column in baseline if column.endswith("_usd")]
    pd.testing.assert_frame_equal(
        baseline_index[monetary], retained_index[monetary],
        check_dtype=False, check_exact=True,
    )
    pd.testing.assert_series_equal(
        baseline_index.counterparty_group.fillna("<missing>"),
        retained_index.counterparty_group.fillna("<missing>"),
    )

    original = schedules.normalize_flow_table
    source = inspect.getsource(original)
    old_guard = 'if float(literal.get("y", 0)) > 720 and not any('
    new_guard = (
        'if literal.get("counterparty", "").strip() not in COUNTERPARTY_GROUPS '
        'and float(literal.get("y", 0)) > 720 and not any('
    )
    if source.count(old_guard) != 1:
        raise RuntimeError("Parser changed; review the experiment before rerunning it")
    namespace = dict(vars(schedules))
    exec(compile(source.replace(old_guard, new_guard), str(__file__), "exec"), namespace)
    with patch.object(schedules, "normalize_flow_table", namespace[original.__name__]):
        _, _, replay_facts, experiment, _ = schedules.normalize_tables(tables)
    pd.testing.assert_frame_equal(facts, replay_facts, check_exact=True)
    # This stronger check preserves nulls, names, provenance, flags and amounts.
    pd.testing.assert_frame_equal(
        baseline.drop(columns="counterparty_group"),
        experiment.drop(columns="counterparty_group"), check_exact=True,
    )
    changed_all = baseline.counterparty_group.fillna("<missing>").ne(
        experiment.counterparty_group.fillna("<missing>")
    )
    years = []
    for year in sorted(baseline.calendar_year.unique()):
        before, _ = selected_funding_rows(year, baseline, facts)
        after, _ = selected_funding_rows(year, experiment, facts)
        before = before.loc[before.flow_type.eq("voluntary_contribution")]
        after = after.loc[after.flow_type.eq("voluntary_contribution")]
        joined = before.set_index(KEYS, verify_integrity=True).join(
            after.set_index(KEYS, verify_integrity=True)[["counterparty_group"]],
            rsuffix="_experiment", validate="one_to_one",
        )
        changed = joined.loc[joined.counterparty_group.fillna("<missing>").ne(
            joined.counterparty_group_experiment.fillna("<missing>")
        )].reset_index()
        record = {
            "year": int(year),
            "all_flow_category_changes": int((changed_all & baseline.calendar_year.eq(year)).sum()),
            "unclassified_voluntary_rows_before": int(before.counterparty_group.isna().sum()),
            "unclassified_voluntary_rows_experiment": int(after.counterparty_group.isna().sum()),
            "voluntary_category_changes": summary(
                changed, ["counterparty_group", "counterparty_group_experiment"],
            ),
        }
        if year == 2025:
            adjustment = changed.counterparty.str.contains(
                "present value adjustment|discounting of non-current receivable",
                case=False, regex=True,
            ) | changed.counterparty.map(is_adjustment)
            record["contributor_only_category_changes"] = summary(
                changed.loc[~adjustment],
                ["counterparty_group", "counterparty_group_experiment"],
            )
            record["government_recoveries_by_fund"] = summary(
                changed.loc[changed.counterparty_group_experiment.eq("Government")],
                ["fund_code"],
            )
            record["remaining_unclassified_by_fund"] = summary(
                after.loc[after.counterparty_group.isna()], ["fund_code"],
            )
        years.append(record)
    print(json.dumps({
        "retained_source_keys_categories_and_amounts_match_replay": True,
        "experiment_changes_only_counterparty_group": True,
        "years": years,
    }, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
