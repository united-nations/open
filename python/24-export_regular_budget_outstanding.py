"""Extract complete autumn regular-budget debtor lists from Controller briefings.

Source lists include partial settlements and accumulated arrears, not cash receipts.
Zeros are the complement of a validated complete debtor list in the same snapshot,
never inferred from a later honour roll. Run after step 13 (assessment roster).
"""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import io
import json
import re
import unicodedata
import zipfile
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from urllib.parse import quote

import openpyxl
import olefile
import pymupdf
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/data"
EVIDENCE = ROOT / "data/regular-budget-outstanding"
RAW = EVIDENCE / "raw"
BASE = "https://www.un.org/en/ga/contributions/"
spec = importlib.util.spec_from_file_location("regular_assessments", Path(__file__).with_name("13-export_regular_budget_contributors.py"))
assessments = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assessments)

# year, actual observation date, source filename, PDF page/PowerPoint slide,
# number of debtors, published overall balance (rounded unless noted).
SOURCES = [
    (2018, "2018-09-30", "Presentation October 2018.pptx", 7, 52, 1_087_671_794, 2),
    (2019, "2019-10-04", "Presentation October 2019.pptx", 6, 65, 1_386_694_835, 1),
    (2020, "2020-09-30", "Presentation October 2020.pdf", 6, 69, 1_496_578_501, 1),
    (2021, "2021-10-08", "Presentation October 2021.pdf", 8, 63, 1_255_000_000, 500_000),
    (2022, "2022-09-30", "Presentation_October_2022.pdf", 8, 62, 1_168_000_000, 500_000),
    (2023, "2023-09-30", "Presentation October 2023.pdf", 8, 56, 1_346_000_000, 500_000),
    (2024, "2024-09-30", "Presentation October 2024.pdf", 8, 52, 1_501_000_000, 500_000),
    (2025, "2025-09-30", "Presentation October 2025.pdf", 8, 57, 1_870_000_000, 500_000),
    (2026, "2026-09-30", "Presentation October 2026.pdf", 8, 52, 1_462_000_000, 500_000),
]

# Reviewed against all 63 printed country entries: the 2021 slide's $1,255m
# headline does not round from its detailed list. Preserve both, without scaling.
REVIEWED_LIST_TOTALS = {2021: 1_254_267_798}

# Membership was unchanged in 2018–2019. Reuse only the later country roster;
# do not infer 2018 assessments or payment status from 2019 observations.
ROSTER_YEARS = {2018: 2019}


def normalize(value: str) -> str:
    value = value.replace("’", "'")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def country_aliases(roster: list[str]) -> dict[str, str]:
    aliases = {normalize(name): name for name in roster}
    for alias, canonical in assessments.COUNTRY_ALIASES.items():
        if normalize(canonical) in aliases:
            aliases[normalize(alias)] = aliases[normalize(canonical)]
    for alias, canonical in {
        "Bahamas (The)": "Bahamas", "United States": "United States of America",
        "Venezuela": "Venezuela (Bolivarian Republic of)",
        "Netherlands": "Netherlands (Kingdom of the)", "Turkey": "Türkiye",
        "Naoero": "Nauru", "Timor - Leste": "Timor-Leste",
        "Democratic Republic of Congo": "Democratic Republic of the Congo",
    }.items():
        if normalize(canonical) in aliases:
            aliases[normalize(alias)] = aliases[normalize(canonical)]
    return aliases


def pdf_debtors(content: bytes, page_number: int, year: int, aliases: dict[str, str]) -> dict[str, int]:
    document = pymupdf.open(stream=content, filetype="pdf")
    text = document[page_number - 1].get_text()
    # Preserve commas in amounts; normalize country punctuation and whitespace.
    text = unicodedata.normalize("NFKD", text.replace("’", "'")).encode("ascii", "ignore").decode().lower()
    text = re.sub(r"[^a-z0-9,]+", " ", text)
    name_pattern = "|".join(re.escape(name) for name in sorted(aliases, key=len, reverse=True))
    amount_pattern = r"[0-9]{1,3}(?:,[0-9]{3})*"
    if year in (2024, 2025):
        pattern = rf"(?<![a-z0-9])(?P<amount>{amount_pattern}) (?P<name>{name_pattern})(?![a-z])"
    else:
        pattern = rf"(?<![a-z])(?P<name>{name_pattern}) (?P<amount>{amount_pattern})(?![0-9,])"
    rows = {}
    for match in re.finditer(pattern, text):
        name = aliases[match['name']]
        if name in rows:
            raise ValueError(f"Duplicate country: {name}")
        rows[name] = int(match['amount'].replace(",", ""))
    return rows


