"""Fuse CEB revenue data from multiple sources into unified contributor breakdown.

Tiered approach:
- 2013-2020: named donors + unattributed residual per financing instrument
- 2021 onwards: contributor-type detail, reconciled to entity/instrument controls
"""
import pandas as pd
from pathlib import Path
from revenue_categories import rev_category
from ceb_data import revenue_controls, resolve_reporting_entities
from utils import normalize_entity
from utils import clean_donor_name, NON_GOVERNMENT_DONORS, GENERIC_DONORS, DONOR_CATEGORY_OVERRIDES

ceb = Path("data/ceb")
clean, fused = ceb / "clean", ceb / "fused"
fused.mkdir(exist_ok=True)

def load(filename: str) -> pd.DataFrame:
    return pd.read_csv(clean / filename)

def load_contrib_mapping() -> tuple[dict, dict]:
    """Load C-code mapping including alt_descriptors for normalization."""
    df = pd.read_csv(ceb / "contrib_types_mapping.csv")
    code_to_name = dict(zip(df["code"], df["name"]))
    desc_to_code = {}
    for _, row in df.iterrows():
        if pd.notna(row.get("alt_descriptors")) and row["alt_descriptors"]:
            for desc in str(row["alt_descriptors"]).split("|"):
                desc_to_code[desc.strip()] = row["code"]
    return code_to_name, desc_to_code

def load_rev_type_mapping() -> dict:
    """Load rev_type text -> R-code mapping."""
    # Text descriptions to R-codes
    return {
        "Assessed Contributions": "R01", "Assessed contributions": "R01",
        "Voluntary core (un-earmarked) contributions": "R02A",
        "Voluntary non-core (earmarked) contributions": "R03E",  # Default to project-specific
        "Revenue from other activities": "R04A",
    }

def normalize_rev_type(rt: str, mapping: dict) -> str:
    """Normalize rev_type to R-code."""
    if pd.isna(rt): raise ValueError("Missing financing instrument")
    rt = str(rt).strip()
    if rt.startswith("R") and len(rt) <= 4:
        return rt.upper().replace("R08B", "R08B").replace("R08b", "R08B")
    return mapping[rt]

def normalize_contrib_type(ct: str, desc_to_code: dict) -> str | None:
    """Normalize contrib_type to C-code."""
    if pd.isna(ct): return None
    ct = str(ct).strip()
    if ct.startswith("C") and len(ct) <= 4: return ct
    if ct in ["1", "2"]: return None
    return desc_to_code.get(ct)

def get_donor_info(donor_name: str, contrib_code: str | None, code_to_name: dict) -> tuple[str, str, str, bool]:
    """Get normalized donor info: (name, contrib_code, donor_type, is_other)."""
    name = clean_donor_name(donor_name)
    is_other = name in GENERIC_DONORS
    
    # Apply category override if exists
    if name in DONOR_CATEGORY_OVERRIDES:
        code = DONOR_CATEGORY_OVERRIDES[name]
    else:
        code = contrib_code
    
    dtype = code_to_name.get(code, "Non-Government") if code else "Non-Government"
    return name, code or "Unknown", dtype, is_other

