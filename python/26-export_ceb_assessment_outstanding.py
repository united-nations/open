"""Export reported organization-level outstanding assessments from CEB Table 7."""

import argparse
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import json
from pathlib import Path
import re

import pymupdf
import requests

from utils import normalize_entity


@dataclass(frozen=True)
class Report:
    publication_year: int
    symbol: str
    years: tuple[int, int]
    pages: tuple[int, ...]
    expected_rows: int
    url: str


REPORTS = (
    Report(2022, "A/77/507", (2020, 2021), (140, 141), 30,
           "https://unsceb.org/assets/media/reports/report-3755-A77507-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-5-Oct-2022.pdf"),
    Report(2024, "A/79/494", (2022, 2023), (29, 30), 31,
           "https://unsceb.org/assets/media/reports/report-3825-A79494-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-2024.pdf"),
    Report(2026, "A/81/408", (2024, 2025), (28,), 29,
           "https://www.unsceb.org/assets/media/reports/report-3983-A81408-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-2026.pdf"),
)
SOURCE_ENTITY_CODES = {
    "United Nations": "UN",
    "United Nations peacekeeping": "UN-DPO",
}
DATE_UNKNOWN_NOTE = (
    "The column heading gives 31 December, but the reporting date of this "
    "peacekeeping balance is not explicitly established by the table notes."
)
BASIS_REVIEWS = Path(__file__).resolve().parents[1] / "data/ceb-assessment-outstanding-basis.json"


def parse_number(text: str) -> int | float | None:
    """Keep missing cells separate from zero and preserve signed source amounts."""
    value = text.strip()
    if value in {"", "-", "–", "—"}:
        return None
    value = re.sub(r"\s", "", value).replace("−", "-")
    if not re.fullmatch(r"[+-]?\d+(?:\.\d*)?", value):
        raise ValueError(f"Unexpected numeric cell: {text!r}")
    try:
        number = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"Unexpected numeric cell: {text!r}") from exc
    return int(number) if number == number.to_integral_value() else float(number)


def text_lines(page, inhibit_spaces=False):
    flags = pymupdf.TEXTFLAGS_DICT | (pymupdf.TEXT_INHIBIT_SPACES if inhibit_spaces else 0)
    return sorted(
        (line["bbox"], "".join(span["text"] for span in line["spans"]).strip())
        for block in page.get_text("dict", flags=flags)["blocks"]
        for line in block.get("lines", [])
        if any(span["text"].strip() for span in line["spans"])
    )


def extract_page(page, pdf_page: int):
    lines = text_lines(page)
    headings = sorted(
        (box, text) for box, text in lines
        if text.startswith("Percentage") or text.startswith("Amount")
    )
    expected_headings = ["Percentage", "Percentage", "Amount"] * 2
    if [text.split()[0] for _, text in headings] != expected_headings:
        raise ValueError(f"Unexpected Table 7 column headings on PDF page {pdf_page}")
    column_rights = [box[2] + 2 for box, _ in headings]
    numeric_left = headings[0][0][0] - 2
    header_bottom = max(box[3] for box, _ in headings)
    notes_y = min((box[1] for box, text in lines if text == "Notes:"), default=page.rect.height)
    rows = []
    page_words = page.get_text("words")
    for box, label in sorted(lines, key=lambda item: (item[0][1], item[0][0])):
        if box[0] >= 100 or box[1] <= header_bottom or box[1] >= notes_y or not label[0].isalpha():
            continue
        words = [word for word in page_words
                 if abs(word[1] - box[1]) < 1 and word[0] >= numeric_left]
        if not words:
            continue
        cells = []
        left = numeric_left
        for right in column_rights:
            cell = " ".join(word[4] for word in sorted(words, key=lambda word: word[0])
                            if left <= (word[0] + word[2]) / 2 < right)
            cells.append(cell)
            left = right
        if any(not cell for cell in cells):
            raise ValueError(f"Incomplete Table 7 row on PDF page {pdf_page}: {label!r}, {cells}")
        for cell in cells:
            parse_number(cell)
        rows.append({"sourceEntity": label, "cells": cells, "pdfPage": pdf_page})
    note_lines = text_lines(page, inhibit_spaces=True)
    note_text = " ".join(text for box, text in sorted(note_lines, key=lambda item: (item[0][1], item[0][0]))
                         if notes_y < box[1] and not re.fullmatch(
                             r"A/\d+/\d+|\d+/\d+|\d{2}-\d{5}", text
                         ))
    notes = [
        {"marker": marker, "text": text.strip(), "pdfPage": pdf_page}
        for marker, text in re.findall(r"\(([a-z])\)\s*(.*?)(?=\([a-z]\)\s|$)", note_text)
    ]
    return rows, notes


