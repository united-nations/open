"""Fuse CEB revenue data from multiple sources into unified contributor breakdown.

Tiered approach:
- 2009-2010: partial non-government donor observations without system controls
- 2011-2020: available named donors + unattributed residual per financing instrument
- 2021 onwards: contributor-type detail, reconciled to entity/instrument controls
"""
import pandas as pd
from pathlib import Path
from revenue_categories import rev_category, UNRESOLVED_FINANCING_CODES
from ceb_data import revenue_controls, resolve_reporting_entities
from utils import normalize_entity
from utils import clean_donor_name, GENERIC_DONORS

ceb = Path("data/ceb")
clean, fused = ceb / "clean", ceb / "fused"
fused.mkdir(exist_ok=True)

def load(filename: str) -> pd.DataFrame:
    return pd.read_csv(clean / filename)

def load_contrib_mapping() -> tuple[dict, dict]:
    """Load C-code mapping including alt_descriptors for normalization."""
    df = pd.read_csv(ceb / "contrib_types_mapping.csv")
    code_to_name = dict(zip(df["code"], df["name"]))
    desc_to_code = dict(zip(df["name"], df["code"]))
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
        "Voluntary core (un-earmarked) contributions": "R02",
        "Voluntary non-core (earmarked) contributions": "R03",
        "Revenue from other activities": "R04",
    }

def normalize_rev_type(rt: str, mapping: dict) -> str:
    """Normalize rev_type to R-code."""
    if pd.isna(rt): raise ValueError("Missing financing instrument")
    rt = str(rt).strip()
    if rt.startswith("R") and len(rt) <= 4:
        return rt.upper()
    return mapping[rt]

def normalize_contrib_type(ct: str, desc_to_code: dict) -> str | None:
    """Normalize contrib_type to C-code."""
    if pd.isna(ct): return None
    ct = str(ct).strip()
    if ct.startswith("C") and len(ct) <= 4: return ct
    if ct in ["1", "2"]: return None
    if ct not in desc_to_code:
        raise ValueError(f"Unknown source contributor category: {ct}")
    return desc_to_code[ct]

