"""Generate data manifest with available years for each dataset."""
import json
from pathlib import Path

OUT = Path("public/data")

def detect_years(pattern: str) -> list[int]:
    """Find all years available for a given file pattern."""
    files = sorted(OUT.glob(f"{pattern}-*.json"))
    return sorted({int(f.stem.removeprefix(pattern + "-")) for f in files if f.stem.removeprefix(pattern + "-").isdigit()})

def generate_manifest():
    manifest = {
        "personnel": {"years": detect_years("personnel"), "default": "latest"},
        "donors": {"years": detect_years("donors"), "default": "latest"},
        "cebAssessments": {"years": detect_years("ceb-assessments"), "default": "latest"},
        "cebAssessmentOutstanding": {"years": detect_years("ceb-assessment-outstanding"), "default": "latest"},
        "entityRevenue": {"years": detect_years("entity-revenue"), "default": "latest"},
        "entitySpending": {"years": detect_years("entity-spending"), "default": "latest"},
        "functionGeography": {"years": detect_years("function-geography"), "default": "latest"},
        "geographicExpenses": {"years": detect_years("geographic-expenses"), "default": "latest"},
        "countryExpenses": {"years": detect_years("country-expenses"), "default": "latest"},
        "sdgExpenses": {"years": detect_years("sdg-expenses"), "default": "latest"},
        "regularBudgetContributors": {"years": detect_years("regular-budget-contributors"), "default": "latest"},
        "regularBudgetOutstanding": {"years": detect_years("regular-budget-outstanding"), "default": "latest"},
        "peacekeepingContributors": {"years": detect_years("peacekeeping-contributors"), "default": "latest"},
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
        "budgetPpbApproved": {"years": detect_years("budget-ppb-approved"), "default": "latest"},
        "budgetPpbProposed": {"years": detect_years("budget-ppb-proposed"), "default": "latest"},
        "uninfoCountries": {"years": [2024], "default": 2024},
        "uninfoSdgs": {"years": [2024], "default": 2024},
        "budgetPko": {"years": detect_years("budget-pko"), "default": 2024},
        "budgetPkoApproved": {"years": detect_years("budget-pko-approved"), "default": "latest"},
        "budgetPkoProposed": {"years": detect_years("budget-pko-proposed"), "default": "latest"},
    }
    
    # The pilot 2020 edition's sparse expenditure hierarchy also limits its
    # 2019 approved and 2020 proposed projections. Keep files inspectable, but
    # do not offer these partial years as comparable main-view coverage.
    policy = json.loads(Path("data/ppb-display-policy.json").read_text())
    for key, rule in policy.items():
        available = manifest[key]["years"]
        manifest[key]["earlierPartialYears"] = [y for y in available if y < rule["minimumYear"]]
        manifest[key]["years"] = [y for y in available if y >= rule["minimumYear"]]

    # Funding-stream availability is independent of year availability (PPB 2018
    # publishes regular-budget expenditure only).
    manifest["budgetPpb"]["fundingSourcesByYear"] = {
        str(year): json.loads((OUT / f"budget-ppb-{year}.json").read_text())["meta"]["fundingSources"]
        for year in [*manifest["budgetPpb"]["earlierPartialYears"], *manifest["budgetPpb"]["years"]]
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
        print(f"  {key}: {val['min']}-{val['max']} (default: {val['default']})")

if __name__ == "__main__":
    generate_manifest()
