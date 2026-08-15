"""Export UN Secretariat expenses to JSON for the /secretariat page.

Source: data/un-secretariat-expenses.csv (2019-2023, 153 sub-entities).
Two orthogonal grouping lenses share one file:
- Priority Area (9 thematic areas)
- Budget Part (formal structure, Parts I-XIV)

Output per year `public/data/secretariat-{year}.json`:
{
  "records": [ {entity, priority_area, part_id, part_desc, amount}, ... ],  # net, by (entity, area, part)
  "funds":   { entity: [ {label, source_type, amount}, ... ] }             # net NOTE breakdown per entity
}

Amounts are faithful net sums (negatives retained) so totals are never wrong;
the frontend decides how to draw non-positive tiles.
"""
import json
import pandas as pd
from pathlib import Path
from utils import normalize_entity

SRC = Path("data/un-secretariat-expenses.csv")
OUT = Path("public/data")

# Normalize Part-ID / description data-quality variants so the Budget-Part lens
# doesn't get phantom duplicate groups.
PART_ID_FIXES = {"ViII": "VIII"}
PART_DESC_FIXES = {
    "Public information": "Global Communications",   # Part VII renamed across years
    "Safety and Security": "Safety and security",    # casing variant (Part XII)
}

# Peacekeeping is a separate budget (its own assessment scale & July-June cycle),
# not part of the regular programme budget — even though it's administratively
# part of the Secretariat. It shows up as SOURCE_TYPE "Other Assessed" (mission
# budgets + the peacekeeping support account). Reclassify it into its own
# "budget part" so the Budget Part lens doesn't imply it's part of the PPB.
# Exception: the international tribunals' residual mechanism (MICT) is ALSO
# "Other Assessed" but separately assessed and NOT peacekeeping — keep as-is.
PEACEKEEPING_PART = "Peacekeeping Budget"
OTHER_ASSESSED_NON_PK = {"MICT"}  # residual mechanism for the criminal tribunals

def load() -> pd.DataFrame:
    df = pd.read_csv(SRC)
    df = df.rename(columns={
        "PRIORITY_AREA": "priority_area", "PART_ID": "part_id",
        "PART_DESCRIPTION": "part_desc", "ENTITY": "entity", "YEAR": "year",
        "AMOUNT": "amount", "SOURCE_TYPE": "source_type", "NOTE": "note",
    })
    df["entity"] = df["entity"].apply(normalize_entity)
    df["part_id"] = df["part_id"].replace(PART_ID_FIXES)
    df["part_desc"] = df["part_desc"].replace(PART_DESC_FIXES)

    # Override the budget part for the separately-financed peacekeeping account.
    pk = (df["source_type"] == "Other Assessed") & (~df["entity"].isin(OTHER_ASSESSED_NON_PK))
    df.loc[pk, "part_id"] = PEACEKEEPING_PART
    df.loc[pk, "part_desc"] = PEACEKEEPING_PART

    return df[["priority_area", "part_id", "part_desc", "entity", "year", "amount", "source_type", "note"]]

def build_records(year_df: pd.DataFrame) -> list[dict]:
    """Net amount aggregated by (entity, priority_area, part). Both lenses derive from this."""
    agg = (year_df.groupby(["entity", "priority_area", "part_id", "part_desc"], as_index=False)["amount"]
                  .sum())
    agg = agg.sort_values("amount", ascending=False)
    return [
        {"entity": r.entity, "priority_area": r.priority_area,
         "part_id": r.part_id, "part_desc": r.part_desc, "amount": round(r.amount, 2)}
        for r in agg.itertuples()
    ]

def build_funds(year_df: pd.DataFrame) -> dict[str, list[dict]]:
    """Per entity, net amount grouped by NOTE (blank -> 'Unattributed ({source_type})').
    Carries source_type for coloring. Sum of an entity's funds == its record total."""
    df = year_df.copy()
    blank = df["note"].isna() | (df["note"].astype(str).str.strip() == "")
    df.loc[blank, "note"] = "Unattributed (" + df.loc[blank, "source_type"].astype(str) + ")"

    funds: dict[str, list[dict]] = {}
    agg = df.groupby(["entity", "note", "source_type"], as_index=False)["amount"].sum()
    for entity, grp in agg.groupby("entity"):
        items = [
            {"label": r.note, "source_type": r.source_type, "amount": round(r.amount, 2)}
            for r in grp.sort_values("amount", ascending=False).itertuples()
        ]
        funds[entity] = items
    return funds

def export():
    df = load()
    years = sorted(df["year"].unique())
    print(f"Loaded {len(df)} rows, years {years[0]}-{years[-1]}")

    for year in years:
        ydf = df[df["year"] == year]
        records = build_records(ydf)
        funds = build_funds(ydf)

        # Reconciliation: records, funds, and the raw CSV net must all agree.
        raw_total = ydf["amount"].sum()
        rec_total = sum(r["amount"] for r in records)
        fund_total = sum(f["amount"] for items in funds.values() for f in items)
        assert abs(rec_total - raw_total) < 1.0, f"{year}: records {rec_total} != raw {raw_total}"
        assert abs(fund_total - raw_total) < 1.0, f"{year}: funds {fund_total} != raw {raw_total}"
        # Per-entity: funds must reconcile to that entity's record total.
        rec_by_entity = pd.Series({e: 0.0 for e in ydf["entity"].unique()})
        for r in records:
            rec_by_entity[r["entity"]] += r["amount"]
        for entity, items in funds.items():
            s = sum(f["amount"] for f in items)
            assert abs(s - rec_by_entity[entity]) < 1.0, f"{year} {entity}: funds {s} != records {rec_by_entity[entity]}"

        out = {"records": records, "funds": funds}
        (OUT / f"secretariat-{year}.json").write_text(json.dumps(out, indent=2))
        n_neg = sum(1 for v in rec_by_entity if v <= 0)
        print(f"secretariat-{year}.json: {len(records)} records, {len(funds)} entities, "
              f"${raw_total/1e9:.2f}B net ({n_neg} entities net<=0) ✓")

    print("\n✓ All years reconciled (records == funds == raw CSV net)")

if __name__ == "__main__":
    export()
