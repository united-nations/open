"""Export contributor data to JSON for frontend consumption."""
import json
import pandas as pd
from pathlib import Path
from collections import defaultdict
from utils import normalize_entity

YEARS = list(range(2013, 2025))
OUT = Path("public/data")

# R-code to display category mapping
REV_CATEGORY = {
    "R01": "Assessed", "R02A": "Voluntary un-earmarked", "R02B": "Voluntary un-earmarked",
    "R03A": "Voluntary earmarked", "R03B": "Voluntary earmarked", "R03C": "Voluntary earmarked",
    "R03D": "Voluntary earmarked", "R03E": "Voluntary earmarked", "R03F": "Voluntary earmarked",
    "R04A": "Other", "R04B": "Other", "R04C": "Other", "R05": "Other",
    "R07": "Voluntary earmarked", "R08": "Voluntary un-earmarked", "R08B": "Voluntary un-earmarked",
    "R09": "Voluntary earmarked", "R10": "Voluntary earmarked", "R11": "Voluntary earmarked", "R12": "Voluntary earmarked",
}

def rev_category(code: str) -> str:
    return REV_CATEGORY.get(code, "Voluntary earmarked")

def load_data():
    fused = pd.read_csv("data/ceb/fused/revenue_by_contributor.csv")
    fused["entity"] = fused["entity"].apply(normalize_entity)
    fused["rev_cat"] = fused["rev_type"].apply(rev_category)
    
    states = pd.read_csv("data/ceb/member_states.csv")
    state_info = {row["country"]: {"status": row["status"]}
                  for _, row in states.iterrows()}
    return fused, state_info

def export_donors_json(df: pd.DataFrame, state_info: dict):
    """Generate donors-{year}.json with contributions by donor."""
    for year in YEARS:
        ydf = df[df["year"] == year]
        donors = defaultdict(lambda: {"status": "organization", "category": "Non-Government", "contributions": {}})
        
        for _, row in ydf.iterrows():
            d = row["donor_name"]
            
            # Set category from donor_type
            donors[d]["category"] = row["donor_type"]
            
            # Mark aggregated "Other X" entries (no sidebar view)
            if row["is_other"]:
                donors[d]["is_other"] = True
            
            # Set status for government donors
            if row["donor_type"] == "Government":
                if d in state_info:
                    donors[d]["status"] = state_info[d]["status"]
                else:
                    donors[d]["status"] = "nonmember"
            
            e, cat, amt = row["entity"], row["rev_cat"], row["amount"]
            donors[d]["contributions"].setdefault(e, {})[cat] = donors[d]["contributions"].get(e, {}).get(cat, 0) + amt
        
        with open(OUT / f"donors-{year}.json", "w") as f:
            json.dump(dict(donors), f, indent=2)
        print(f"donors-{year}.json: {len(donors)} donors")

def export_entity_revenue_json(df: pd.DataFrame):
    """Generate entity-revenue-{year}.json with revenue by entity."""
    for year in YEARS:
        ydf = df[df["year"] == year]
        entities = {}
        
        for entity in ydf["entity"].unique():
            edf = ydf[ydf["entity"] == entity]
            by_type = edf.groupby("rev_cat")["amount"].sum().to_dict()
            
            # Aggregate by donor (excluding "Other X" entries)
            specific = edf[~edf["is_other"]]
            donor_totals = defaultdict(lambda: {"donor": "", "total": 0})
            for _, row in specific.iterrows():
                d, cat, amt = row["donor_name"], row["rev_cat"], row["amount"]
                donor_totals[d]["donor"] = d
                donor_totals[d]["total"] += amt
                donor_totals[d][cat] = donor_totals[d].get(cat, 0) + amt
            
            entities[entity] = {
                "total": edf["amount"].sum(),
                "year": year,
                "by_type": by_type,
                "by_donor": sorted(donor_totals.values(), key=lambda x: -x["total"])
            }
        
        with open(OUT / f"entity-revenue-{year}.json", "w") as f:
            json.dump(entities, f, indent=2)
        print(f"entity-revenue-{year}.json: {len(entities)} entities, ${sum(e['total'] for e in entities.values())/1e9:.1f}B")

def export_contributor_trends_json(df: pd.DataFrame):
    """Generate contributor-trends.json with time series data."""
    gov_donors = set(df[df["donor_type"] == "Government"]["donor_name"].unique())
    nongov_df = df[(df["donor_type"] != "Government") & (~df["is_other"])]
    nongov_donors = set(nongov_df["donor_name"].unique())
    
    # Group non-gov donors by category
    donor_to_cat = nongov_df.groupby("donor_name")["donor_type"].first().to_dict()
    categories = sorted(set(donor_to_cat.values()))
    cat_to_donors = {cat: sorted([d for d, c in donor_to_cat.items() if c == cat]) for cat in categories}
    
    # Build contributor time series
    data = defaultdict(lambda: defaultdict(lambda: {"assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "total": 0}))
    
    for _, row in df[~df["is_other"]].iterrows():
        year, donor, cat, amt = int(row["year"]), row["donor_name"], row["rev_cat"], row["amount"]
        if year not in YEARS or pd.isna(amt): continue
        
        if cat == "Assessed":
            data[donor][year]["assessed"] += amt
        elif cat == "Voluntary un-earmarked":
            data[donor][year]["voluntary_unearmarked"] += amt
        else:
            data[donor][year]["voluntary_earmarked"] += amt
        data[donor][year]["total"] += amt
    
    # Build aggregates (gov, non-gov, all, and per-category)
    aggregates = {"gov": [], "non-gov": [], "all": []}
    for cat in categories:
        aggregates[f"cat:{cat}"] = []
    
    for year in YEARS:
        gov_t = {"year": year, "assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "total": 0}
        nongov_t = {"year": year, "assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "total": 0}
        cat_totals = {cat: {"year": year, "assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "total": 0} for cat in categories}
        
        for d in gov_donors:
            for k in ["assessed", "voluntary_earmarked", "voluntary_unearmarked", "total"]:
                gov_t[k] += data[d][year][k]
        for d in nongov_donors:
            cat = donor_to_cat.get(d, "Other")
            for k in ["assessed", "voluntary_earmarked", "voluntary_unearmarked", "total"]:
                nongov_t[k] += data[d][year][k]
                if cat in cat_totals:
                    cat_totals[cat][k] += data[d][year][k]
        
        aggregates["gov"].append(gov_t)
        aggregates["non-gov"].append(nongov_t)
        aggregates["all"].append({k: gov_t[k] + nongov_t[k] for k in gov_t})
        for cat in categories:
            aggregates[f"cat:{cat}"].append(cat_totals[cat])
    
    contributors = {d: [{"year": y, **data[d][y]} for y in YEARS] for d in sorted(gov_donors | nongov_donors)}
    
    output = {
        "meta": {
            "years": YEARS,
            "governmentContributors": sorted(gov_donors),
            "nonGovContributors": sorted(nongov_donors),
            "nonGovCategories": {cat: cat_to_donors[cat] for cat in categories},
        },
        "aggregates": aggregates,
        "contributors": contributors
    }
    
    with open(OUT / "contributor-trends.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"contributor-trends.json: {len(contributors)} contributors, {len(categories)} categories")

if __name__ == "__main__":
    print("Loading fused data...")
    df, state_info = load_data()
    print(f"Loaded {len(df)} rows, {len(state_info)} states")
    
    export_donors_json(df, state_info)
    export_entity_revenue_json(df)
    export_contributor_trends_json(df)
    print("Done.")
