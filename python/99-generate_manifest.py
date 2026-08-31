"""Generate data manifest with available years for each dataset."""
import json
from pathlib import Path

from utils import FUSE_SECRETARIAT

OUT = Path("public/data")

def detect_years(pattern: str) -> list[int]:
    """Find all years available for a given file pattern."""
    files = sorted(OUT.glob(f"{pattern}-*.json"))
    return sorted({int(f.stem.split("-")[-1]) for f in files})

def generate_manifest():
    # Years with secretariat sub-entity breakdown (fused with CEB).
    # Empty when fusion is disabled, so the frontend shows CEB aggregates for all years.
    FUSION_YEARS = [2019, 2020, 2021, 2022, 2023] if FUSE_SECRETARIAT else []
    
    manifest = {
        "donors": {"years": detect_years("donors"), "default": "latest"},
        "entityRevenue": {"years": detect_years("entity-revenue"), "default": "latest"},
        "entitySpending": {"years": detect_years("entity-spending"), "default": "latest", "fusionYears": FUSION_YEARS },
        "countryExpenses": {"years": detect_years("country-expenses"), "default": "latest"},
        "sdgExpenses": {"years": detect_years("sdg-expenses"), "default": "latest"},
        "regularBudgetContributors": {"years": detect_years("regular-budget-contributors"), "default": "latest"},
        "trustFundContributors": {"years": detect_years("trust-fund-contributors"), "default": "latest"},
        "secretariatOverview": {"years": detect_years("secretariat-overview"), "default": "latest"},
        "budgetAuditedPpb": {"years": detect_years("budget-audited-ppb"), "default": "latest"},
        "budgetAuditedPko": {"years": detect_years("budget-audited-pko"), "default": "latest"},
        "budgetTrustFunds": {"years": detect_years("budget-trust-funds"), "default": "latest"},
        # Budget documents (python/12). PPB is keyed by target budget year;
        # proposed, approved and expenditure files cover different subsets.
        # PKO is keyed by the first year and starts at 2022, which is its
        # 2022/23 cycle and matches audited PKO file 2023 (keyed by ending year).
        "budgetPpb": {"years": detect_years("budget-ppb"), "default": "latest"},
        "budgetPko": {"years": detect_years("budget-pko"), "default": "latest"},
    }
    
    # Add min/max for convenience
    for key, val in manifest.items():
        if val["years"]:
            val["min"] = min(val["years"])
            val["max"] = max(val["years"])
            if val["default"] == "latest":
                val["default"] = val["max"]
    
    out_path = OUT / "manifest.json"
    out_path.write_text(json.dumps(manifest, indent=2))
    
    print("Generated manifest.json:")
    for key, val in manifest.items():
        fusion = f", fusion: {val['fusionYears']}" if 'fusionYears' in val else ""
        print(f"  {key}: {val['min']}-{val['max']} (default: {val['default']}{fusion})")

if __name__ == "__main__":
    generate_manifest()
