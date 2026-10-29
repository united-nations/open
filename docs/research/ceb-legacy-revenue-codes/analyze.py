"""Read-only reproduction of the CEB legacy-code investigation.

Run from the repository root:
    uv run python docs/research/ceb-legacy-revenue-codes/analyze.py
Optional archived-primary-source checks:
    uv run python docs/research/ceb-legacy-revenue-codes/analyze.py --fetch-archives

Writes evidence only beside this script. Does not import production classification
helpers: those helpers are what this investigation is evaluating.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
LEGACY_CODES = {"R05", "R07", "R08", "R08B", "R08b", "R09", "R10", "R11", "R12"}
CURRENT_ASSIGNMENTS = {
    "R01": "Assessed", "R02": "Voluntary un-earmarked",
    "R02A": "Voluntary un-earmarked", "R02B": "Voluntary un-earmarked",
    "R03": "Voluntary earmarked", "R03A": "Voluntary earmarked",
    "R03B": "Voluntary earmarked", "R03C": "Voluntary earmarked",
    "R03D": "Voluntary earmarked", "R03E": "Voluntary earmarked",
    "R03F": "Voluntary earmarked", "R04": "Other", "R04A": "Other",
    "R04B": "Other", "R04C": "Other", "R05": "Other",
    "R07": "Voluntary earmarked", "R08": "Voluntary un-earmarked",
    "R08B": "Voluntary un-earmarked", "R08b": "Voluntary un-earmarked",
    "R09": "Voluntary earmarked", "R10": "Voluntary earmarked",
    "R11": "Voluntary earmarked", "R12": "Voluntary earmarked",
}
CONTROL_LABELS = {
    "Assessed Contributions": "Assessed", "Assessed contributions": "Assessed",
    "Voluntary core (un-earmarked) contributions": "Voluntary un-earmarked",
    "Voluntary non-core (earmarked) contributions": "Voluntary earmarked",
    "Revenue from other activities": "Other",
}
# Only institution-code aliases needed to compare these historical files.
ENTITY_ALIASES = {"UNWTO": "UN Tourism", "UN-HABITAT": "UN-Habitat",
                  "UNHABITAT": "UN-Habitat", "UNWOMEN": "UN Women",
                  "UN-DPO": "Peacekeeping Operations", "DPKO": "Peacekeeping Operations"}
ARCHIVES = {
    "definitions_2017": "https://web.archive.org/web/20170710195326id_/http://www.unsceb.org/content/financial-statistics-definition-terms",
    "filter_2017": "https://web.archive.org/web/20170625134917id_/http://www.unsceb.org/content/FS-A00-01",
    "filter_2019": "https://web.archive.org/web/20190719055908id_/http://unsceb.org/content/FS-A00-01",
    "donors_2023": "https://web.archive.org/web/20230801175257id_/https://unsceb.org/sites/default/files/statistic_files/Financial/revenue_non_gov_donors.csv",
}


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def main(fetch_archives=False):
    inputs = {}
    frames = {}
    for name in ["revenue_non_gov_donors", "revenue_government_donors", "revenue"]:
        path = ROOT / "data/ceb/raw" / f"{name}.csv"
        inputs[str(path.relative_to(ROOT))] = sha(path.read_bytes())
        frames[name] = pd.read_csv(path)
    n, g, r = [frames[name] for name in ["revenue_non_gov_donors", "revenue_government_donors", "revenue"]]
    n["csv_record"] = n.index + 2  # Header counts as row 1; logical CSV records.
    legacy = n[n.rev_type.isin(LEGACY_CODES)].copy()
    profile = legacy.groupby("rev_type", dropna=False).agg(
        rows=("amount", "size"), first_year=("calendar_year", "min"),
        last_year=("calendar_year", "max"), amount_usd=("amount", "sum"),
        missing_description=("rev_name", lambda s: int(s.isna().sum())),
        entities=("entity", "nunique"), donors=("donor", "nunique"),
    )
    profile["current_assignment"] = profile.index.map(CURRENT_ASSIGNMENTS)
    profile.to_csv(OUT / "code-profile.csv")
    legacy.groupby(["rev_type", "donor"]).agg(
        rows=("amount", "size"), first_year=("calendar_year", "min"),
        last_year=("calendar_year", "max"), amount_usd=("amount", "sum"),
    ).to_csv(OUT / "code-donor-profile.csv")
    examples = legacy.sort_values("amount", ascending=False).groupby("rev_type", sort=True).head(3)
    examples[["csv_record", "calendar_year", "entity", "rev_type", "rev_name", "donor", "amount"]].to_csv(OUT / "source-examples.csv", index=False)
    comparisons = []
    for entity, year in [("UNDP", 2015), ("UNDP", 2016), ("UNICEF", 2017), ("UNFPA", 2016), ("IOM", 2017)]:
        control = r[(r.agency == entity) & (r.calendar_year == year)].copy()
        government = g[(g.entity == entity) & (g.calendar_year == year)].copy()
        donor = n[(n.entity == entity) & (n.calendar_year == year)].copy()
        control["main"] = control.rev_type.map(CONTROL_LABELS)
        government["main"] = government.rev_type.map(CONTROL_LABELS)
        donor["main"] = donor.rev_type.map(CURRENT_ASSIGNMENTS)
        for main_type in CONTROL_LABELS.values():
            if any(v["entity"] == entity and v["year"] == year and v["main_type"] == main_type for v in comparisons):
                continue
            total = float(control.loc[control.main == main_type, "amount"].sum())
            gov = float(government.loc[government.main == main_type, "amount"].sum())
            non_gov = float(donor.loc[donor.main == main_type, "amount"].sum())
            comparisons.append(dict(entity=entity, year=year, main_type=main_type,
                                    control_usd=total, government_detail_usd=gov,
                                    nongov_under_current_mapping_usd=non_gov,
                                    calculated_residual_usd=total - gov - non_gov))
    pd.DataFrame(comparisons).to_csv(OUT / "control-comparisons.csv", index=False)
    # Test the tempting shortcut of matching donor amounts to single control rows.
    left = legacy.assign(cents=(legacy.amount * 100).round())
    right = r.assign(cents=(r.amount * 100).round())
    matches = left.merge(right, left_on=["entity", "calendar_year", "cents"],
                         right_on=["agency", "calendar_year", "cents"])
    summary = dict(input_sha256=inputs, legacy_rows=len(legacy),
                   legacy_amount_usd=float(legacy.amount.sum()),
                   source_years=sorted(map(int, legacy.calendar_year.unique())),
                   missing_financing_descriptions=int(legacy.rev_name.isna().sum()),
                   exact_entity_year_amount_control_row_matches=len(matches),
                   duplicate_legacy_rows=int(legacy.drop(columns="csv_record").duplicated().sum()),
                   scope="Frozen repository CEB release; research only, no production data changes.")
    (OUT / "analysis-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    if fetch_archives:
        import requests
        from bs4 import BeautifulSoup
        evidence = {}
        for name, url in ARCHIVES.items():
            response = requests.get(url, timeout=45)
            response.raise_for_status()
            entry = dict(requested_url=url, resolved_url=response.url,
                         sha256=sha(response.content), bytes=len(response.content))
            if name.startswith("filter_"):
                soup = BeautifulSoup(response.text, "html.parser")
                select = soup.find("select", attrs={"name": "type"})
                entry["revenue_filter"] = [{"code": option.get("value"), "label": option.get_text(" ", strip=True)}
                                           for option in select.find_all("option") if option.get("value") != "All"]
            elif name == "donors_2023":
                archived = pd.read_csv(io.BytesIO(response.content))
                observed = archived[archived.rev_type.isin(LEGACY_CODES)]
                entry["legacy_rows"] = len(observed)
                entry["legacy_code_values"] = sorted(observed.rev_type.unique())
                entry["columns"] = archived.columns.tolist()
                columns = ["amount", "_currency", "entity", "calendar_year", "rev_type", "contrib_type"]
                current_rows, archived_rows = legacy.copy(), observed.copy()
                for sample in [current_rows, archived_rows]:
                    sample["entity"] = sample.entity.replace(ENTITY_ALIASES)
                current_rows = current_rows.sort_values(columns).reset_index(drop=True)
                archived_rows = archived_rows.sort_values(columns).reset_index(drop=True)
                pd.testing.assert_frame_equal(
                    current_rows[columns], archived_rows[columns],
                    check_dtype=False,
                )
                entry["matches_frozen_legacy_financial_observations_after_entity_alias_normalization"] = True
                labels = pd.DataFrame({"archived_donor": archived_rows.donor, "current_donor": current_rows.donor})
                labels[labels.archived_donor != labels.current_donor].groupby(
                    ["archived_donor", "current_donor"]
                ).size().rename("rows").to_csv(OUT / "archive-donor-aliases.csv")
            evidence[name] = entry
        (OUT / "archive-evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps({k: v for k, v in summary.items() if k != "input_sha256"}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch-archives", action="store_true")
    args = parser.parse_args()
    main(args.fetch_archives)