def get_donor_info(donor_name: str, contrib_code: str | None, code_to_name: dict) -> tuple[str, str, str, bool]:
    """Get normalized donor info: (name, contrib_code, donor_type, is_other)."""
    missing_name = pd.isna(donor_name)
    name = "Unidentified non-government contributors" if missing_name else clean_donor_name(donor_name)
    is_other = missing_name or name in GENERIC_DONORS
    
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
    nongov["source_row"] = nongov.index + 2
    gov["source_row"] = gov.index + 2
    nongov["contrib_code"] = nongov["contrib_type"].apply(lambda x: normalize_contrib_type(x, desc_to_code))
    nongov["rev_code"] = nongov["rev_type"].apply(lambda x: normalize_rev_type(x, rev_type_map))
    
    contrib_type = load("revenue_contrib_type.csv")
    unknown = set(contrib_type["contrib_type"].dropna()) - set(code_to_name)
    unknown.update(set(nongov["contrib_code"].dropna()) - set(code_to_name))
    if unknown:
        raise ValueError(f"Unknown CEB contributor codes: {sorted(unknown)}")
    
    # Reconcile at the four financing instruments: donor sources do not all
    # retain the detailed R-subtype, so subtype-level residuals would be false precision.
    canonical = {"Assessed": "R01", "Voluntary un-earmarked": "R02", "Voluntary earmarked": "R03", "Other": "R04"}
    revenue["rev_code"] = revenue["rev_type"].map(lambda value: normalize_rev_type(value, rev_type_map))
    contrib_type["rev_code"] = contrib_type["rev_type"].map(lambda value: normalize_rev_type(value, rev_type_map))
    for frame in [revenue, gov, nongov, contrib_type]:
        frame["entity"] = frame["entity"].map(normalize_entity)
        frame["rev_code"] = frame["rev_code"].map(lambda code: "" if code in UNRESOLVED_FINANCING_CODES else canonical[rev_category(code)])
    control_years = set(revenue["calendar_year"])
    years = sorted(control_years | set(nongov["calendar_year"]))
    reporting_controls = revenue.rename(columns={"entity": "agency"})
    breakdowns = [(load("revenue_by_financing_instruments_and_government_contributors.csv"), "entity", "sub_entity"),
                  (load("expenses_sub_agency.csv"), "agency", "sub_agency")]
    early_nongov = nongov[~nongov.calendar_year.isin(control_years)].copy()
    gov, nongov, contrib_type = [resolve_reporting_entities(
        frame[frame.calendar_year.isin(control_years)], "entity", reporting_controls, breakdowns)
        for frame in (gov, nongov, contrib_type)]
    nongov = pd.concat([nongov, early_nongov], ignore_index=True)
    results = []
    keys = set(map(tuple, revenue[["calendar_year", "entity"]].to_numpy()))
    keys.update(map(tuple, early_nongov[["calendar_year", "entity"]].to_numpy()))
    for year, entity in sorted(keys):
        controls = revenue[(revenue.calendar_year == year) & (revenue.entity == entity)]
        rows = []
        def add(code, rev, name, amount, kind, dtype=None, source=None, source_file=None):
            if pd.isna(amount):
                return
            # A reported zero is an observation, not missing coverage. Suppress
            # only floating-point-zero calculated balances.
            if kind == "calculated_balance" and abs(amount) < 0.000001:
                return
            source = source if source is not None else {}
            rows.append({"entity": entity, "year": year, "contrib_code": code,
                         "rev_type": rev, "donor_type": dtype or code_to_name.get(code, "Unattributed"),
                         "donor_name": name, "amount": float(amount), "record_kind": kind,
                         "is_other": kind == "calculated_balance", "financing_resolved": bool(rev),
                         "source_donor_name": source.get("government_donor", source.get("donor")),
                         "source_contrib_type": source.get("contrib_type"),
                         "source_rev_type": source.get("rev_type"),
                         "source_row": source.get("source_row"), "source_file": source_file})
        g = gov[(gov["calendar_year"] == year) & (gov["entity"] == entity)]
        n = nongov[(nongov["calendar_year"] == year) & (nongov["entity"] == entity)]
        for _, row in g.dropna(subset=["amount"]).iterrows():
            name = clean_donor_name(row["government_donor"])
            code = normalize_contrib_type(row.get("contrib_type", "Government"), desc_to_code)
            if code is None:
                raise ValueError(f"Unknown government source category: {row.get('contrib_type')}")
            kind = "reported_aggregate" if name in GENERIC_DONORS else "reported_named"
            add(code, row["rev_code"], name, row["amount"], kind, source=row,
                source_file="revenue_government_donors.csv")
        for _, row in n.dropna(subset=["amount"]).iterrows():
            name, code, dtype, aggregate = get_donor_info(row.get("donor"), row.get("contrib_code"), code_to_name)
            add(code, row["rev_code"], name, row["amount"],
                "reported_aggregate" if aggregate else "reported_named", dtype, row,
                "revenue_non_gov_donors.csv")
        if year >= 2021:
            ct = contrib_type[(contrib_type["calendar_year"] == year) & (contrib_type["entity"] == entity)]
            for (code, rev), group in ct.groupby(["contrib_type", "rev_code"]):
                # Contributor-category controls supply identity detail, never
                # override the authoritative entity/instrument control below.
                named = sum(r["amount"] for r in rows if r["contrib_code"] == code and r["rev_type"] == rev)
                name = f"Other {code_to_name.get(code, code)}"
                add(code, rev, name, group["amount"].sum(min_count=1) - named, "calculated_balance")
        amounts = controls.groupby("rev_code")["amount"].sum().to_dict()
        for rev in sorted(set(amounts) | {r["rev_type"] for r in rows if r["financing_resolved"]}) if year in control_years else []:
            residual = amounts.get(rev, 0) - sum(r["amount"] for r in rows if r["rev_type"] == rev)
            add("Unknown", rev, "Unattributed", residual, "calculated_balance", "Unattributed")
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
    actual = df[df.year.isin(revenue.calendar_year.unique()) & df.financing_resolved].groupby(["year", "entity", "rev_type"])["amount"].sum()
    controls.index.names = actual.index.names
    difference = actual.subtract(controls, fill_value=0)
    assert difference.abs().max() < 0.01, difference[difference.abs() >= 0.01].to_dict()
    assert df["amount"].notna().all(), "Missing fused amounts"
    assert set(years) == set(df["year"].unique()), "Missing years"
    print(f"\nAll {len(years)} years validated.")

if __name__ == "__main__":
    fuse_revenue()
