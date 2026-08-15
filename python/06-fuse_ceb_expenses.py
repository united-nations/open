"""Fuse CEB and Secretariat expenses data.

Tiered approach:
- All years: CEB entities (49 entities)
- 2019-2023: Replace UN/UN-DPO with secretariat sub-entities, add assessed for UNEP/UNODC
"""
import pandas as pd
from pathlib import Path
from utils import normalize_entity, FUSE_SECRETARIAT

ceb_dir = Path("data/ceb")
clean, fused = ceb_dir / "clean", ceb_dir / "fused"
fused.mkdir(exist_ok=True)

# Entities to exclude from secretariat (use CEB instead)
EXCLUDE_FROM_SEC = {"ITC", "UNHCR", "UNRWA"}
# Entities where secretariat assessed is additive to CEB
ADD_ASSESSED = {"UNEP", "UNODC"}
# CEB aggregates replaced by secretariat breakdown
REPLACE_AGGREGATES = {"UN", "UN-DPO"}

def load_ceb() -> pd.DataFrame:
    df = pd.read_csv(clean / "expenses_sub_agency.csv")
    df = df.rename(columns={"agency": "entity", "calendar_year": "year"})
    df["entity"] = df["entity"].apply(normalize_entity)
    return df[["year", "entity", "amount"]].copy()

def load_secretariat() -> pd.DataFrame:
    df = pd.read_csv("data/un-secretariat-expenses.csv")
    df = df.rename(columns={"ENTITY": "entity", "YEAR": "year", "AMOUNT": "amount", "SOURCE_TYPE": "source_type"})
    df["entity"] = df["entity"].apply(normalize_entity)
    return df[["year", "entity", "amount", "source_type"]].copy()

def fuse_expenses():
    ceb = load_ceb()
    if FUSE_SECRETARIAT:
        sec = load_secretariat()
    else:
        # Flag off: empty Secretariat frame => all years take the CEB-only (Tier 1) path.
        print("FUSE_SECRETARIAT=false: producing CEB-only expenses (no Secretariat fusion)")
        sec = pd.DataFrame(columns=["year", "entity", "amount", "source_type"])

    years = sorted(ceb["year"].unique())
    sec_years = set(sec["year"].unique())  # 2019-2023
    
    results = []
    
    for year in years:
        ceb_year = ceb[ceb["year"] == year]
        
        if year in sec_years:
            # Tier 2: Fusion with secretariat
            sec_year = sec[sec["year"] == year]
            
            # 1. CEB entities excluding aggregates
            ceb_keep = ceb_year[~ceb_year["entity"].isin(REPLACE_AGGREGATES)]
            for _, row in ceb_keep.iterrows():
                results.append({"year": year, "entity": row["entity"], "amount": row["amount"], "source": "ceb"})
            
            # 2. Secretariat sub-entities (excluding overlap entities that stay as CEB)
            sec_entities = sec_year[~sec_year["entity"].isin(EXCLUDE_FROM_SEC | ADD_ASSESSED)]
            sec_agg = sec_entities.groupby("entity")["amount"].sum().reset_index()
            for _, row in sec_agg.iterrows():
                results.append({"year": year, "entity": row["entity"], "amount": row["amount"], "source": "secretariat"})
            
            # 3. Add assessed contributions for UNEP/UNODC (additive to CEB)
            for entity in ADD_ASSESSED:
                assessed = sec_year[(sec_year["entity"] == entity) & (sec_year["source_type"] == "Regular assessed")]["amount"].sum()
                if assessed > 0:
                    results.append({"year": year, "entity": entity, "amount": assessed, "source": "secretariat_assessed"})
        else:
            # Tier 1: CEB only
            for _, row in ceb_year.iterrows():
                results.append({"year": year, "entity": row["entity"], "amount": row["amount"], "source": "ceb"})
    
    df = pd.DataFrame(results)
    
    # Aggregate by year/entity (combines CEB + assessed for UNEP/UNODC)
    df = df.groupby(["year", "entity"]).agg({"amount": "sum", "source": "first"}).reset_index()
    df = df.sort_values(["year", "entity"])
    
    df.to_csv(fused / "expenses.csv", index=False)
    print(f"Wrote {len(df)} rows to {fused / 'expenses.csv'}")
    
    validate(df, ceb, sec)
    return df