def pptx_debtors(content: bytes, aliases: dict[str, str], year: int = 2019) -> dict[str, int]:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        if year == 2018:
            with olefile.OleFileIO(io.BytesIO(archive.read("ppt/embeddings/oleObject3.bin"))) as embedded:
                workbook_bytes = embedded.openstream("Package").read()
        else:
            workbook_bytes = archive.read("ppt/embeddings/Microsoft_Excel_Worksheet2.xlsx")
        workbook = openpyxl.load_workbook(io.BytesIO(workbook_bytes), data_only=True)
    rows = {}
    # Table4 backs each published autumn debtor slide. Other sheets retain
    # stale April 2018 observations and must not supply an autumn snapshot.
    for row in workbook["Table4"].values:
        for index in ((0, 3) if year == 2018 else (0, 3, 6)):
            name, amount = row[index:index + 2]
            if not isinstance(name, str) or not isinstance(amount, (int, float)):
                continue
            canonical = aliases[normalize(name)]
            if canonical in rows:
                raise ValueError(f"Duplicate country: {canonical}")
            rows[canonical] = int(Decimal(str(amount)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return rows


def validate_debtors(rows: dict[str, int], roster: list[str], expected_count: int, reported_total: int, tolerance: int) -> None:
    if len(roster) != 193 or len(set(roster)) != 193:
        raise ValueError("Expected 193 unique assessed Member States")
    if len(rows) != expected_count or set(rows) - set(roster):
        raise ValueError(f"Incomplete/unknown debtor list: {len(rows)} vs {expected_count}; {set(rows) - set(roster)}")
    if any(value <= 0 for value in rows.values()):
        raise ValueError("Expected positive balances in the published debtor list")
    if abs(sum(rows.values()) - reported_total) > tolerance:
        raise ValueError(f"Debtor amounts do not reconcile: {sum(rows.values())} vs {reported_total}")


def export() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    evidence = []
    for year, as_of, filename, page, count, control, tolerance in SOURCES:
        roster_year = ROSTER_YEARS.get(year, year)
        assessment_data = json.loads((OUT / f"regular-budget-contributors-{roster_year}.json").read_text())
        roster = [row['name'] for row in assessment_data['contributors']]
        aliases = country_aliases(roster)
        cache = RAW / filename
        url = BASE + quote(filename)
        if not cache.exists():
            response = requests.get(url, timeout=90)
            response.raise_for_status()
            cache.write_bytes(response.content)
        content = cache.read_bytes()
        rows = pptx_debtors(content, aliases, year) if filename.endswith('.pptx') else pdf_debtors(content, page, year, aliases)
        validate_debtors(rows, roster, count, REVIEWED_LIST_TOTALS.get(year, control), 0 if year in REVIEWED_LIST_TOTALS else tolerance)
        total = sum(rows.values())
        contributors = [
            {"name": name, "outstanding_amount": rows.get(name, 0),
             "basis": "reported_balance" if name in rows else "complete_list_complement"}
            for name in sorted(roster)
        ]
        source = {"url": url, "page": page, "format": "pptx" if filename.endswith('.pptx') else "pdf",
                  "sha256": hashlib.sha256(content).hexdigest()}
        payload = {"meta": {"year": year, "as_of": as_of, "currency": "USD", "total_outstanding": total,
                              "reported_total": control, "reported_total_tolerance": tolerance,
                              "debtor_count": count, "member_state_count": 193, "source": source,
                              "reconciliation_note": "The 63 published country balances sum to $1,254,267,798, while the source headline reports $1,255 million. Charts use the country sum without adjustment." if year in REVIEWED_LIST_TOTALS else None},
                   "contributors": contributors}
        (OUT / f"regular-budget-outstanding-{year}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
        evidence.extend({"year": year, "as_of": as_of, **row, "source_url": url, "source_page": page} for row in contributors)
        print(f"{year}: {count} debtors, ${total:,}, as at {as_of}")
    with (EVIDENCE / 'observations.csv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(evidence[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(evidence)


if __name__ == '__main__':
    export()
