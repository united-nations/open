import requests
import hashlib
import json
import io
import sys
from pathlib import Path
from datetime import datetime
import pandas as pd
import shutil
from ceb_data import normalize_frame, select_geographic_totals, select_sdg_expenses, revenue_controls
from utils import normalize_entity

ceb = Path("data/ceb")
raw = ceb / "raw"
raw.mkdir(parents=True, exist_ok=True)
clean = ceb / "clean"
clean.mkdir(parents=True, exist_ok=True)

# Minimum established coverage; newer release years are discovered per dataset.
FIRST_YEARS = {
    "revenue.csv": 2011, "revenue_sub_agency.csv": 2011,
    "revenue_by_financing_instruments_and_government_contributors.csv": 2018,
    "revenue_government_donors.csv": 2013, "revenue_non_gov_donors.csv": 2013,
    "revenue_contrib_type.csv": 2021, "expenses_sub_agency.csv": 2011,
    "expenses_by_country_region_sub_agency.csv": 2013, "expenses_sdgs.csv": 2018,
}

ceb_files = [
    "revenue.csv", # Revenue
    "revenue_sub_agency.csv", # Revenue by Entity
    "revenue_by_financing_instruments_and_government_contributors.csv", # Revenue by Financing Instruments (including sub-types) and Government Contributors
    "revenue_government_donors.csv", # Revenue By Government Donors
    "revenue_non_gov_donors.csv", # Revenue By Non-Government Donors
    "revenue_contrib_type.csv", # Revenue By Contributor Type
    "expenses_sub_agency.csv", # Expenses
    "expenses_by_country_region_sub_agency.csv", # Expenses By Geographic Location
    "expenses_sdgs.csv", # Expenses By SDG
]

def fetch_files():
    url = "https://unsceb.org/assets/data/FS/"
    snapshot = raw / "snapshots" / datetime.now().strftime("%Y%m%dT%H%M%S%f")
    snapshot.mkdir(parents=True)
    manifest = []
    for file in ceb_files:
        f = requests.get(url + file, timeout=90)
        f.raise_for_status()
        encoding = "utf-8"
        try:
            frame = pd.read_csv(io.BytesIO(f.content), encoding=encoding)
        except UnicodeDecodeError:
            encoding = "cp1252"
            frame = pd.read_csv(io.BytesIO(f.content), encoding=encoding)
        if not any(str(column).strip().lower() == "calendar year" or str(column).strip().lower() == "calendar_year" for column in frame.columns):
            raise ValueError(f"Unexpected CSV schema: {file}")
        (snapshot / file).write_bytes(f.content)
        manifest.append({"file": file, "url": f.url, "sha256": hashlib.sha256(f.content).hexdigest(), "rows": len(frame), "encoding": encoding})
        (snapshot / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Downloaded immutable candidate snapshot to {snapshot}; reconcile before promoting to raw/ and clean/.")

def clean_and_validate(source=raw):
    dfs = {}
    register = Path("public/data/ceb-source.json")
    previous = json.loads(register.read_text()) if register.exists() else None
    previous_years = {entry['file']: set(entry['years']) for entry in previous['files']} if previous else {}
    provenance = {"retrievedAt": datetime.now().date().isoformat(), "files": [],
                  "notes": ["Missing donor amounts are unknown, not zero. Known amounts are reconciled to entity/instrument controls; differences remain Unattributed.",
                            "Geographic totals select E06, excluding overlapping E06A/B/C components.",
                            "SDG expenses select EXP; BUD/BUG budget observations are excluded."],
                  "nonReporting": {}}
    for fn in ceb_files:
        payload = (source / fn).read_bytes()
        try:
            frame = pd.read_csv(io.BytesIO(payload), encoding="utf-8")
        except UnicodeDecodeError:
            frame = pd.read_csv(io.BytesIO(payload), encoding="cp1252")
        frame = normalize_frame(frame)
        coverage = sorted(int(y) for y in frame.calendar_year.unique())
        required = set(range(FIRST_YEARS[fn], 2025)) | previous_years.get(fn, set())
        if not required.issubset(coverage):
            raise ValueError(f"Lost historical coverage in {fn}: {required - set(coverage)}")
        if fn in {"revenue_sub_agency.csv", "expenses_sub_agency.csv"} and frame.amount.isna().any():
            raise ValueError(f"Missing authoritative control amount in {fn}")
        missing = frame[frame.amount.isna()]
        provenance["files"].append({"file": fn, "url": "https://unsceb.org/assets/data/FS/" + fn,
            "sha256": hashlib.sha256(payload).hexdigest(), "rows": len(frame), "years": coverage,
            "missingAmounts": [{"csvRow": int(i) + 2, **row.drop(labels="amount").dropna().to_dict()}
                               for i, row in missing.iterrows()]})
        dfs[fn] = frame
    # Total-revenue and entity-revenue files are independent presentations.
    # Complete entity/instrument controls remain authoritative when detail is blank.
    controls = dfs["revenue_sub_agency.csv"]
    # CEB's published 2025 non-submission note applies only while the release
    # actually omits ITC; a later completed report must clear the UI disclosure.
    if 2025 in set(controls.calendar_year) and 'ITC' not in set(controls.loc[controls.calendar_year == 2025, 'agency']):
        provenance["nonReporting"]["2025"] = ["ITC"]
    for frame in (dfs["revenue.csv"], controls):
        frame["agency"] = frame.agency.map(normalize_entity)
    keys = ["calendar_year", "agency", "rev_type"]
    expected = controls.groupby(keys).amount.sum()
    reported = dfs["revenue.csv"].groupby(keys).amount.sum(min_count=1)
    differences = reported.subtract(expected, fill_value=0)
    provenance["revenuePresentationDifferences"] = [
        {"year": int(year), "entity": entity, "instrument": instrument, "difference": float(amount)}
        for (year, entity, instrument), amount in differences.items() if abs(amount) > 0.01]
    revenue_controls(dfs["revenue.csv"], controls)
    select_geographic_totals(dfs["expenses_by_country_region_sub_agency.csv"])
    select_sdg_expenses(dfs["expenses_sdgs.csv"])
    for fn, frame in dfs.items():
        frame.to_csv(clean / fn, index=False)
        if source != raw:
            shutil.copyfile(source / fn, raw / fn)
    # Small, published provenance register; raw blanks remain untouched in the archive.
    if previous:
        hashes = lambda metadata: {entry['file']: entry['sha256'] for entry in metadata['files']}
        if hashes(previous) == hashes(provenance):
            provenance['retrievedAt'] = previous['retrievedAt']
    register.write_text(json.dumps(provenance, indent=2, allow_nan=False) + "\n")
    print("CEB source promoted; coverage:", {fn: int(df.calendar_year.max()) for fn, df in dfs.items()})



if __name__ == "__main__":
    if "--fetch-snapshot" in sys.argv:
        fetch_files()
    else:
        source = Path(sys.argv[sys.argv.index("--snapshot") + 1]) if "--snapshot" in sys.argv else raw
        clean_and_validate(source)
