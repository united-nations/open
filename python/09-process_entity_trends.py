"""Generate entity-trends.json from CEB revenue and expenses data."""
import json
import pandas as pd
from pathlib import Path
from collections import defaultdict
from utils import normalize_entity

DATA = Path("public/data")
YEARS = list(range(2011, 2025))
UNCATEGORIZED = "Uncategorized"
SYNTHETIC_ENTITY_GROUPS = {
    "UN": "UN Secretariat",
    "UN-DPO": "Peacekeeping Operations",
}

def load_revenue() -> dict[str, dict[int, float]]:
    """Load revenue from fused CSV, aggregated by entity."""
    df = pd.read_csv("data/ceb/fused/revenue_by_contributor.csv")
    df["entity"] = df["entity"].apply(normalize_entity)
    agg = df.groupby(["entity", "year"])["amount"].sum().reset_index()
    data = defaultdict(dict)
    for _, row in agg.iterrows():
        data[row["entity"]][row["year"]] = row["amount"]
    return dict(data)

def load_expenses() -> dict[str, dict[int, float]]:
    """Load expenses from CEB clean CSV (not fused, for consistency)."""
    df = pd.read_csv("data/ceb/clean/expenses_sub_agency.csv")
    df["agency"] = df["agency"].apply(normalize_entity)
    agg = df.groupby(["agency", "calendar_year"])["amount"].sum().reset_index()
    data = defaultdict(dict)
    for _, row in agg.iterrows():
        data[row["agency"]][row["calendar_year"]] = row["amount"]
    return dict(data)

def main():
    entities = json.loads((DATA / "entities.json").read_text())
    entity_to_group = {
        e["entity"]: e.get("system_grouping") or UNCATEGORIZED
        for e in entities
        if e.get("entity")
    }
    entity_to_group.update(SYNTHETIC_ENTITY_GROUPS)
    groups = list(dict.fromkeys(e.get("system_grouping") for e in entities if e.get("system_grouping")))
    
    rev, exp = load_revenue(), load_expenses()
    all_entities = sorted(set(rev) | set(exp))
    
    entities_by_group = defaultdict(list)
    for e in all_entities:
        entities_by_group[entity_to_group.get(e, UNCATEGORIZED)].append(e)

    # Include fallback groups discovered from the financial data. This keeps
    # entities with incomplete or entirely missing metadata selectable instead
    # of silently omitting them from the trends UI.
    groups.extend(group for group in entities_by_group if group not in groups)

    grouped_entities = {
        entity
        for group in groups
        for entity in entities_by_group[group]
    }
    assert grouped_entities == set(all_entities), "Some financial entities have no visible trend grouping"
    
    def year_series(entity_set):
        return [{"year": y,
                 "revenue": sum(rev.get(e, {}).get(y, 0) or 0 for e in entity_set) or None,
                 "expenses": sum(exp.get(e, {}).get(y, 0) or 0 for e in entity_set) or None}
                for y in YEARS]
    
    output = {
        "meta": {"years": YEARS, "systemGroups": groups,
                 "entitiesByGroup": {g: entities_by_group[g] for g in groups if g in entities_by_group}},
        "aggregates": {"all": year_series(all_entities), **{g: year_series(entities_by_group[g]) for g in groups}},
        "entities": {e: [{"year": y, "revenue": rev.get(e, {}).get(y), "expenses": exp.get(e, {}).get(y)} for y in YEARS]
                     for e in all_entities}
    }
    
    out_path = DATA / "entity-trends.json"
    out_path.write_text(json.dumps(output, indent=2))
    
    # Summary
    rev_years = sorted(set(y for d in rev.values() for y in d.keys()))
    exp_years = sorted(set(y for d in exp.values() for y in d.keys()))
    print(f"Revenue: {len(rev)} entities, {rev_years[0]}-{rev_years[-1]}")
    print(f"Expenses: {len(exp)} entities, {exp_years[0]}-{exp_years[-1]}")
    print(f"Wrote {out_path}: {len(output['entities'])} entities, {len(groups)} groups")

if __name__ == "__main__":
    main()
