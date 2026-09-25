import requests
import hashlib
import json
import io
import sys
from pathlib import Path
from datetime import datetime
import pandas as pd

ceb = Path("data/ceb")
raw = ceb / "raw"
raw.mkdir(parents=True, exist_ok=True)
clean = ceb / "clean"
clean.mkdir(parents=True, exist_ok=True)

current_year = datetime.now().year
first_expected_year = 2021 # some files start from 2011 already but some only 2021
last_expected_year = max(2024, current_year - 2)
years = list(range(first_expected_year, last_expected_year + 1))

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

def clean_and_validate():
    dfs = {}
    for fn in ceb_files:
        try:
            dfs[fn] = pd.read_csv(raw / fn)
        except UnicodeDecodeError:
            dfs[fn] = pd.read_csv(raw / fn, encoding="cp1252")
    for fn in dfs:
        dfs[fn].rename(columns=lambda x: x.strip().lower().replace(" ", "_").replace("usd_amount", "amount"), inplace=True)
        dfs[fn]["calendar_year"] = dfs[fn]["calendar_year"].astype(int)
        dfs[fn]["amount"] = pd.to_numeric(dfs[fn]["amount"], errors="raise")
        _years = dfs[fn]["calendar_year"].unique()
        assert first_expected_year in _years, f"Missing data for {first_expected_year} in {fn}"
        assert last_expected_year in _years, f"Missing data for {last_expected_year} in {fn}"
    for year in years:
        revenues = []
        for fn, df in dfs.items():
            if fn in ["revenue.csv", "revenue_sub_agency.csv"]:
                revenue = df[df["calendar_year"] == year]["amount"].sum()
                assert revenue > 0, f"No revenue data for year {year}"
                revenues.append(revenue)
        print(revenues)
        # check that all revenue totals are consistent across files
        assert all(abs(r - revenues[0]) < 0.01 for r in revenues), f"Revenue totals mismatch for year {year}: {revenues}"
    for fn, df in dfs.items():
        df.to_csv(clean / fn, index=False)



if __name__ == "__main__":
    if "--fetch-snapshot" in sys.argv:
        fetch_files()
    else:
        clean_and_validate()
