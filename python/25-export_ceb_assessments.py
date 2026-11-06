"""Export the CEB assessments and receipts workbook independently of revenue."""
import argparse
from collections import defaultdict
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path

from openpyxl import load_workbook
import requests

from utils import clean_donor_name, normalize_entity

OUT = Path("public/data")
SOURCE = (
    "https://unsceb.org/assets/media/pages/Assessments-voted-assessments-received-"
    "for-current-year-and-prior-years-assessments-received-2020-2021-2022-2023-2024-2025.xlsx"
)
HEADER = (
    "ENTITY CODE", "CALENDAR YEAR", "CONTRIBUTOR TYPE", "PERCENTAGE ASSESSMENT",
    "CONTRIBUTOR IDENTIFIER", "CONTRIBUTOR NAME", "USD ASSESSMENTS AMOUNT",
    "USD AMOUNT RECEIVED FROM PRIOR YEARS' ASSESSMENTS",
    "USD AMOUNT RECEIVED FROM CURRENT YEAR'S ASSESSMENTS",
)


def export(workbook_bytes: bytes) -> None:
    workbook = load_workbook(BytesIO(workbook_bytes), read_only=True, data_only=True)
    try:
        sheet = workbook["Data"].values
        if next(sheet) != HEADER:
            raise ValueError("Unexpected CEB assessment workbook columns")
        observations = []
        names = defaultdict(dict)
        for row_number, row in enumerate(sheet, start=2):
            entity, year, category, _, identifier, name, assessed, prior, current = row
            amounts = (assessed, current, prior)
            if all(value is None for value in amounts):
                continue
            if not entity or not isinstance(year, int) or not (identifier or name):
                raise ValueError(f"Missing observation identity at row {row_number}")
            if any(value is not None and (
                not isinstance(value, (int, float)) or not math.isfinite(value)
            ) for value in amounts):
                raise ValueError(f"Unexpected assessment amount at row {row_number}")
            key = (category, identifier or name)
            if name:
                names[key][year] = clean_donor_name(name)
            observations.append((year, key, entity, amounts))
    finally:
        workbook.close()

    if not observations:
        raise ValueError("No assessment observations found")

    years = defaultdict(lambda: defaultdict(list))
    for year, key, entity, amounts in observations:
        years[year][key].append([normalize_entity(entity), *amounts])

    digest = sha256(workbook_bytes).hexdigest()
    for year, contributors in sorted(years.items()):
        records = []
        for key, rows in sorted(contributors.items()):
            labels = names[key]
            name = labels[max(labels)] if labels else f"Unnamed contributor ({key[1]})"
            records.append({
                "id": ":".join(key),
                "name": name,
                "aliases": sorted(set(labels.values()) - {name}),
                "rows": sorted(rows, key=lambda row: row[0]),
            })
        path = OUT / f"ceb-assessments-{year}.json"
        path.write_text(
            json.dumps(
                {"year": year, "source": SOURCE, "sha256": digest, "contributors": records},
                ensure_ascii=False, separators=(",", ":"), allow_nan=False,
            ) + "\n",
            encoding="utf-8",
        )
        print(f"{path}: {len(records)} contributors, {sum(len(r['rows']) for r in records)} observations")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, help="Use a local copy of the published workbook")
    args = parser.parse_args()
    if args.workbook:
        content = args.workbook.read_bytes()
    else:
        response = requests.get(SOURCE, timeout=60)
        response.raise_for_status()
        content = response.content
    export(content)
