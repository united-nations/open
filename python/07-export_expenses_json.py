"""Export expenses data to JSON for frontend consumption."""
import json
import pandas as pd
from ceb_data import select_geographic_totals, select_sdg_expenses, resolve_reporting_entities, resolve_geographic_reporting_entities
from pathlib import Path
import country_converter as coco
from utils import normalize_entity, normalize_country_name
from country_coordinates import COUNTRY_CENTROIDS

OUT = Path("public/data")


cc = coco.CountryConverter()

def load_fused_expenses() -> pd.DataFrame:
    df = pd.read_csv("data/ceb/fused/expenses.csv")
    df["entity"] = df["entity"].apply(normalize_entity)
    return df

def load_sdg_expenses() -> pd.DataFrame:
    df = select_sdg_expenses(pd.read_csv("data/ceb/clean/expenses_sdgs.csv"))
    controls = pd.read_csv("data/ceb/clean/expenses_sub_agency.csv")
    df = resolve_reporting_entities(df, "entity_code", controls, [(controls, "agency", "sub_agency")])
    df = df.rename(columns={"calendar_year": "year", "entity_code": "entity", "sdg_goal": "sdg"})
    df["entity"] = df["entity"].apply(normalize_entity)
    return df

def get_iso3(country: str) -> str | None:
    result = cc.convert(normalize_country_name(country), to="ISO3", not_found=None)
    if isinstance(result, list): return result[0] if len(result) == 1 else None
    return result if result else None

def load_country_expenses() -> pd.DataFrame:
    df = select_geographic_totals(pd.read_csv("data/ceb/clean/expenses_by_country_region_sub_agency.csv"))
    df = resolve_geographic_reporting_entities(df, pd.read_csv("data/ceb/clean/expenses_sub_agency.csv"))
    df = df.rename(columns={"calendar_year": "year", "agency": "entity", "country/territory": "country"})
    df["entity"] = df["entity"].apply(normalize_entity)
    df = df[df["location_type"] == "COU"]
    # Resolve each source label once. Preserve unrecognized country-level rows
    # rather than silently dropping their money; map positions are illustrative.
    codes = {name: get_iso3(name) for name in df["country"].unique()}
    df["iso3"] = df["country"].map(lambda name: codes[name] if isinstance(codes[name], str) and len(codes[name]) == 3 else f"country:{normalize_country_name(name)}")
    return df

def export_entity_spending(expenses: pd.DataFrame):
    years = sorted(expenses["year"].unique())
    for year in years:
        df = expenses[expenses["year"] == year]
        data = df[["entity", "source", "year", "amount"]].to_dict(orient="records")
        with open(OUT / f"entity-spending-{year}.json", "w") as f:
            json.dump(data, f, indent=2)
        print(f"entity-spending-{year}.json: {len(data)} entities")

def load_ceb_expense_controls() -> pd.DataFrame:
    controls = pd.read_csv("data/ceb/clean/expenses_sub_agency.csv")
    controls = controls.rename(columns={"calendar_year": "year", "agency": "entity"})
    controls["entity"] = controls["entity"].map(normalize_entity)
    return controls


