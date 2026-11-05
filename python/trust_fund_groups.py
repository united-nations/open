"""Extract annual table-of-contents groups without inferring entity ownership."""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import pymupdf


# Reviewed damaged font strings on the 2024 contents page. Repair only these
# exact strings; do not guess headings from PPB labels or another year's PDF.
CONTENTS_FONT_REPAIRS = {
    '"!\x1e\x19*\x12\x10\x1ee\x10\x15\x15\x10\x19#$e': "POLITICAL AFFAIRS",
    "$9E;:]K;e": "Schedule",
    "\x07\x05\x07e": "1.1",
}


def groups_from_pages(pages: list[list[str]]) -> list[dict]:
    """Read uppercase headings immediately before Schedule and its first number."""
    groups = []
    seen = set()
    for page_number, page_lines in enumerate(pages, 1):
        lines = []
        for raw in page_lines:
            repaired = CONTENTS_FONT_REPAIRS.get(raw.strip(), raw.strip())
            if repaired:
                lines.append((raw.strip(), repaired))
        for index, (_, line) in enumerate(lines):
            if line != "Schedule":
                continue
            heading_lines = []
            reported_lines = []
            for raw, prior in reversed(lines[:index]):
                # PDF underline artifacts introduce a stray U or h around text.
                prior = prior.replace("U NITED", "UNITED")
                prior = re.sub(r"^U(?=POLITICAL|HUMAN|PUBLIC|COMMON)", "", prior)
                if re.fullmatch(r"[A-Z0-9]{2,3}", prior):
                    break  # A preceding fund's wrapped code, such as DSA.
                match = re.fullmatch(r"[^A-Z]*([A-Z][A-Z /–&-]+)\s*", prior)
                if not match:
                    if prior in {"U", "h", "h\x03"}:
                        continue
                    break
                heading_lines.insert(0, match[1])
                reported_lines.insert(0, raw)
            if not heading_lines:
                continue
            number = next((match for _, text in lines[index + 1:index + 8]
                           if (match := re.match(r"^(\d+)\.\d+(?:\s|$)", text))), None)
            if number is None:
                raise ValueError(f"Missing schedule number after heading on PDF p. {page_number}")
            code = number[1]
            if code in seen:
                raise ValueError(f"Duplicate schedule group {code}")
            seen.add(code)
            heading = " ".join(heading_lines)
            label = heading.capitalize().replace("United nations", "United Nations").replace(
                "multi-partner trust fund", "Multi-Partner Trust Fund")
            label = label.replace("United Nations office for partnerships", "United Nations Office for Partnerships")
            groups.append({
                "schedule_group_code": code,
                "schedule_group_name": label,
                "reported_heading": " ".join(reported_lines),
                "heading_pdf_page": page_number,
            })
    if not groups:
        raise ValueError("No schedule contents groups found")
    return groups


def extract_groups(pdf_path: Path, contents_end: int) -> list[dict]:
    with pymupdf.open(pdf_path) as document:
        # Read physical lines in visual order. In the 2024 PDF the heading is
        # stored after the schedule-number column, despite appearing above it.
        pages = []
        for page in document[:contents_end]:
            lines = [line for block in page.get_text("dict")["blocks"]
                     for line in block.get("lines", [])]
            lines.sort(key=lambda line: (round(line["bbox"][1]), line["bbox"][0]))
            pages.append(["".join(span["text"] for span in line["spans"]) for line in lines])
        return groups_from_pages(pages)


def annotate_groups(fund_years: pd.DataFrame, manifest: list[dict]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Join by the selected year's schedule prefix, including unresolved funds."""
    rows = []
    for source in manifest:
        year = int(source["calendar_year"])
        annual = fund_years.loc[fund_years.calendar_year.eq(year)]
        if annual.empty:
            continue
        groups = extract_groups(Path(source["pdf_path"]), int(annual.first_pdf_page.min()) - 1)
        rows.extend({"calendar_year": year, **group} for group in groups)
    groups_frame = pd.DataFrame(rows)
    columns = ["schedule_group_code", "schedule_group_name", "heading_pdf_page"]
    annotated = fund_years.drop(columns=columns, errors="ignore").copy()
    annotated["schedule_group_code"] = annotated.base_schedule_number.astype(str).str.split(".").str[0]
    annotated = annotated.merge(
        groups_frame.drop(columns="reported_heading"),
        on=["calendar_year", "schedule_group_code"], how="left", validate="m:1",
    )
    if annotated.schedule_group_name.isna().any():
        missing = annotated.loc[annotated.schedule_group_name.isna(), ["calendar_year", "fund_code"]]
        raise ValueError(f"Missing source group for fund-years: {missing.to_dict('records')}")
    annotated["heading_pdf_page"] = annotated.heading_pdf_page.astype(int)
    return annotated, groups_frame
