"""Export CEB-only organization expenses with canonical entity labels.

Secretariat expenses are exported separately; they never replace CEB UN/UN-DPO
aggregates or add amounts to independently reported CEB organizations.
"""
from pathlib import Path

import pandas as pd

from utils import normalize_entity

ceb_dir = Path("data/ceb")
clean, fused = ceb_dir / "clean", ceb_dir / "fused"


def load_ceb() -> pd.DataFrame:
    df = pd.read_csv(clean / "expenses_sub_agency.csv")
    df = df.rename(columns={"agency": "entity", "calendar_year": "year"})
    df["entity"] = df["entity"].apply(normalize_entity)
    return df[["year", "entity", "amount"]].copy()


def export_expenses() -> pd.DataFrame:
    ceb = load_ceb()
    df = ceb.groupby(["year", "entity"])["amount"].sum().reset_index()
    df["source"] = "ceb"
    df = df.sort_values(["year", "entity"])
    validate(df, ceb)
    fused.mkdir(parents=True, exist_ok=True)
    df.to_csv(fused / "expenses.csv", index=False)
    print(f"Wrote {len(df)} rows to {fused / 'expenses.csv'}")
    return df


def validate(df: pd.DataFrame, ceb: pd.DataFrame):
    expected = ceb.groupby(["year", "entity"])["amount"].sum().sort_index()
    actual = df.set_index(["year", "entity"])["amount"].sort_index()
    assert not actual.index.has_duplicates, "Duplicate entity/year combinations"
    pd.testing.assert_series_equal(actual, expected, check_exact=True)
    assert df["source"].eq("ceb").all(), "System expenses must use CEB only"
    print(f"Validated {len(df)} entity/year totals against CEB expenses")


if __name__ == "__main__":
    export_expenses()