def fuse_revenue():
    code_to_name, desc_to_code = load_contrib_mapping()
    rev_type_map = load_rev_type_mapping()
    
    revenue = revenue_controls(load("revenue.csv"), load("revenue_sub_agency.csv")).rename(columns={"agency": "entity"})
    gov = load("revenue_government_donors.csv")
    gov["rev_code"] = gov["rev_type"].apply(lambda x: normalize_rev_type(x, rev_type_map))
    
    nongov = load("revenue_non_gov_donors.csv")
    nongov["contrib_code"] = nongov["contrib_type"].apply(lambda x: normalize_contrib_type(x, desc_to_code))
    nongov["rev_code"] = nongov["rev_type"].apply(lambda x: normalize_rev_type(x, rev_type_map))
    
    contrib_type = load("revenue_contrib_type.csv")
    unknown = set(contrib_type["contrib_type"].dropna()) - set(code_to_name)
    unknown.update(set(nongov["contrib_code"].dropna()) - set(code_to_name))
    if unknown:
        raise ValueError(f"Unknown CEB contributor codes: {sorted(unknown)}")
    
    # Reconcile at the four financing instruments: donor sources do not all
    # retain the detailed R-subtype, so subtype-level residuals would be false precision.
    canonical = {"Assessed": "R01", "Voluntary un-earmarked": "R02A", "Voluntary earmarked": "R03E", "Other": "R04A"}
    revenue["rev_code"] = revenue["rev_type"].map(lambda value: normalize_rev_type(value, rev_type_map))
    contrib_type["rev_code"] = contrib_type["rev_type"].map(lambda value: normalize_rev_type(value, rev_type_map))
    for frame in [revenue, gov, nongov, contrib_type]:
        frame["entity"] = frame["entity"].map(normalize_entity)
        frame["rev_code"] = frame["rev_code"].map(lambda code: canonical[rev_category(code)])
    years = sorted(set(revenue["calendar_year"]) & set(gov["calendar_year"]))
    reporting_controls = revenue.rename(columns={"entity": "agency"})
    breakdowns = [(load("revenue_by_financing_instruments_and_government_contributors.csv"), "entity", "sub_entity"),
                  (load("expenses_sub_agency.csv"), "agency", "sub_agency")]
    gov, nongov, contrib_type = [resolve_reporting_entities(
        frame[frame.calendar_year.isin(years)], "entity", reporting_controls, breakdowns)
        for frame in (gov, nongov, contrib_type)]
    results = []
    for (year, entity), controls in revenue[revenue["calendar_year"].isin(years)].groupby(["calendar_year", "entity"]):
        rows = []
        def add(code, rev, name, amount, other, dtype=None):
            if pd.isna(amount) or abs(amount) < 0.000001:
                return
            rows.append({"entity": entity, "year": year, "contrib_code": code,
                         "rev_type": rev, "donor_type": dtype or code_to_name.get(code, "Unattributed"),
                         "donor_name": name, "amount": float(amount), "is_other": other})
        g = gov[(gov["calendar_year"] == year) & (gov["entity"] == entity)]
        n = nongov[(nongov["calendar_year"] == year) & (nongov["entity"] == entity)]
        for _, row in g.dropna(subset=["amount"]).iterrows():
            name = clean_donor_name(row["government_donor"])
            code = "C08B" if name in NON_GOVERNMENT_DONORS else "C01"
            add(code, row["rev_code"], name, row["amount"], name in GENERIC_DONORS,
                "Other" if code == "C08B" else "Government")
        for _, row in n.dropna(subset=["amount"]).iterrows():
            name, code, dtype, other = get_donor_info(row.get("donor", "Unknown"), row.get("contrib_code"), code_to_name)
            add(code, row["rev_code"], name, row["amount"], other, dtype)
        if year >= 2021:
            ct = contrib_type[(contrib_type["calendar_year"] == year) & (contrib_type["entity"] == entity)]
            for (code, rev), group in ct.groupby(["contrib_type", "rev_code"]):
                # Contributor-category controls supply identity detail, never
                # override the authoritative entity/instrument control below.
                named = sum(r["amount"] for r in rows if r["contrib_code"] == code and r["rev_type"] == rev)
                name = "Revenue from Activities" if code == "C09" else f"Other {code_to_name.get(code, code)}"
                add(code, rev, name, group["amount"].sum(min_count=1) - named, True)
        amounts = controls.groupby("rev_code")["amount"].sum().to_dict()
        for rev in sorted(set(amounts) | {r["rev_type"] for r in rows}):
            residual = amounts.get(rev, 0) - sum(r["amount"] for r in rows if r["rev_type"] == rev)
            add("Unknown", rev, "Unattributed", residual, True, "Unattributed")
        results.extend(rows)

    df = pd.DataFrame(results)
    df = df.sort_values(["year", "entity", "donor_type", "rev_type", "amount"], ascending=[True, True, True, True, False])
    validate(df, revenue, years)
    df.to_csv(fused / "revenue_by_contributor.csv", index=False)
    print(f"Wrote {len(df)} rows to {fused / 'revenue_by_contributor.csv'}")
    
    return df

def validate(df: pd.DataFrame, revenue: pd.DataFrame, years: list):
    """Run validation assertions on fused data."""
    print("\n=== Validation ===")
    
    controls = revenue[revenue["calendar_year"].isin(years)].groupby(["calendar_year", "entity", "rev_code"])["amount"].sum()
    actual = df.groupby(["year", "entity", "rev_type"])["amount"].sum()
    controls.index.names = actual.index.names
    difference = actual.subtract(controls, fill_value=0)
    assert difference.abs().max() < 0.01, difference[difference.abs() >= 0.01].to_dict()
    assert df["amount"].notna().all(), "Missing fused amounts"
    assert set(years) == set(df["year"].unique()), "Missing years"
    print(f"\nAll {len(years)} years validated.")

if __name__ == "__main__":
    fuse_revenue()