def validate(df: pd.DataFrame, ceb: pd.DataFrame, sec: pd.DataFrame):
    print("\n=== Validation ===")
    sec_years = set(sec["year"].unique())
    
    # 1. No duplicate entity/year combinations
    dups = df.groupby(["year", "entity"]).size()
    assert (dups == 1).all(), f"Duplicate entity/year: {dups[dups > 1].to_dict()}"
    print("✓ No duplicate entity/year combinations")
    
    # 2. Year coverage
    expected_years = set(range(2011, 2025))
    actual_years = set(df["year"].unique())
    assert expected_years == actual_years, f"Missing years: {expected_years - actual_years}"
    print(f"✓ All {len(expected_years)} years present (2011-2024)")
    
    # 3. Per-year validation
    print("\nPer-year totals:")
    for year in sorted(df["year"].unique()):
        yr = df[df["year"] == year]
        fused_total = yr["amount"].sum()
        ceb_total = ceb[ceb["year"] == year]["amount"].sum()
        n_entities = yr["entity"].nunique()
        
        # Total sanity check
        assert fused_total > 30e9, f"{year}: Total ${fused_total/1e9:.1f}B too low"
        assert fused_total < 100e9, f"{year}: Total ${fused_total/1e9:.1f}B too high"
        
        # Check for negative entity totals (can be legitimate for fund wind-downs)
        neg = yr[yr["amount"] < 0]
        if len(neg) > 0:
            for _, r in neg.iterrows():
                print(f"    ⚠ {r['entity']}: ${r['amount']/1e6:.2f}M (negative)")
        
        if year in sec_years:
            # Fusion years: verify secretariat coverage
            ceb_un = ceb[(ceb["year"] == year) & (ceb["entity"].isin(REPLACE_AGGREGATES))]["amount"].sum()
            sec_total = sec[sec["year"] == year]["amount"].sum()
            coverage = sec_total / ceb_un * 100 if ceb_un > 0 else 0
            
            # Verify UNEP/UNODC assessed additions
            for entity in ADD_ASSESSED:
                fused_amt = yr[yr["entity"] == entity]["amount"].sum()
                ceb_amt = ceb[(ceb["year"] == year) & (ceb["entity"] == entity)]["amount"].sum()
                assert fused_amt >= ceb_amt, f"{year} {entity}: Fused ${fused_amt/1e6:.0f}M < CEB ${ceb_amt/1e6:.0f}M"
            
            print(f"  {year}: {n_entities} entities, ${fused_total/1e9:.1f}B (CEB: ${ceb_total/1e9:.1f}B, sec coverage: {coverage:.0f}%) ✓")
        else:
            # Non-fusion years: should match CEB exactly
            diff_pct = abs(fused_total - ceb_total) / ceb_total * 100
            assert diff_pct < 0.1, f"{year}: Fused differs from CEB by {diff_pct:.2f}%"
            print(f"  {year}: {n_entities} entities, ${fused_total/1e9:.1f}B ✓")
    
    # 4. Entity source distribution
    print("\nSource distribution:")
    for source in df["source"].unique():
        n = df[df["source"] == source]["entity"].nunique()
        total = df[df["source"] == source]["amount"].sum()
        print(f"  {source}: {n} entities, ${total/1e9:.1f}B")
    
    # 5. Verify overlap entities use correct source
    for year in sec_years:
        yr = df[df["year"] == year]
        for entity in EXCLUDE_FROM_SEC:
            rows = yr[yr["entity"] == entity]
            if len(rows) > 0:
                assert rows.iloc[0]["source"] == "ceb", f"{year} {entity}: Should be CEB, got {rows.iloc[0]['source']}"
    print("✓ Overlap entities correctly sourced from CEB")
    
    print("\n✓ All validations passed")

if __name__ == "__main__":
    fuse_expenses()
