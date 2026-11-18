"""Read annual fund descriptions from the Schedule of Individual Trust Funds annex."""

from __future__ import annotations

import csv
import re
from functools import cache
from pathlib import Path

import pymupdf


SCHEDULE = re.compile(r"^Schedule\s+(\d+(?:\.\d+)*)\s*$", re.I)
PARAGRAPH = re.compile(r"^\d+\.\s*(.*)$")
LIST_ITEM = re.compile(r"^\(([a-z])\)\s*(.*)$")
CITATIONS_PATH = Path(__file__).resolve().parents[1] / "data/trust-fund-schedules/description-citations.csv"


def join_lines(lines: list[str]) -> str:
    text = "\n".join(lines).replace("\u00ad", "")
    return " ".join(re.sub(r"(?<=\w)-\n(?=\w)", "-", text).split())


def description_blocks(lines: list[str]) -> list[dict]:
    """Recognize consecutive lettered items at line starts, not inline references."""
    markers = [match.group(1) for line in lines if (match := LIST_ITEM.match(line))]
    if not any(a == "a" and b == "b" for a, b in zip(markers, markers[1:])):
        return [{"type": "paragraph", "text": join_lines(lines)}]

    blocks = []
    paragraph: list[str] = []
    items = None
    item_lines: list[str] = []

    def flush_paragraph():
        if text := join_lines(paragraph):
            blocks.append({"type": "paragraph", "text": text})
        paragraph.clear()

    def flush_item():
        if items is not None and items:
            items[-1]["text"] = join_lines(item_lines)
        item_lines.clear()

    for index, line in enumerate(lines):
        match = LIST_ITEM.match(line)
        expected = chr(ord(items[-1]["label"]) + 1) if items else "a"
        if match and match.group(1) == expected:
            flush_paragraph()
            flush_item()
            if items is None:
                items = []
                blocks.append({"type": "list", "items": items})
            items.append({"label": match.group(1), "text": ""})
            item_lines.append(match.group(2))
        elif items is not None:
            next_line = next((value for value in lines[index + 1:] if value), "")
            # A blank after a completed item separates subsequent prose. A page
            # break or a wrapped item ending in a semicolon does not end a list.
            if not line and join_lines(item_lines).endswith(".") and next_line and not LIST_ITEM.match(next_line):
                flush_item()
                items = None
            else:
                item_lines.append(line)
        else:
            paragraph.append(line)
    flush_item()
    flush_paragraph()
    return blocks


@cache
def description_citations() -> dict[str, list[tuple[str, str]]]:
    citations: dict[str, list[tuple[str, str]]] = {}
    with CITATIONS_PATH.open(encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            citations.setdefault(row["fund_code"], []).append((row["text"], row["href"]))
    return citations


def add_citation_links(blocks: list[dict], code: str) -> None:
    """Locate reviewed excerpts in each paragraph or list item, preserving source text."""
    citations = description_citations().get(code, [])
    for block in blocks:
        for part in block["items"] if block["type"] == "list" else [block]:
            text = part["text"]
            matches = sorted(
                (match.start(), match.end(), href)
                for excerpt, href in citations
                for match in re.finditer(rf"(?<![\w/]){re.escape(excerpt)}(?![\w/])", text, re.I)
            )
            if not matches:
                continue
            links = []
            last_end = 0
            for start, end, href in matches:
                if start < last_end:
                    raise ValueError(f"Overlapping trust-fund description citations for {code}")
                # JavaScript slices strings by UTF-16 code unit.
                links.append({
                    "start": len(text[:start].encode("utf-16-le")) // 2,
                    "end": len(text[:end].encode("utf-16-le")) // 2,
                    "href": href,
                })
                last_end = end
            part["links"] = links


def descriptions_from_pages(pages: list[str], schedules: dict[str, str]) -> dict[str, dict]:
    """Match exact annual schedule numbers; never infer identities from fund names."""
    start = next((index for index, text in enumerate(pages)
                  if re.search(r"^\s*ANNEX\b", text, re.I)
                  and re.search(r"following paragraphs.*describe.*authority", text, re.I | re.S)), None)
    if start is None:
        raise ValueError("Missing trust-fund description annex")

    blocks: dict[str, list[tuple[int, str]]] = {}
    current = None
    for index in range(start, len(pages)):
        # A damaged PDF space occurs after Schedule 2.1 in the 2024 annex.
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", pages[index])
        for raw_line in text.splitlines():
            line = raw_line.strip()
            heading = SCHEDULE.fullmatch(line)
            if heading:
                current = heading.group(1)
                if current in blocks:
                    raise ValueError(f"Duplicate annex schedule {current}")
                blocks[current] = []
            elif current and not line.isdigit():
                blocks[current].append((index + 1, line))

    output = {}
    for code, schedule in schedules.items():
        lines = blocks.get(schedule, [])
        beginning = next((i for i, (_, text) in enumerate(lines) if PARAGRAPH.match(text)), None)
        if beginning is None:
            raise ValueError(f"Missing annex description for {code}, schedule {schedule}")
        body = lines[beginning:]
        first = PARAGRAPH.fullmatch(body[0][1])
        body[0] = (body[0][0], first.group(1))
        # Preserve source wording, including hard hyphens at wrapped lines.
        description = join_lines([line for _, line in body if line])
        if len(description) < 40:
            raise ValueError(f"Incomplete annex description for {code}")
        structured_description = description_blocks([line for _, line in body])
        add_citation_links(structured_description, code)
        output[code] = {
            "description": description,
            "description_blocks": structured_description,
            "pdf_pages": sorted({page for page, line in body if line}),
        }
    return output


def extract_descriptions(pdf_path: Path, schedules: dict[str, str]) -> dict[str, dict]:
    with pymupdf.open(pdf_path) as document:
        return descriptions_from_pages([page.get_text() for page in document], schedules)
