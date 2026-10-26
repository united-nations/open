"""Export contributor data to JSON for frontend consumption."""
import json
import pandas as pd
from pathlib import Path
from collections import defaultdict
from utils import normalize_entity

YEARS = []  # Populated from validated fused coverage in load_data().
OUT = Path("public/data")

from revenue_categories import rev_category

def load_data():
    global YEARS
    fused = pd.read_csv("data/ceb/fused/revenue_by_contributor.csv")
    YEARS = sorted(int(year) for year in fused["year"].unique())
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
    control_years = set(pd.read_csv("data/ceb/clean/revenue.csv").calendar_year)
    for year in sorted(control_years):
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

def export_coverage_json():
    """Disclose which year totals are controlled and which donor detail exists."""
    sources = {key: set(pd.read_csv(f"data/ceb/clean/{name}.csv").calendar_year)
               for key, name in {"controls": "revenue", "government": "revenue_government_donors",
                                 "nonGovernment": "revenue_non_gov_donors"}.items()}
    coverage = {}
    for year in YEARS:
        note = None
        if year not in sources["controls"]:
            note = "Partial non-government donor records only. System-wide revenue totals and government donor detail are unavailable; this is not total UN funding."
        elif year not in sources["government"]:
            note = "Government donor detail is unavailable. Reported non-government contributors are shown; the remaining revenue is Unattributed, not non-government funding."
        coverage[year] = {key: year in values for key, values in sources.items()} | {"note": note}
    (OUT / "revenue-coverage.json").write_text(json.dumps(coverage, indent=2) + "\n")


def export_contributor_trends_json(df: pd.DataFrame):
    """Generate contributor-trends.json with time series data."""
    # Match the treemap: known contributor types include their aggregate Other
    # entries; the instrument-level reconciliation balance stays Unattributed.
    attributed = df[df["donor_name"] != "Unattributed"]
    gov_donors = set(attributed[attributed["donor_type"] == "Government"]["donor_name"].unique())
    nongov_df = attributed[attributed["donor_type"] != "Government"]
    nongov_donors = set(nongov_df["donor_name"].unique())
    unattributed_donors = set(df[df["donor_name"] == "Unattributed"]["donor_name"].unique())
    
    # Group non-gov donors by category
    categories = sorted(nongov_df["donor_type"].unique())
    cat_to_donors = {cat: sorted(nongov_df[nongov_df["donor_type"] == cat]["donor_name"].unique()) for cat in categories}
    
    # Build contributor time series
    data = defaultdict(lambda: defaultdict(lambda: {"assessed": 0, "voluntary_earmarked": 0, "voluntary_unearmarked": 0, "other": 0, "total": 0}))
    
    for _, row in df.iterrows():
        year, donor, cat, amt = int(row["year"]), row["donor_name"], row["rev_cat"], row["amount"]
        if year not in YEARS or pd.isna(amt): continue
        
        if cat == "Assessed":
            data[donor][year]["assessed"] += amt
        elif cat == "Voluntary un-earmarked":
            data[donor][year]["voluntary_unearmarked"] += amt
        elif cat == "Voluntary earmarked":
            data[donor][year]["voluntary_earmarked"] += amt
        else:
            data[donor][year]["other"] += amt
        data[donor][year]["total"] += amt
    
    # Build aggregates (gov, non-gov, all, and per-category)
    aggregates = {"gov": [], "non-gov": [], "unattributed": [], "all": []}
    for cat in categories:
        aggregates[f"cat:{cat}"] = []
    
    for year in YEARS:
        year_rows = df[df["year"] == year]
        balance = year_rows["donor_name"] == "Unattributed"
        government = (year_rows["donor_type"] == "Government") & ~balance
        groups = {"gov": year_rows[government],
                  "non-gov": year_rows[~government & ~balance],
                  "unattributed": year_rows[balance], "all": year_rows}
        for cat in categories:
            groups[f"cat:{cat}"] = groups["non-gov"][groups["non-gov"]["donor_type"] == cat]
        keys = {"Assessed": "assessed", "Voluntary un-earmarked": "voluntary_unearmarked", "Voluntary earmarked": "voluntary_earmarked", "Other": "other"}
        for group, rows in groups.items():
            totals = {"year": year, **dict.fromkeys([*keys.values(), "total"], 0)}
            for category, amount in rows.groupby("rev_cat")["amount"].sum().items():
                totals[keys[category]] += float(amount)
                totals["total"] += float(amount)
            aggregates[group].append(totals)
    
    observed = set(zip(df.donor_name, df.year))
    contributors = {}
    for donor in sorted(gov_donors | nongov_donors | unattributed_donors):
        series = []
        for year in YEARS:
            point = {"year": year, **data[donor][year]}
            # Early donor coverage is partial: no record does not establish zero.
            if year < 2013 and (donor, year) not in observed:
                point["available"] = False
            series.append(point)
        contributors[donor] = series
    
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
    
    export_coverage_json()
    export_donors_json(df, state_info)
    export_entity_revenue_json(df)
    export_contributor_trends_json(df)
    print("Done.")