def footnote_years(text: str, years: tuple[int, int]) -> list[int]:
    """Use explicit observation years; general reporting-history notes cover both columns."""
    as_at = re.findall(r"\bas at \d{1,2} [A-Za-z]+ (\d{4})\b", text)
    # 'Reporting from YEAR' describes coverage history, not one observation year.
    observation_text = re.sub(r"\bfrom \d{4}\b", "", text)
    mentioned = {int(year) for year in (as_at or re.findall(r"\b\d{4}\b", observation_text))}
    applicable = [year for year in years if year in mentioned]
    return applicable or list(years)


def extract_report(content: bytes, report: Report) -> dict[int, dict]:
    rows, notes = [], []
    with pymupdf.open(stream=content, filetype="pdf") as document:
        first_page = document[report.pages[0] - 1].get_text()
        if report.symbol not in first_page or not re.search(r"Table\s+7\b", first_page):
            raise ValueError(f"Unexpected report or Table 7 location for {report.symbol}")
        year_headers = [text for _, text in text_lines(document[report.pages[0] - 1])
                        if text in {str(year) for year in report.years}]
        if year_headers != [str(year) for year in report.years]:
            raise ValueError(f"Unexpected Table 7 year headers for {report.symbol}")
        for pdf_page in report.pages:
            extracted, page_notes = extract_page(document[pdf_page - 1], pdf_page)
            rows.extend(extracted)
            notes.extend(page_notes)
    if len(rows) != report.expected_rows or not notes:
        raise ValueError(f"Unexpected Table 7 rows or missing notes for {report.symbol}: {len(rows)} rows")
    if not any("all years" in note["text"] for note in notes):
        raise ValueError(f"Missing total-outstanding scope note for {report.symbol}")
    for note in notes:
        note["years"] = footnote_years(note["text"], report.years)

    source = {
        "symbol": report.symbol,
        "url": report.url,
        "sha256": sha256(content).hexdigest(),
        "table": 7,
        "pdfPages": list(report.pages),
        "notes": notes,
    }
    counts = Counter(row["sourceEntity"] for row in rows)
    occurrences = Counter()
    result = {
        year: {"schemaVersion": 1, "year": year, "currency": "USD",
               "scope": "Total uncollected assessed contributions for current and prior years",
               "source": source, "organizations": []}
        for year in report.years
    }
    for source_row, row in enumerate(rows, start=1):
        source_entity = row["sourceEntity"]
        occurrences[source_entity] += 1
        occurrence = occurrences[source_entity]
        entity = normalize_entity(SOURCE_ENTITY_CODES.get(source_entity, source_entity))
        for column, year in zip((2, 5), report.years):
            header_date = f"{year}-12-31"
            as_of, date_basis = header_date, "table_header"
            record_notes = []
            date_page = row["pdfPage"]
            if source_entity == "United Nations peacekeeping":
                specific_date = next((note for note in notes
                                      if "peacekeeping" in note["text"].lower()
                                      and re.search(rf"as at 30 June {year}\b", note["text"])), None)
                if specific_date:
                    as_of, date_basis = f"{year}-06-30", "table_note"
                    date_page = specific_date["pdfPage"]
                else:
                    as_of, date_basis = None, "uncertain"
                    record_notes.append(DATE_UNKNOWN_NOTE)
            if counts[source_entity] > 1:
                record_notes.append(
                    f"The report contains {counts[source_entity]} rows with this organization label. "
                    "Their individual budget names are not identified. Row occurrence is local to "
                    "this report and does not establish matching scope across reports."
                )
            if source_entity == "ITU" and year == 2020:
                record_notes.append(
                    "The source reports 154,906,002 dollars, compared with 4,528,961 dollars in "
                    "2021. The unusually large reported change is preserved without adjustment."
                )
            result[year]["organizations"].append({
                "entity": entity,
                "sourceEntity": source_entity,
                "sourceRow": source_row,
                "sourceRowOccurrence": occurrence,
                "outstanding": parse_number(row["cells"][column]),
                "asOf": as_of,
                "asOfBasis": date_basis,
                "asOfSourcePdfPage": date_page,
                "reportedHeaderAsOf": header_date,
                "notes": record_notes,
                "pdfPage": row["pdfPage"],
                "rawOutstanding": row["cells"][column],
            })
    return result