def build_sdg_expenses(sdg: pd.DataFrame, controls: pd.DataFrame) -> dict:
    """Preserve reported SDG actuals and reconcile each entity to CEB expenses.

    Non-SDG preserves reported x00. Not specified is the remaining
    balance after SDGs 1-17 and Non-SDG; neither is added twice.
    Only years with SDG observations are exported. Negative residuals remain
    signed discrepancies, not inferred negative allocations to any SDG.
    """
    if sdg.amount.isna().any() or controls.amount.isna().any():
        raise ValueError("Missing SDG expense or CEB control amount")
    unknown = set(sdg.sdg.astype(str).str.lower()) - {*map(str, range(1, 18)), "x00"}
    if unknown:
        raise ValueError(f"Unknown SDG classifications: {sorted(unknown)}")
    output = {}
    years = sorted(sdg["year"].unique())
    for year in years:
        df = sdg[sdg["year"] == year]
        totals = controls[controls.year == year].groupby("entity").amount.sum().to_dict()
        missing_controls = set(df.entity) - set(totals)
        if not totals or missing_controls:
            raise ValueError(f"Missing CEB expense controls for {year}: {sorted(missing_controls)}")
        data = {}
        for sdg_num in [*range(1, 18), "non_sdg"]:
            key = "x00" if sdg_num == "non_sdg" else str(sdg_num)
            sdg_df = df[df["sdg"].astype(str).str.lower() == key]
            entities = sdg_df.groupby("entity")["amount"].sum().to_dict()
            data[str(sdg_num)] = {"total": sum(entities.values()), "entities": entities}
            if "type_of_financial_information" in sdg_df:
                data[str(sdg_num)]["financialInformationTypes"] = {
                    code: {"total": float(rows.amount.sum()),
                           "entities": rows.groupby("entity").amount.sum().to_dict()}
                    for code, rows in sdg_df.groupby("type_of_financial_information")
                }
        reported = data["non_sdg"]["entities"]
        residuals = {
            entity: amount - sum(data[str(goal)]["entities"].get(entity, 0) for goal in range(1, 18))
            for entity, amount in sorted(totals.items())
        }
        adjustments = {entity: amount - reported.get(entity, 0) for entity, amount in residuals.items()}
        data["non_sdg"]["basis"] = "Reported CEB x00 expenditure (Non-SDG), including accrual and budgetary accounting bases."
        data["sdg_not_specified"] = {
            "total": sum(adjustments.values()),
            "entities": adjustments,
            "basis": "CEB entity expenses minus reported accrual and budgetary-basis expenditure for SDGs 1-17 and reported Non-SDG (x00); includes missing SDG reporting and signed reconciliation differences.",
        }
        output[int(year)] = data
    return output


def export_sdg_expenses(sdg: pd.DataFrame):
    for year, data in build_sdg_expenses(sdg, load_ceb_expense_controls()).items():
        with open(OUT / f"sdg-expenses-{year}.json", "w") as f:
            json.dump(data, f, indent=2, allow_nan=False)
        total = sum(d["total"] for d in data.values())
        print(f"sdg-expenses-{year}.json: ${total/1e9:.1f}B")

def export_country_expenses(country: pd.DataFrame):
    years = sorted(country["year"].unique())
    for year in years:
        df = country[country["year"] == year]
        data = []
        for iso3, group in df.groupby("iso3"):
            coords = COUNTRY_CENTROIDS.get(iso3, (-52, -135))
            entities = group.groupby("entity")["amount"].sum().to_dict()
            entities = dict(sorted(entities.items(), key=lambda x: -x[1]))
            name = cc.convert(iso3, to="name_short", not_found=iso3) if len(iso3) == 3 else normalize_country_name(group["country"].iloc[0])
            name = normalize_country_name(name)
            region = group["region"].mode().iloc[0] if len(group["region"].mode()) else "Unknown"
            data.append({
                "iso3": iso3, "name": name, "region": region,
                "lat": coords[0], "long": coords[1],
                "total": round(group["amount"].sum(), 2),
                "entities": {k: round(v, 2) for k, v in entities.items()}
            })
        data = sorted(data, key=lambda x: -x["total"])
        with open(OUT / f"country-expenses-{year}.json", "w") as f:
            json.dump(data, f, indent=2)
        print(f"country-expenses-{year}.json: {len(data)} countries")

if __name__ == "__main__":
    print("Loading data...")
    expenses = load_fused_expenses()
    sdg = load_sdg_expenses()
    country = load_country_expenses()
    
    print(f"\nExporting entity spending ({expenses['year'].nunique()} years)...")
    export_entity_spending(expenses)
    
    print(f"\nExporting SDG expenses ({sdg['year'].nunique()} years)...")
    export_sdg_expenses(sdg)
    
    print(f"\nExporting country expenses ({country['year'].nunique()} years)...")
    export_country_expenses(country)
    
    print("\nDone.")
