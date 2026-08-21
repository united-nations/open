"""Extract UN Schedule of Individual Trust Funds as structured data.

The pipeline deliberately has two outputs:

1. ``stage1`` keeps the PDF's physical table rows and cells as literally as
   possible.  Each detected table is also written as its own CSV/DataFrame.
2. ``stage2`` converts the recurring layouts into relational tables plus a
   nested JSON export with stable fund codes and long-form facts.

Run from the repository root:

    uv run python python/14-extract_trust_fund_schedules.py --years 2023 2024
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from collections.abc import Iterable, Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path
from urllib.parse import quote

import pandas as pd
import pymupdf as fitz
import requests

DL_SEARCH_URL = "https://digitallibrary.un.org/search"
DOCUMENT_ACCESS_URL = "https://documents.un.org/api/symbol/access"
SEARCH_QUERY = 'title:"schedule of individual trust funds"'
MARC_NS = {"m": "http://www.loc.gov/MARC21/slim"}
DEFAULT_OUTPUT = Path("data/trust-fund-schedules")
MIN_CALENDAR_YEAR = 2017

DOCUMENTS_ONLY_SOURCES = (
    {
        "calendar_year": 2020,
        "publication_year": 2021,
        "symbol": (
            "(DMSPC/OPPFB) FINANCIAL STATEMENTS FOR THE YEAR ENDED 31 DECEMBER 2020"
        ),
        "title": (
            "Financial statements for the year ended 31 December 2020: "
            "schedule of individual trust funds"
        ),
    },
)

STATEMENT_HEADINGS = {
    "Assets",
    "Current assets",
    "Non-current assets",
    "Liabilities",
    "Current liabilities",
    "Non-current liabilities",
    "Net assets",
    "Revenue",
    "Expenses",
    "Change in net assets",
}

COUNTERPARTY_GROUPS = {
    "Government",
    "Governments",
    "Others",
    "United Nations entities",
    "United Nations Entities",
    "Intergovernmental organizations",
    "Intergovernmental Organizations",
    "Non-governmental organizations",
    "Non-Governmental Organizations",
    "Private sector",
    "Foundations",
}

FLOW_HEADER_TERMS = (
    "donor",
    "current",
    "non-current",
    "total as at",
    "31 december",
    "voluntary monetary",
    "voluntary in-kind",
    "refunds/transfers",
    "refunds/adjustments",
    "total for the year",
    "contributions",
    "internal transfers",
    "united states dollars",
)

# The printed 2022 PDF is internally inconsistent for PDF: total assets less
# total liabilities is $124,041,540, while total net assets is printed as
# $124,131,540. Keep this visible, but do not treat it as a parser regression.
KNOWN_SOURCE_EXCEPTIONS = {
    (2022, "PDF", "financial_position_equation", -90_000): (
        "The source statement's printed totals differ by $90,000."
    )
}


@dataclass(frozen=True)
class ScheduleDocument:
    recid: int | None
    calendar_year: int
    publication_year: int | None
    symbol: str
    title: str
    source_catalog: str
    landing_page_url: str
    source_pdf_url: str


@dataclass
class PhysicalRow:
    y: float
    words: list[tuple[float, float, float, float, str]]

    @property
    def text(self) -> str:
        return join_words(word[4] for word in self.words)


def join_words(words: Iterable[str]) -> str:
    text = " ".join(word.strip() for word in words if word.strip())
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    return text


def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "table"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def marc_first(record: ET.Element, tag: str, code: str | None = None) -> str:
    if code is None:
        node = record.find(f'm:controlfield[@tag="{tag}"]', MARC_NS)
    else:
        node = record.find(
            f'm:datafield[@tag="{tag}"]/m:subfield[@code="{code}"]', MARC_NS
        )
    return (node.text or "").strip() if node is not None else ""


def documents_access_url(symbol: str, document_type: str) -> str:
    """Build a Documents API URL without escaping the slash in a pseudo-symbol.

    The endpoint returns an error page when ``DMSPC/OPPFB`` is encoded as
    ``DMSPC%2FOPPFB``, even though both are equivalent URL query values.
    """
    encoded_symbol = quote(symbol, safe="/()")
    return (
        f"{DOCUMENT_ACCESS_URL}?s={encoded_symbol}&l=en&t="
        f"{quote(document_type, safe='')}"
    )


def documents_landing_page_url(symbol: str) -> str:
    return f"https://docs.un.org/en/{quote(symbol, safe='()')}"


def discover_documents(session: requests.Session) -> list[ScheduleDocument]:
    response = None
    for _attempt in range(5):
        response = session.get(
            DL_SEARCH_URL,
            params={"p": SEARCH_QUERY, "of": "xm", "rg": 200},
            timeout=90,
        )
        if response.ok and response.content.strip():
            break
    if response is None or not response.content.strip():
        status = response.status_code if response is not None else "no response"
        raise RuntimeError(f"Digital Library search returned no XML ({status})")
    response.raise_for_status()
    root = ET.fromstring(response.content)
    documents: list[ScheduleDocument] = []
    for record in root.findall("m:record", MARC_NS):
        symbol = marc_first(record, "191", "a")
        title = join_words(
            [marc_first(record, "245", "a"), marc_first(record, "245", "b")]
        )
        match = re.search(r"ended\s+31\s+December\s+(\d{4})", title, re.IGNORECASE)
        if not match:
            continue
        calendar_year = int(match.group(1))
        if calendar_year < MIN_CALENDAR_YEAR:
            continue
        pdf_urls = []
        for field in record.findall('m:datafield[@tag="856"]', MARC_NS):
            language = field.find('m:subfield[@code="y"]', MARC_NS)
            url = field.find('m:subfield[@code="u"]', MARC_NS)
            if (
                url is not None
                and url.text
                and (
                    language is None
                    or (language.text or "").strip().lower() == "english"
                )
            ):
                pdf_urls.append(url.text.strip())
        if not pdf_urls:
            continue
        publication_text = marc_first(record, "269", "a")
        documents.append(
            ScheduleDocument(
                recid=int(marc_first(record, "001")),
                calendar_year=calendar_year,
                publication_year=int(publication_text[:4])
                if publication_text[:4].isdigit()
                else None,
                symbol=symbol,
                title=title,
                source_catalog="UN Digital Library",
                landing_page_url=(
                    f"https://digitallibrary.un.org/record/{marc_first(record, '001')}"
                ),
                source_pdf_url=pdf_urls[0],
            )
        )
    observed_years = {document.calendar_year for document in documents}
    for source in DOCUMENTS_ONLY_SOURCES:
        if source["calendar_year"] in observed_years:
            continue
        symbol = source["symbol"]
        documents.append(
            ScheduleDocument(
                recid=None,
                calendar_year=source["calendar_year"],
                publication_year=source["publication_year"],
                symbol=symbol,
                title=source["title"],
                source_catalog="UN Official Document System",
                landing_page_url=documents_landing_page_url(symbol),
                source_pdf_url=documents_access_url(symbol, "pdf"),
            )
        )
    return sorted(documents, key=lambda item: item.calendar_year)


def download_file(
    session: requests.Session, url: str, destination: Path, expected_prefix: bytes
) -> tuple[bool, str, str]:
    response = session.get(url, timeout=180)
    final_url = response.url
    content_type = response.headers.get("content-type", "").split(";", 1)[0]
    if response.ok and response.content.startswith(expected_prefix):
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(response.content)
        return True, final_url, content_type
    return False, final_url, content_type


def retrieve_documents(
    documents: Sequence[ScheduleDocument], output_dir: Path, session: requests.Session
) -> list[dict]:
    raw_dir = output_dir / "raw"
    records: list[dict] = []
    for document in documents:
        pdf_path = raw_dir / f"schedule-{document.calendar_year}.pdf"
        docx_path = raw_dir / f"schedule-{document.calendar_year}.docx"
        docx_url = documents_access_url(document.symbol, "docx")
        docx_ok, docx_final_url, docx_content_type = download_file(
            session, docx_url, docx_path, b"PK\x03\x04"
        )
        if pdf_path.exists() and pdf_path.read_bytes()[:4] == b"%PDF":
            pdf_ok, pdf_final_url, pdf_content_type = (
                True,
                document.source_pdf_url,
                "application/pdf",
            )
        else:
            pdf_ok, pdf_final_url, pdf_content_type = download_file(
                session, document.source_pdf_url, pdf_path, b"%PDF"
            )
        if not pdf_ok:
            raise RuntimeError(f"Could not download PDF for {document.calendar_year}")
        records.append(
            {
                **asdict(document),
                "documents_api_identifier_used": document.symbol,
                "docx_requested_url": docx_url,
                "docx_available": docx_ok,
                "docx_final_url": docx_final_url,
                "docx_content_type": docx_content_type,
                "pdf_final_url": pdf_final_url,
                "pdf_content_type": pdf_content_type,
                "pdf_path": str(pdf_path),
                "pdf_bytes": pdf_path.stat().st_size,
                "pdf_sha256": sha256(pdf_path),
            }
        )
    return records


def physical_rows(page: fitz.Page, tolerance: float = 2.2) -> list[PhysicalRow]:
    words = [
        (float(x0), float(y0), float(x1), float(y1), str(text))
        for x0, y0, x1, y1, text, *_ in page.get_text("words")
    ]
    words.sort(key=lambda word: (word[1], word[0]))
    rows: list[PhysicalRow] = []
    for word in words:
        if not rows or abs(rows[-1].y - word[1]) > tolerance:
            rows.append(PhysicalRow(y=word[1], words=[word]))
        else:
            rows[-1].words.append(word)
            rows[-1].words.sort(key=lambda item: item[0])
            rows[-1].y = sum(item[1] for item in rows[-1].words) / len(rows[-1].words)
    return rows


def cells_for_bands(row: PhysicalRow, boundaries: Sequence[float]) -> list[str]:
    cells: list[list[str]] = [[] for _ in range(len(boundaries) - 1)]
    for x0, _y0, x1, _y1, text in row.words:
        center = (x0 + x1) / 2
        index = next(
            (
                index
                for index, (left, right) in enumerate(pairwise(boundaries))
                if left <= center < right
            ),
            len(cells) - 1,
        )
        cells[index].append(text)
    return [join_words(cell) for cell in cells]


def row_index(rows: Sequence[PhysicalRow], pattern: str, start: int = 0) -> int | None:
    regex = re.compile(pattern, re.IGNORECASE)
    return next(
        (index for index in range(start, len(rows)) if regex.search(rows[index].text)),
        None,
    )


def schedule_number(rows: Sequence[PhysicalRow]) -> str | None:
    for row in rows[:12]:
        match = re.search(r"Schedule\s+(\d+\.\d+(?:\.\d+)?)", row.text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def base_schedule(number: str | None) -> str | None:
    if not number:
        return None
    parts = number.split(".")
    return ".".join(parts[:2]) if len(parts) >= 2 else number


def statement_boundaries(
    rows: Sequence[PhysicalRow],
    title: int,
    start: int,
    calendar_year: int,
    width: float,
) -> list[float]:
    """Locate statement columns from the printed period headings.

    The 2017--2019 statements use materially different horizontal positions
    from later editions. Fixed bands silently moved leading digit groups into
    the schedule-reference or adjacent-period columns for large amounts.
    """
    years = {str(calendar_year), str(calendar_year - 1)}
    centers = sorted(
        {
            (word[0] + word[2]) / 2
            for row in rows[title + 1 : start]
            for word in row.words
            if word[4] in years and word[0] > width / 2
        }
    )
    if len(centers) == 1:
        # A small number of first-year funds print only the current period.
        current_center = centers[0]
        schedule_center = current_center - 95
        return [
            0.0,
            max(220.0, schedule_center - 45.0),
            (schedule_center + current_center) / 2,
            width + 1,
            width + 2,
        ]
    if len(centers) < 2:
        # Layout-specific fallbacks, used only if a damaged font obscures the
        # printed year headings.
        centers = [400.0, 495.0] if calendar_year <= 2021 else [425.0, 532.0]
    current_center, prior_center = centers[-2:]
    value_split = (current_center + prior_center) / 2

    schedule_centers = [
        (word[0] + word[2]) / 2
        for row in rows[title + 1 : start]
        for word in row.words
        if word[4].lower() == "schedule"
    ]
    schedule_center = schedule_centers[0] if schedule_centers else current_center - 95
    schedule_value_split = (schedule_center + current_center) / 2
    label_schedule_split = max(220.0, schedule_center - 45.0)
    return [
        0.0,
        label_schedule_split,
        schedule_value_split,
        value_split,
        width + 1,
    ]


def changes_boundaries(
    rows: Sequence[PhysicalRow], title: int, start: int, width: float
) -> list[float]:
    year_centers = [
        (word[0] + word[2]) / 2
        for row in rows[title + 1 : start]
        for word in row.words
        if re.fullmatch(r"20\d{2}", word[4]) and word[0] > width / 2
    ]
    value_center = year_centers[-1] if year_centers else width - 90
    return [0.0, max(300.0, value_center - 75.0), width + 1]


def fund_identity(
    rows: Sequence[PhysicalRow], number: str | None
) -> tuple[str | None, str | None]:
    schedule_idx = row_index(rows[:12], r"Schedule\s+\d+\.\d+")
    if schedule_idx is None:
        return None, None
    stop_patterns = (
        r"Statement of Financial",
        r"Voluntary Contributions",
        r"Other Transfers and Allocations",
        r"\(United States dollars\)",
    )
    candidates: list[str] = []
    for row in rows[schedule_idx + 1 : schedule_idx + 7]:
        if any(
            re.search(pattern, row.text, re.IGNORECASE) for pattern in stop_patterns
        ):
            break
        text = row.text.strip()
        if text and "continued" not in text.lower():
            candidates.append(text)
    combined = join_words(candidates)
    if not combined:
        return None, None
    if re.search(r"[0-9$]", combined):
        # The 2024 PDF's first fund title uses a simple +29 character mapping
        # (for example, ``7UXVW`` means ``Trust``).  Decode only when the title
        # visibly contains that damaged font encoding.
        combined = re.sub(
            r"[$0-9A-Z&]{2,}",
            lambda match: "".join(
                chr(ord(character) + 29) for character in match.group()
            ),
            combined,
        )
    code_match = re.search(r"\b([A-Z0-9]{3})\s*$", combined)
    if not code_match:
        damaged_code = re.search(r"([\^_`a-z]{3})\s*$", combined)
        if damaged_code:
            decoded_code = "".join(
                chr(ord(character) - 29) for character in damaged_code.group(1)
            )
            if re.fullmatch(r"[A-Z0-9]{3}", decoded_code):
                return decoded_code, combined[: damaged_code.start()].strip()
        return None, combined
    return code_match.group(1), combined[: code_match.start()].strip()


def dynamic_flow_boundaries(
    rows: Sequence[PhysicalRow],
    start: int,
    end: int,
    kind: str,
    width: float,
) -> list[float]:
    header_words = [
        word
        for row in rows[start : min(end, start + 8)]
        for word in row.words
        if word[0] >= 100
    ]

    def center(pattern: str) -> float | None:
        regex = re.compile(pattern, re.IGNORECASE)
        word = next((word for word in header_words if regex.fullmatch(word[4])), None)
        return (word[0] + word[2]) / 2 if word else None

    def total_center() -> float | None:
        for row in rows[start : min(end, start + 8)]:
            total_word = next(
                (
                    word
                    for word in row.words
                    if word[0] >= 100 and word[4].lower() == "total"
                ),
                None,
            )
            if total_word:
                phrase = [word for word in row.words if word[0] >= total_word[0]]
                return sum((word[0] + word[2]) / 2 for word in phrase) / len(phrase)
        return None

    if kind == "voluntary_contribution":
        if any("1%" in word[4] for word in header_words):
            centers = [
                center("Monetary"),
                center("1%"),
                center("In-Kind"),
                center(r"Refunds/Transfers/"),
                total_center(),
            ]
            fallback = [250, 325, 400, 475, 555]
        else:
            centers = [
                center("Monetary"),
                center("In-Kind"),
                center(r"Refunds/Transfers/"),
                total_center(),
            ]
            fallback = [310, 390, 465, 535]
    elif kind == "voluntary_contribution_receivable":
        centers = [
            center("Current") or center("Monetary"),
            center("Non-current") or center("In-Kind"),
            total_center(),
        ]
        fallback = [305, 385, 470]
    elif kind.endswith("_internal_transfers"):
        internal = []
        for word in header_words:
            if word[4].lower() in {"internal", "transfers"}:
                internal.append((word[0] + word[2]) / 2)
        refund_center = center(r"Refunds/Adjustments")
        if refund_center is not None:
            centers = [
                sum(internal) / len(internal) if internal else None,
                refund_center,
                total_center(),
            ]
            fallback = [300, 390, 480]
        else:
            centers = [
                sum(internal) / len(internal) if internal else None,
                total_center(),
            ]
            fallback = [320, 470]
    else:
        centers = [
            center("Contributions"),
            center(r"Refunds/Adjustments"),
            total_center(),
        ]
        fallback = [305, 375, 465]
    resolved = [
        float(value if value is not None else fallback[index])
        for index, value in enumerate(centers)
    ]
    if any(right <= left for left, right in pairwise(resolved)):
        resolved = [float(value) for value in fallback]
    if len(resolved) == 2:
        first_boundary = max(150.0, resolved[0] - (45.0 if resolved[0] < 280 else 30.0))
    else:
        first_boundary = max(150.0, resolved[0] - (resolved[1] - resolved[0]) / 2)
    return [
        0.0,
        first_boundary,
        *[(left + right) / 2 for left, right in pairwise(resolved)],
        width + 1,
    ]


def make_table(
    document: ScheduleDocument,
    page_number: int,
    number: str | None,
    fund_code: str | None,
    fund_name: str | None,
    table_kind: str,
    columns: Sequence[str],
    rows: Sequence[PhysicalRow],
    boundaries: Sequence[float],
    start: int,
    end: int,
) -> dict:
    literal_rows = []
    footer_candidates = [
        index
        for index in range(start, end)
        if rows[index].y > 650 and rows[index].text.lower() == "(united states dollars)"
    ]
    if footer_candidates:
        end = min(end, footer_candidates[0])
    for row in rows[start:end]:
        cells = cells_for_bands(row, boundaries)
        if any(cells):
            literal_rows.append({"y": round(row.y, 2), **dict(zip(columns, cells))})
    return {
        "table_id": (
            f"{document.calendar_year}-p{page_number:03d}-{slug(table_kind)}-"
            f"{number or 'unknown'}-y{round(rows[start].y):03d}"
        ),
        "calendar_year": document.calendar_year,
        "recid": document.recid,
        "symbol": document.symbol,
        "page": page_number,
        "schedule_number": number,
        "base_schedule_number": base_schedule(number),
        "fund_code": fund_code,
        "fund_name": fund_name,
        "table_kind": table_kind,
        "columns": list(columns),
        "column_boundaries": [round(value, 2) for value in boundaries],
        "rows": literal_rows,
    }


def extract_page_tables(
    document: ScheduleDocument,
    page: fitz.Page,
    page_number: int,
    identity_by_schedule: dict[str, tuple[str, str]],
    continuation: dict | None = None,
    prior_fund: tuple[str, str, str] | None = None,
) -> list[dict]:
    rows = physical_rows(page)
    if not rows:
        return []
    number = schedule_number(rows)
    has_any_schedule_heading = any(
        word[4].lower() == "schedule" for row in rows for word in row.words
    )
    inherited_number = (
        number is None and continuation is not None and not has_any_schedule_heading
    )
    base = base_schedule(number)
    code, name = fund_identity(rows, number)
    position_title = row_index(rows, r"I\.\s*Statement of Financial Position")

    if inherited_number and continuation:
        number = continuation["schedule_number"]
        code = continuation["fund_code"]
        name = continuation["fund_name"]
        base = base_schedule(number)
    elif (
        number is None
        and prior_fund
        and any(
            row.text.lower().strip()
            in {
                "voluntary contributions",
                "voluntary contribution",
                "other transfers and allocations",
            }
            for row in rows[:12]
        )
    ):
        prior_schedule, code, name = prior_fund
        number = f"{prior_schedule}.1"
        base = prior_schedule

    # A two-part schedule is the canonical fund statement. A three-part
    # schedule can span pages and its continuation may begin with a donor name
    # ending in three capitals; never let that overwrite the canonical code.
    if (
        base
        and code
        and name
        and number
        and len(number.split(".")) == 2
        and position_title is not None
    ):
        prior = identity_by_schedule.get(base)
        if prior and prior != (code, name):
            raise RuntimeError(
                f"Conflicting identities for {document.calendar_year} schedule "
                f"{base}: {prior!r} and {(code, name)!r}"
            )
        identity_by_schedule[base] = (code, name)
    if base and base in identity_by_schedule:
        code, name = identity_by_schedule[base]
    tables: list[dict] = []

    if position_title is not None:
        start = row_index(rows, r"^Assets$", position_title)
        if start is not None:
            tables.append(
                make_table(
                    document,
                    page_number,
                    number,
                    code,
                    name,
                    "financial_position",
                    ["line_item", "schedule_ref", "current_period", "prior_period"],
                    rows,
                    statement_boundaries(
                        rows,
                        position_title,
                        start,
                        document.calendar_year,
                        page.rect.width,
                    ),
                    start,
                    len(rows),
                )
            )

    performance_title = row_index(rows, r"II\.\s*Statement of Financial Performance")
    if performance_title is not None:
        start = row_index(rows, r"^Revenue$", performance_title)
        net_assets_title = row_index(
            rows, r"III\s*\.\s*Statement of changes", performance_title
        )
        if start is not None:
            tables.append(
                make_table(
                    document,
                    page_number,
                    number,
                    code,
                    name,
                    "financial_performance",
                    ["line_item", "schedule_ref", "current_period", "prior_period"],
                    rows,
                    statement_boundaries(
                        rows,
                        performance_title,
                        start,
                        document.calendar_year,
                        page.rect.width,
                    ),
                    start,
                    net_assets_title if net_assets_title is not None else len(rows),
                )
            )
        if net_assets_title is not None:
            start = row_index(rows, r"^Net assets as at", net_assets_title)
            end = row_index(rows, r"statements were prepared", net_assets_title)
            if start is not None:
                tables.append(
                    make_table(
                        document,
                        page_number,
                        number,
                        code,
                        name,
                        "changes_in_net_assets",
                        ["line_item", "current_period"],
                        rows,
                        changes_boundaries(
                            rows, net_assets_title, start, page.rect.width
                        ),
                        start,
                        end if end is not None else len(rows),
                    )
                )

    section_starts: list[tuple[int, str]] = []
    if number and position_title is None and performance_title is None:
        for index, row in enumerate(rows):
            normalized = row.text.lower().strip()
            if normalized in {
                "voluntary contribution receivable",
                "voluntary contribution receivables",
                "voluntary contributions receivable",
                "voluntary contributions receivables",
            }:
                section_starts.append((index, "voluntary_contribution_receivable"))
            elif normalized == "voluntary contributions":
                section_starts.append((index, "voluntary_contribution"))
            elif normalized == "other transfers and allocations":
                section_starts.append((index, "other_transfer_allocation"))
        if not section_starts and not inherited_number and len(number.split(".")) == 3:
            header_text = " ".join(row.text.lower() for row in rows[:15])
            if (
                "donor" in header_text
                and "monetary" in header_text
                and "contributions" in header_text
            ):
                section_starts.append((0, "voluntary_contribution"))

    for section_position, (section_start, kind) in enumerate(section_starts):
        section_end = (
            section_starts[section_position + 1][0]
            if section_position + 1 < len(section_starts)
            else len(rows)
        )
        if kind == "voluntary_contribution_receivable":
            table_start = section_start + 1
            tables.append(
                make_table(
                    document,
                    page_number,
                    number,
                    code,
                    name,
                    kind,
                    ["counterparty", "current", "non_current", "total"],
                    rows,
                    dynamic_flow_boundaries(
                        rows, table_start, section_end, kind, page.rect.width
                    ),
                    table_start,
                    section_end,
                )
            )
        elif kind == "voluntary_contribution":
            table_start = section_start + 1
            has_levy = any(
                "1%" in word[4]
                for row in rows[table_start : min(section_end, table_start + 8)]
                for word in row.words
            )
            columns = ["counterparty", "monetary"]
            if has_levy:
                columns.append("levy")
            columns.extend(["in_kind", "refunds_transfers_adjustments", "total"])
            tables.append(
                make_table(
                    document,
                    page_number,
                    number,
                    code,
                    name,
                    kind,
                    columns,
                    rows,
                    dynamic_flow_boundaries(
                        rows, table_start, section_end, kind, page.rect.width
                    ),
                    table_start,
                    section_end,
                )
            )
        else:
            mode_markers: list[tuple[int, str]] = []
            for index in range(section_start + 1, section_end):
                words_right = [word[4] for word in rows[index].words if word[0] >= 150]
                right_text = join_words(words_right).lower()
                if "internal transfers" in right_text:
                    mode_markers.append((index, "internal_transfers"))
                elif "contributions" in right_text:
                    mode_markers.append((index, "contributions"))
            if not mode_markers:
                mode_markers = [(section_start + 1, "contributions")]
            for marker_position, (marker, mode) in enumerate(mode_markers):
                marker_end = (
                    mode_markers[marker_position + 1][0]
                    if marker_position + 1 < len(mode_markers)
                    else section_end
                )
                if mode == "internal_transfers":
                    marker_text = " ".join(
                        row.text.lower()
                        for row in rows[marker : min(marker_end, marker + 3)]
                    )
                    has_unlabelled_middle_values = False
                    unlabelled_value_centers: list[float] = []
                    for candidate in rows[marker + 1 : marker_end]:
                        numeric_centers = sorted(
                            (word[0] + word[2]) / 2
                            for word in candidate.words
                            if word[0] >= 200
                            and (
                                re.search(r"\d", word[4]) or word[4] in {"-", "–", "—"}
                            )
                        )
                        clusters: list[list[float]] = []
                        for value in numeric_centers:
                            if not clusters or value - clusters[-1][-1] > 35:
                                clusters.append([value])
                            else:
                                clusters[-1].append(value)
                        if len(clusters) >= 3:
                            has_unlabelled_middle_values = True
                            unlabelled_value_centers = [
                                sum(cluster) / len(cluster) for cluster in clusters[-3:]
                            ]
                            break
                    follows_contributions = any(
                        prior_mode == "contributions"
                        for _prior_marker, prior_mode in mode_markers[:marker_position]
                    )
                    if (
                        follows_contributions
                        or re.search(r"refunds/\s*adjustments", marker_text)
                        or has_unlabelled_middle_values
                    ):
                        columns = [
                            "counterparty",
                            "internal_transfers",
                            "refunds_adjustments",
                            "total",
                        ]
                    else:
                        columns = ["counterparty", "internal_transfers", "total"]
                else:
                    columns = [
                        "counterparty",
                        "contributions",
                        "refunds_adjustments",
                        "total",
                    ]
                table_kind = f"{kind}_{mode}"
                if (
                    mode == "internal_transfers"
                    and has_unlabelled_middle_values
                    and not follows_contributions
                ):
                    first_gap = (
                        unlabelled_value_centers[1] - unlabelled_value_centers[0]
                    )
                    boundaries = [
                        0.0,
                        max(150.0, unlabelled_value_centers[0] - first_gap / 2),
                        *[
                            (left + right) / 2
                            for left, right in pairwise(unlabelled_value_centers)
                        ],
                        page.rect.width + 1,
                    ]
                elif mode == "internal_transfers" and len(columns) == 4:
                    boundaries = dynamic_flow_boundaries(
                        rows,
                        section_start + 1 if follows_contributions else marker,
                        marker_end,
                        f"{kind}_contributions"
                        if follows_contributions
                        else table_kind,
                        page.rect.width,
                    )
                else:
                    boundaries = dynamic_flow_boundaries(
                        rows, marker, marker_end, table_kind, page.rect.width
                    )
                tables.append(
                    make_table(
                        document,
                        page_number,
                        number,
                        code,
                        name,
                        table_kind,
                        columns,
                        rows,
                        boundaries,
                        marker,
                        marker_end,
                    )
                )
    if (
        inherited_number
        and number
        and continuation
        and (not section_starts or section_starts[0][0] > 0)
    ):
        # Some continuation pages repeat only a column header, and others begin
        # directly with the next counterparty. Reuse the preceding physical
        # table's schema unless the page clearly introduces the contribution
        # table after a receivables table.
        continuation_end = section_starts[0][0] if section_starts else len(rows)
        header_text = " ".join(
            row.text.lower() for row in rows[: min(12, continuation_end)]
        )
        kind = continuation["table_kind"]
        columns = continuation["columns"]
        boundaries = continuation["column_boundaries"]
        if "voluntary" in header_text and "monetary" in header_text:
            kind = "voluntary_contribution"
            has_levy = "1%" in header_text
            columns = ["counterparty", "monetary"]
            if has_levy:
                columns.append("levy")
            columns.extend(["in_kind", "refunds_transfers_adjustments", "total"])
            boundaries = dynamic_flow_boundaries(
                rows, 0, len(rows), kind, page.rect.width
            )
        tables.insert(
            0,
            make_table(
                document,
                page_number,
                number,
                code,
                name,
                kind,
                columns,
                rows,
                boundaries,
                0,
                continuation_end,
            ),
        )
    return tables


def extract_literal_tables(
    document: ScheduleDocument, pdf_path: Path
) -> tuple[list[dict], dict]:
    pdf = fitz.open(pdf_path)
    identity_by_schedule: dict[str, tuple[str, str]] = {}
    tables: list[dict] = []
    last_identity: tuple[str, str, str] | None = None
    continuation: dict | None = None
    pages_with_text = 0
    pages_with_tables = 0
    for page_index, page in enumerate(pdf):
        if page.get_text("words"):
            pages_with_text += 1
        page_tables = extract_page_tables(
            document,
            page,
            page_index + 1,
            identity_by_schedule,
            continuation,
            last_identity,
        )
        for table in page_tables:
            if table.get("fund_code") and table.get("base_schedule_number"):
                last_identity = (
                    table["base_schedule_number"],
                    table["fund_code"],
                    table.get("fund_name") or "",
                )
            elif last_identity and table["table_kind"] in {
                "financial_performance",
                "changes_in_net_assets",
            }:
                prior_schedule, prior_code, prior_name = last_identity
                table["schedule_number"] = prior_schedule
                table["base_schedule_number"] = prior_schedule
                table["fund_code"] = prior_code
                table["fund_name"] = prior_name
        if page_tables:
            pages_with_tables += 1
            tables.extend(page_tables)
            last_table = page_tables[-1]
            if (
                last_table["table_kind"].startswith(
                    ("voluntary_contribution", "other_transfer_allocation")
                )
                and last_table.get("schedule_number")
                and last_table.get("fund_code")
            ):
                continuation = {
                    "schedule_number": last_table["schedule_number"],
                    "fund_code": last_table["fund_code"],
                    "fund_name": last_table.get("fund_name") or "",
                    "table_kind": last_table["table_kind"],
                    "columns": last_table["columns"],
                    "column_boundaries": last_table["column_boundaries"],
                }
            else:
                continuation = None
        else:
            continuation = None
    profile = {
        "calendar_year": document.calendar_year,
        "pdf_pages": len(pdf),
        "pages_with_text": pages_with_text,
        "pages_with_detected_tables": pages_with_tables,
        "tables": len(tables),
        "funds_detected": len(
            {table["fund_code"] for table in tables if table["fund_code"]}
        ),
        "table_kinds": dict(
            sorted(
                pd.Series([table["table_kind"] for table in tables])
                .value_counts()
                .to_dict()
                .items()
            )
        ),
    }
    pdf.close()
    return tables, profile


def parse_amount(value: str) -> tuple[int | None, bool]:
    value = value.strip()
    if not value:
        return None, False
    if value in {"-", "–", "—", "- -"}:
        return 0, True
    negative = value.startswith("(") and value.endswith(")")
    digits = re.sub(r"[^0-9]", "", value)
    if not digits:
        return None, False
    amount = int(digits)
    return (-amount if negative else amount), False


def is_flow_header(label: str) -> bool:
    normalized = label.lower().strip()
    return any(term in normalized for term in FLOW_HEADER_TERMS)


def canonical_statement_label(value: str) -> str:
    """Remove presentation-only footnote markers from a statement label."""
    value = re.sub(r"(?:^|\s)(?:/[a-z]|ᐟ[ᵃᵇ])(?=\s|$)", " ", value)
    value = re.sub(r"/[a-z]\b", " ", value)
    value = join_words([value])
    if re.fullmatch(r"contributions?\s+voluntary", value, re.IGNORECASE):
        return "Voluntary contributions"
    return value


def normalize_statement_table(table: dict) -> list[dict]:
    value_columns = [column for column in table["columns"] if column.endswith("period")]
    facts: list[dict] = []
    section_path: list[str] = []
    pending_label = ""
    for source_row_index, row in enumerate(table["rows"]):
        reported_label = row.get("line_item", "").strip()
        label = canonical_statement_label(reported_label)
        amounts = {
            column: parse_amount(row.get(column, ""))[0] for column in value_columns
        }
        has_amount = any(amount is not None for amount in amounts.values())
        if not has_amount:
            if label in STATEMENT_HEADINGS:
                if label in {
                    "Assets",
                    "Liabilities",
                    "Net assets",
                    "Revenue",
                    "Expenses",
                    "Change in net assets",
                }:
                    section_path = [label]
                else:
                    section_path = section_path[:1] + [label]
                pending_label = ""
            elif (
                label
                and not re.fullmatch(r"\d+", label)
                and "prepared in accordance" not in label.lower()
            ):
                if facts and not pending_label:
                    facts[-1]["line_item"] = join_words([facts[-1]["line_item"], label])
                else:
                    pending_label = join_words([pending_label, label])
            continue
        label = canonical_statement_label(join_words([pending_label, label]))
        pending_label = ""
        if not label:
            continue
        for column in value_columns:
            amount, is_dash = parse_amount(row.get(column, ""))
            if amount is None:
                continue
            period_year = (
                table["calendar_year"]
                if column == "current_period"
                else table["calendar_year"] - 1
            )
            facts.append(
                {
                    "calendar_year": table["calendar_year"],
                    "period_year": period_year,
                    "recid": table["recid"],
                    "page": table["page"],
                    "source_table_id": table["table_id"],
                    "source_row_index": source_row_index,
                    "source_y": row.get("y"),
                    "schedule_number": table["schedule_number"],
                    "fund_code": table["fund_code"],
                    "statement_type": table["table_kind"],
                    "section": " > ".join(section_path) if section_path else None,
                    "line_item": label,
                    "reported_line_item": reported_label or label,
                    "schedule_ref": row.get("schedule_ref") or None,
                    "amount_usd": amount,
                    "reported_text": row.get(column, ""),
                    "reported_as_dash": is_dash,
                    "is_total": label.lower().startswith("total")
                    or label.lower().startswith("net of total"),
                }
            )
    return facts


def normalize_flow_table(table: dict) -> list[dict]:
    measure_columns = [
        column for column in table["columns"] if column != "counterparty"
    ]
    rows: list[dict] = []
    group: str | None = None
    pending_label = ""
    last_data: dict | None = None
    amount_indexes = [
        index
        for index, literal in enumerate(table["rows"])
        if any(
            parse_amount(literal.get(column, ""))[0] is not None
            for column in measure_columns
        )
    ]
    last_amount_index = amount_indexes[-1] if amount_indexes else None
    for literal_index, literal in enumerate(table["rows"]):
        if float(literal.get("y", 0)) > 720 and not any(
            parse_amount(literal.get(column, ""))[0] is not None
            for column in measure_columns
        ):
            continue
        label = literal.get("counterparty", "").strip()
        amounts = {
            column: parse_amount(literal.get(column, ""))[0]
            for column in measure_columns
        }
        has_amount = any(amount is not None for amount in amounts.values())
        if not has_amount:
            if label in COUNTERPARTY_GROUPS:
                group = label
                pending_label = ""
                last_data = None
            elif (
                label and not is_flow_header(label) and not re.fullmatch(r"\d+", label)
            ):
                if last_data is not None:
                    last_data["counterparty"] = join_words(
                        [last_data["counterparty"], label]
                    )
                else:
                    pending_label = join_words([pending_label, label])
            continue
        label = join_words([pending_label, label])
        pending_label = ""
        if (
            not label
            and literal_index == last_amount_index
            and table["table_kind"] == "voluntary_contribution"
            and amounts.get("total") is not None
        ):
            label = "Total"
        if not label or is_flow_header(label):
            continue
        data = {
            "calendar_year": table["calendar_year"],
            "recid": table["recid"],
            "page": table["page"],
            "source_table_id": table["table_id"],
            "source_row_index": literal_index,
            "source_y": literal.get("y"),
            "schedule_number": table["schedule_number"],
            "fund_code": table["fund_code"],
            "flow_type": table["table_kind"],
            "counterparty_group": group,
            "counterparty": label,
            "is_total": label.lower().startswith("total"),
        }
        for column in measure_columns:
            amount, is_dash = parse_amount(literal.get(column, ""))
            data[f"{column}_usd"] = amount
            data[f"{column}_reported_text"] = literal.get(column, "")
            data[f"{column}_reported_as_dash"] = is_dash
        rows.append(data)
        last_data = data
    return rows


def normalize_tables(
    tables: Sequence[dict],
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    statement_facts: list[dict] = []
    flow_rows: list[dict] = []
    fund_year_rows: dict[tuple[int, str], dict] = {}
    for table in tables:
        code = table.get("fund_code")
        if code:
            key = (table["calendar_year"], code)
            fund_year_rows.setdefault(
                key,
                {
                    "calendar_year": table["calendar_year"],
                    "fund_code": code,
                    "fund_name": table.get("fund_name"),
                    "base_schedule_number": table.get("base_schedule_number"),
                    "recid": table["recid"],
                    "first_pdf_page": table["page"],
                },
            )
            fund_year_rows[key]["first_pdf_page"] = min(
                fund_year_rows[key]["first_pdf_page"], table["page"]
            )
        if table["table_kind"] in {
            "financial_position",
            "financial_performance",
            "changes_in_net_assets",
        }:
            statement_facts.extend(normalize_statement_table(table))
        elif table["table_kind"].startswith(
            ("voluntary_contribution", "other_transfer_allocation")
        ):
            flow_rows.extend(normalize_flow_table(table))

    fund_years = pd.DataFrame(fund_year_rows.values()).sort_values(
        ["calendar_year", "fund_code"], ignore_index=True
    )
    statements = pd.DataFrame(statement_facts)
    if not statements.empty:
        statements = statements.sort_values(
            [
                "calendar_year",
                "fund_code",
                "statement_type",
                "page",
                "source_y",
                "period_year",
            ],
            ignore_index=True,
        )
    flows = pd.DataFrame(flow_rows)
    if not flows.empty:
        flows = flows.sort_values(
            [
                "calendar_year",
                "fund_code",
                "flow_type",
                "page",
                "source_y",
                "counterparty",
            ],
            ignore_index=True,
        )
        flows["counterparty_group"] = flows.groupby(
            ["calendar_year", "fund_code", "flow_type"],
            sort=False,
            dropna=False,
        )["counterparty_group"].ffill()

    funds = (
        fund_years.sort_values(["fund_code", "calendar_year"])
        .groupby("fund_code", as_index=False)
        .agg(
            fund_name=("fund_name", "last"),
            first_year=("calendar_year", "min"),
            last_year=("calendar_year", "max"),
            observed_years=("calendar_year", "nunique"),
        )
    )

    nested = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(UTC).isoformat(),
        "units": "United States dollars",
        "funds": [],
    }
    statement_groups = (
        statements.groupby(["calendar_year", "fund_code"], dropna=False)
        if not statements.empty
        else {}
    )
    flow_groups = (
        flows.groupby(["calendar_year", "fund_code"], dropna=False)
        if not flows.empty
        else {}
    )
    for fund in funds.to_dict("records"):
        fund_node = {**fund, "periods": []}
        period_frame = fund_years[fund_years.fund_code == fund["fund_code"]].astype(
            object
        )
        period_records = period_frame.where(pd.notna(period_frame), None).to_dict(
            "records"
        )
        for period in period_records:
            key = (period["calendar_year"], period["fund_code"])
            if not statements.empty and key in statement_groups.groups:
                statement_frame = statement_groups.get_group(key).astype(object)
                statement_records = statement_frame.where(
                    pd.notna(statement_frame), None
                ).to_dict("records")
            else:
                statement_records = []
            if not flows.empty and key in flow_groups.groups:
                flow_frame = flow_groups.get_group(key).astype(object)
                flow_records = flow_frame.where(pd.notna(flow_frame), None).to_dict(
                    "records"
                )
            else:
                flow_records = []
            fund_node["periods"].append(
                {
                    **period,
                    "statement_facts": statement_records,
                    "counterparty_flows": flow_records,
                }
            )
        nested["funds"].append(fund_node)
    return funds, fund_years, statements, flows, nested


def quality_profile(
    documents: pd.DataFrame,
    tables: Sequence[dict],
    funds: pd.DataFrame,
    fund_years: pd.DataFrame,
    statements: pd.DataFrame,
    flows: pd.DataFrame,
) -> dict:
    reconciliation_checks = []
    if not flows.empty:
        for _, row in flows[~flows["is_total"]].iterrows():
            if row["flow_type"] == "voluntary_contribution":
                components = [
                    "monetary_usd",
                    "levy_usd",
                    "in_kind_usd",
                    "refunds_transfers_adjustments_usd",
                ]
            elif row["flow_type"] == "voluntary_contribution_receivable":
                components = ["current_usd", "non_current_usd"]
            elif row["flow_type"].endswith("_contributions"):
                components = ["contributions_usd", "refunds_adjustments_usd"]
            else:
                components = ["internal_transfers_usd", "refunds_adjustments_usd"]
            total = row.get("total_usd")
            values = [row.get(column) for column in components]
            if (
                total is None
                or pd.isna(total)
                or all(value is None or pd.isna(value) for value in values)
            ):
                continue
            calculated = sum(
                0 if value is None or pd.isna(value) else int(value) for value in values
            )
            reconciliation_checks.append(
                {
                    "calendar_year": int(row["calendar_year"]),
                    "fund_code": row["fund_code"],
                    "flow_type": row["flow_type"],
                    "counterparty": row["counterparty"],
                    "reported_total_usd": int(total),
                    "calculated_total_usd": calculated,
                    "difference_usd": int(total) - calculated,
                }
            )
    failed = [check for check in reconciliation_checks if check["difference_usd"] != 0]
    duplicate_statement_keys = 0
    position_checks: list[dict] = []
    performance_checks: list[dict] = []
    if not statements.empty:
        duplicate_statement_keys = int(
            statements.duplicated(
                [
                    "calendar_year",
                    "fund_code",
                    "statement_type",
                    "section",
                    "line_item",
                    "period_year",
                ],
                keep=False,
            ).sum()
        )
        current_statements = statements[
            statements["period_year"] == statements["calendar_year"]
        ].copy()
        current_statements["normalized_line_item"] = current_statements[
            "line_item"
        ].map(
            lambda value: re.sub(
                r"\s+", " ", str(value).lower().replace(" / ", "/")
            ).strip()
        )
        for (year, fund_code), group in current_statements.groupby(
            ["calendar_year", "fund_code"]
        ):
            position = group[group["statement_type"] == "financial_position"]
            position_values = dict(
                zip(position["normalized_line_item"], position["amount_usd"])
            )
            position_items = ("total assets", "total liabilities", "total net assets")
            if all(item in position_values for item in position_items):
                difference = (
                    int(position_values["total assets"])
                    - int(position_values["total liabilities"])
                    - int(position_values["total net assets"])
                )
                position_checks.append(
                    {
                        "calendar_year": int(year),
                        "fund_code": fund_code,
                        "difference_usd": difference,
                    }
                )
            performance = group[group["statement_type"] == "financial_performance"]
            performance_values = dict(
                zip(performance["normalized_line_item"], performance["amount_usd"])
            )
            revenue = performance_values.get(
                "total revenue", performance_values.get("total revenues")
            )
            expenses = performance_values.get("total expenses")
            surplus = performance_values.get("surplus/(deficit) for the year")
            if revenue is not None and expenses is not None and surplus is not None:
                difference = int(revenue) - int(expenses) - int(surplus)
                performance_checks.append(
                    {
                        "calendar_year": int(year),
                        "fund_code": fund_code,
                        "difference_usd": difference,
                    }
                )
    position_failures = [check for check in position_checks if check["difference_usd"]]
    performance_failures = [
        check for check in performance_checks if check["difference_usd"]
    ]
    missing_2020 = 2020 not in set(documents["calendar_year"].tolist())

    table_frame = pd.DataFrame(
        [
            {
                "calendar_year": table["calendar_year"],
                "fund_code": table.get("fund_code"),
                "base_schedule_number": table.get("base_schedule_number"),
                "table_kind": table["table_kind"],
            }
            for table in tables
        ]
    )
    expected_fund_years = set(
        fund_years[["calendar_year", "fund_code"]].itertuples(index=False, name=None)
    )
    core_failures: list[dict] = []
    for table_kind in ("financial_position", "financial_performance"):
        core = table_frame[table_frame["table_kind"] == table_kind]
        counts = core.groupby(["calendar_year", "fund_code"], dropna=False).size()
        observed = set(counts.index.tolist())
        for year, code in sorted(expected_fund_years - observed):
            core_failures.append(
                {
                    "calendar_year": int(year),
                    "fund_code": code,
                    "table_kind": table_kind,
                    "problem": "missing",
                }
            )
        for (year, code), count in counts[counts != 1].items():
            core_failures.append(
                {
                    "calendar_year": int(year),
                    "fund_code": code,
                    "table_kind": table_kind,
                    "problem": f"{int(count)} tables",
                }
            )

    identity_counts = (
        table_frame.dropna(subset=["base_schedule_number", "fund_code"])
        .groupby(["calendar_year", "base_schedule_number"])["fund_code"]
        .nunique()
    )
    identity_failures = [
        {
            "calendar_year": int(year),
            "base_schedule_number": schedule,
            "fund_codes": int(count),
        }
        for (year, schedule), count in identity_counts[identity_counts != 1].items()
    ]
    duplicate_fund_years = int(
        fund_years.duplicated(["calendar_year", "fund_code"], keep=False).sum()
    )

    source_exceptions: list[dict] = []
    unexpected_position_failures: list[dict] = []
    for check in position_failures:
        key = (
            check["calendar_year"],
            check["fund_code"],
            "financial_position_equation",
            check["difference_usd"],
        )
        if key in KNOWN_SOURCE_EXCEPTIONS:
            source_exceptions.append(
                {
                    **check,
                    "severity": "high",
                    "confidence": "high",
                    "note": KNOWN_SOURCE_EXCEPTIONS[key],
                }
            )
        else:
            unexpected_position_failures.append(check)

    flow_arithmetic_exceptions = []
    for check in failed:
        if abs(check["difference_usd"]) <= 1:
            flow_arithmetic_exceptions.append(
                {
                    **check,
                    "severity": "low",
                    "confidence": "high",
                    "note": "The printed component sum differs from its total by $1.",
                }
            )
        elif (
            check["counterparty"].lower().startswith("add/(less): present value")
            and check["calculated_total_usd"] == 0
        ):
            flow_arithmetic_exceptions.append(
                {
                    **check,
                    "severity": "medium",
                    "confidence": "high",
                    "note": (
                        "The source prints the present-value adjustment only in "
                        "the total column, with no component allocation."
                    ),
                }
            )
    unexpected_flow_failures = [
        check
        for check in failed
        if not any(
            all(exception.get(key) == value for key, value in check.items())
            for exception in flow_arithmetic_exceptions
        )
    ]

    contribution_checks: list[dict] = []
    contribution_failures: list[dict] = []
    if not statements.empty:
        current_performance = statements[
            (statements["period_year"] == statements["calendar_year"])
            & (statements["statement_type"] == "financial_performance")
        ].copy()
        contribution_statements = current_performance[
            current_performance["line_item"]
            .str.lower()
            .str.startswith("voluntary contribution", na=False)
        ]
        observed_contribution_statements = set(
            contribution_statements[["calendar_year", "fund_code"]].itertuples(
                index=False, name=None
            )
        )
        for year, code in sorted(
            expected_fund_years - observed_contribution_statements
        ):
            missing = {
                "calendar_year": int(year),
                "fund_code": code,
                "statement_amount_usd": None,
                "reported_schedule_total_usd": None,
                "difference_usd": None,
                "problem": "financial performance has no voluntary contribution line",
            }
            contribution_checks.append(missing)
            contribution_failures.append(missing)
        reported_totals = flows[
            (flows["flow_type"] == "voluntary_contribution")
            & (
                flows["counterparty"].str.lower().str.startswith("total", na=False)
                | (flows["counterparty"].str.lower() == "grand total")
            )
        ]
        total_groups = reported_totals.groupby(["calendar_year", "fund_code"])
        for statement in contribution_statements.itertuples(index=False):
            key = (statement.calendar_year, statement.fund_code)
            matches = (
                total_groups.get_group(key) if key in total_groups.groups else None
            )
            check = {
                "calendar_year": int(statement.calendar_year),
                "fund_code": statement.fund_code,
                "statement_amount_usd": int(statement.amount_usd),
                "reported_schedule_total_usd": None,
                "difference_usd": None,
            }
            numeric_matches = (
                matches[matches["total_usd"].notna()] if matches is not None else None
            )
            exact_matches = (
                numeric_matches[
                    numeric_matches["total_usd"].astype(int)
                    == int(statement.amount_usd)
                ]
                if numeric_matches is not None
                else None
            )
            if int(statement.amount_usd) == 0 and (
                numeric_matches is None or numeric_matches.empty
            ):
                pass
            elif exact_matches is not None and not exact_matches.empty:
                preferred = exact_matches[
                    exact_matches["counterparty"]
                    .str.lower()
                    .isin(["total", "grand total"])
                ]
                match = (
                    preferred.iloc[0] if not preferred.empty else exact_matches.iloc[0]
                )
                check["reported_schedule_total_usd"] = int(match["total_usd"])
                check["difference_usd"] = 0
                check["reported_schedule_total_label"] = match["counterparty"]
            elif numeric_matches is None or numeric_matches.empty:
                if int(statement.amount_usd) != 0:
                    check["problem"] = (
                        "non-zero statement has no reported schedule total"
                    )
                    contribution_failures.append(check)
            elif len(numeric_matches) != 1:
                check["problem"] = (
                    f"{len(numeric_matches)} candidate schedule totals; none matches "
                    "the statement"
                )
                contribution_failures.append(check)
            else:
                match = numeric_matches.iloc[0]
                reported = int(match["total_usd"])
                check["reported_schedule_total_usd"] = reported
                check["reported_schedule_total_label"] = match["counterparty"]
                check["difference_usd"] = reported - int(statement.amount_usd)
                if check["difference_usd"]:
                    check["problem"] = "schedule total differs from statement"
                    contribution_failures.append(check)
            contribution_checks.append(check)

    gates = [
        {
            "name": "canonical_fund_identity",
            "status": "pass" if not identity_failures else "fail",
            "failure_count": len(identity_failures),
            "failure_examples": identity_failures[:20],
        },
        {
            "name": "one_fund_year_and_core_statement",
            "status": "pass"
            if duplicate_fund_years == 0 and not core_failures
            else "fail",
            "failure_count": duplicate_fund_years + len(core_failures),
            "failure_examples": core_failures[:20],
        },
        {
            "name": "statement_fact_keys_and_equations",
            "status": "pass"
            if duplicate_statement_keys == 0
            and not unexpected_position_failures
            and not performance_failures
            else "fail",
            "failure_count": duplicate_statement_keys
            + len(unexpected_position_failures)
            + len(performance_failures),
            "failure_examples": (unexpected_position_failures + performance_failures)[
                :20
            ],
        },
        {
            "name": "flow_component_arithmetic",
            "status": "pass" if not unexpected_flow_failures else "fail",
            "failure_count": len(unexpected_flow_failures),
            "failure_examples": unexpected_flow_failures[:20],
        },
        {
            "name": "voluntary_contribution_statement_reconciliation",
            "status": "pass" if not contribution_failures else "fail",
            "failure_count": len(contribution_failures),
            "failure_examples": contribution_failures[:20],
        },
    ]
    validation_status = (
        "pass" if all(gate["status"] == "pass" for gate in gates) else "fail"
    )
    return {
        "validation_status": validation_status,
        "validation_gates": gates,
        "documents": len(documents),
        "calendar_years": sorted(
            int(year) for year in documents["calendar_year"].tolist()
        ),
        "missing_2020_schedule_in_configured_sources": missing_2020,
        "docx_available_count": int(documents["docx_available"].sum()),
        "docx_unavailable_count": int((~documents["docx_available"]).sum()),
        "literal_tables": len(tables),
        "funds": len(funds),
        "fund_years": len(fund_years),
        "statement_facts": len(statements),
        "counterparty_flow_rows": len(flows),
        "missing_fund_code_tables": sum(
            1 for table in tables if not table.get("fund_code")
        ),
        "duplicate_statement_fact_keys": duplicate_statement_keys,
        "financial_position_reconciliations": len(position_checks),
        "financial_position_reconciliation_failures": len(position_failures),
        "financial_position_reconciliation_failure_examples": position_failures[:20],
        "financial_performance_reconciliations": len(performance_checks),
        "financial_performance_reconciliation_failures": len(performance_failures),
        "financial_performance_reconciliation_failure_examples": performance_failures[
            :20
        ],
        "flow_component_reconciliations": len(reconciliation_checks),
        "flow_component_reconciliation_failures": len(failed),
        "flow_component_reconciliation_failure_examples": failed[:20],
        "voluntary_contribution_statement_reconciliations": len(contribution_checks),
        "voluntary_contribution_statement_reconciliation_failures": len(
            contribution_failures
        ),
        "known_source_exceptions": source_exceptions,
        "flow_arithmetic_exceptions": flow_arithmetic_exceptions,
        "warnings": [
            warning
            for warning in [
                "No 2020 schedule was found in the configured sources; no values are interpolated."
                if missing_2020
                else None,
                (
                    "The Documents API returned DOCX for only "
                    f"{int(documents['docx_available'].sum())} of {len(documents)} "
                    "sources; table extraction uses the PDFs consistently."
                )
                if int(documents["docx_available"].sum()) < len(documents)
                else None,
            ]
            if warning
        ],
    }


def write_stage1(tables: Sequence[dict], stage1_dir: Path) -> pd.DataFrame:
    if stage1_dir.exists():
        shutil.rmtree(stage1_dir)
    stage1_dir.mkdir(parents=True, exist_ok=True)
    tables_dir = stage1_dir / "tables"
    tables_dir.mkdir(parents=True, exist_ok=True)
    index_rows = []
    with (stage1_dir / "tables.jsonl").open("w", encoding="utf-8") as handle:
        for table in tables:
            handle.write(json.dumps(table, ensure_ascii=False) + "\n")
            csv_path = tables_dir / f"{table['table_id']}.csv"
            frame = pd.DataFrame(table["rows"])
            frame.to_csv(csv_path, index=False)
            index_rows.append(
                {
                    key: value
                    for key, value in table.items()
                    if key not in {"columns", "rows"}
                }
                | {"row_count": len(table["rows"]), "csv_path": str(csv_path)}
            )
    index = pd.DataFrame(index_rows)
    index.to_csv(stage1_dir / "table-index.csv", index=False)
    return index


def write_stage2(
    output_dir: Path,
    funds: pd.DataFrame,
    fund_years: pd.DataFrame,
    statements: pd.DataFrame,
    flows: pd.DataFrame,
    nested: dict,
) -> None:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    funds.to_csv(output_dir / "funds.csv", index=False)
    fund_years.to_csv(output_dir / "fund-years.csv", index=False)
    statements.to_csv(output_dir / "statement-facts.csv", index=False)
    flows.to_csv(output_dir / "counterparty-flows.csv", index=False)
    (output_dir / "trust-fund-schedules.json").write_text(
        json.dumps(nested, ensure_ascii=False, indent=2, allow_nan=False),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--years",
        nargs="*",
        type=int,
        help="Calendar years to process. Defaults to every modern annual schedule found.",
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--no-download", action="store_true")
    parser.add_argument(
        "--allow-validation-failures",
        action="store_true",
        help=(
            "Write stage 2 even when a validation gate fails. Intended only "
            "for parser research and manual diagnosis."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    session = requests.Session()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    if args.no_download:
        manifest_path = args.output_dir / "source-manifest.json"
        if not manifest_path.exists():
            raise RuntimeError(
                f"--no-download requires an existing manifest at {manifest_path}"
            )
        source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        documents = [
            ScheduleDocument(
                recid=int(row["recid"]) if row.get("recid") is not None else None,
                calendar_year=int(row["calendar_year"]),
                publication_year=row.get("publication_year"),
                symbol=row["symbol"],
                title=row["title"],
                source_catalog=row["source_catalog"],
                landing_page_url=row["landing_page_url"],
                source_pdf_url=row["source_pdf_url"],
            )
            for row in source_manifest
            if not args.years or int(row["calendar_year"]) in set(args.years)
        ]
        source_manifest = [
            row
            for row in source_manifest
            if not args.years or int(row["calendar_year"]) in set(args.years)
        ]
    else:
        discovered = discover_documents(session)
        documents = [
            document
            for document in discovered
            if not args.years or document.calendar_year in set(args.years)
        ]
        source_manifest = retrieve_documents(documents, args.output_dir, session)
        (args.output_dir / "source-manifest.json").write_text(
            json.dumps(source_manifest, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    if not documents:
        raise RuntimeError(
            "No matching Schedule of Individual Trust Funds documents found"
        )
    manifest_by_year = {int(row["calendar_year"]): row for row in source_manifest}
    all_tables: list[dict] = []
    extraction_profiles: list[dict] = []
    for document in documents:
        pdf_path = Path(manifest_by_year[document.calendar_year]["pdf_path"])
        tables, profile = extract_literal_tables(document, pdf_path)
        all_tables.extend(tables)
        extraction_profiles.append(profile)
        print(
            f"{document.calendar_year}: {profile['tables']} tables, "
            f"{profile['funds_detected']} fund codes",
            file=sys.stderr,
        )
    table_index = write_stage1(all_tables, args.output_dir / "stage1")
    funds, fund_years, statements, flows, nested = normalize_tables(all_tables)
    documents_frame = pd.DataFrame(source_manifest)
    profile = quality_profile(
        documents_frame, all_tables, funds, fund_years, statements, flows
    )
    profile["extraction_by_year"] = extraction_profiles
    profile["stage1_table_index_rows"] = len(table_index)
    (args.output_dir / "quality-profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    if profile["validation_status"] == "pass" or args.allow_validation_failures:
        write_stage2(
            args.output_dir / "stage2", funds, fund_years, statements, flows, nested
        )
    print(json.dumps(profile, indent=2, ensure_ascii=False))
    if profile["validation_status"] != "pass":
        print(
            (
                "Validation failed; stage 2 was written only because the "
                "diagnostic override was supplied."
                if args.allow_validation_failures
                else "Validation failed; stage 2 was not published. See "
                "quality-profile.json."
            ),
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