def apply_accounting_reviews(datasets: dict, reviews: list[dict]) -> None:
    """Attach cited audit context without replacing the reported CEB balance."""
    reviewed = set()
    for review in reviews:
        key = (review["year"], review["entity"])
        if key in reviewed:
            raise ValueError(f"Duplicate accounting review: {key}")
        reviewed.add(key)
        matches = [row for row in datasets[review["year"]]["organizations"]
                   if row["entity"] == review["entity"]]
        if len(matches) != 1 or matches[0]["outstanding"] != review["reportedAmount"]:
            raise ValueError(f"Accounting review no longer matches CEB source: {key}")
        if review["kind"] not in {"gross", "net"}:
            raise ValueError(f"Invalid accounting basis: {key}")
        row = matches[0]
        row["accountingBasis"] = {
            field: review[field] for field in ("kind", "note", "sourceUrl", "pdfPage")
        }
        if "asOf" in review:
            row.update({
                "asOf": review["asOf"],
                "asOfBasis": "audited_statements",
                "asOfSourcePdfPage": review["pdfPage"],
                "dateSource": {"url": review["sourceUrl"], "pdfPage": review["pdfPage"]},
                "notes": [note for note in row["notes"] if note != DATE_UNKNOWN_NOTE],
            })


def export(reports_dir: Path | None, output_dir: Path) -> None:
    datasets = {}
    for report in REPORTS:
        if reports_dir is not None:
            content = (reports_dir / f"{report.publication_year}.pdf").read_bytes()
        else:
            response = requests.get(report.url, timeout=60)
            response.raise_for_status()
            content = response.content
        datasets.update(extract_report(content, report))
    apply_accounting_reviews(datasets, json.loads(BASIS_REVIEWS.read_text())["reviews"])
    output_dir.mkdir(parents=True, exist_ok=True)
    for year, dataset in sorted(datasets.items()):
        path = output_dir / f"ceb-assessment-outstanding-{year}.json"
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(dataset, ensure_ascii=False, allow_nan=False,
                                        separators=(",", ":")) + "\n", encoding="utf-8")
        temporary.replace(path)
        amounts = [row["outstanding"] for row in dataset["organizations"]]
        print(f"{path}: {len(amounts)} source rows, {sum(value is None for value in amounts)} unknown amounts")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports-dir", type=Path,
                        help="Local source PDFs named by publication year (2022.pdf, 2024.pdf, 2026.pdf)")
    parser.add_argument("--output-dir", type=Path, default=Path("public/data"))
    arguments = parser.parse_args()
    export(arguments.reports_dir, arguments.output_dir)
