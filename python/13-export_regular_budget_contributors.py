"""Export UN regular-budget assessments and paid-in-full status.

The amount source is the annual assessment circular, which publishes a complete
table for every Member State. The honour roll supplies payment status and date;
the historical scale workbook is an independent check on the assessment rates.

Coverage begins in 2019 because that is the first honour roll exposed by the
Committee on Contributions' current previous-honour-roll index.
"""

from __future__ import annotations

import json
import hashlib
import re
import sys
from collections import Counter
from datetime import datetime
from io import BytesIO
from numbers import Real
from pathlib import Path
from urllib.parse import urlencode

import pandas as pd
import pymupdf
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from regular_budget_assessment_controls import printed_assessment_control, validate_assessment_dollars

OUT = Path("public/data")
USER_AGENT = {"User-Agent": "UN Transparency Portal data pipeline"}

SCALE_PAGE_URL = "https://www.un.org/en/ga/contributions/scale.shtml"
SCALE_WORKBOOK_URL = (
    "https://www.un.org/en/ga/contributions/"
    "Scale of Assessments for RB 1946-2027.xlsx"
)
HONOUR_ROLL_CURRENT_URL = (
    "https://www.un.org/en/ga/contributions/honourroll.shtml"
)
HONOUR_ROLL_ARCHIVE_URL = (
    "https://www.un.org/en/ga/contributions/previous_honourrolls.shtml"
)
DOCUMENT_API_URL = "https://documents.un.org/api/symbol/access"

# The Committee on Contributions' regular-budget page identifies one official
# assessment circular per calendar year.
ASSESSMENT_DOCUMENTS = {
    2019: "ST/ADM/SER.B/992",
    2020: "ST/ADM/SER.B/1008",
    2021: "ST/ADM/SER.B/1023",
    2022: "ST/ADM/SER.B/1038",
    2023: "ST/ADM/SER.B/1052",
    2024: "ST/ADM/SER.B/1067",
    2025: "ST/ADM/SER.B/1083",
    2026: "ST/ADM/SER.B/1096",
}

# Source pages use different official/short names in different years. Values
# here are stable display names and join keys for the exported dataset.
COUNTRY_ALIASES = {
    "Bahamas (The)": "Bahamas",
    "Bolivia": "Bolivia (Plurinational State of)",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Czech Republic": "Czechia",
    "Democratic People's Republic of Korea": (
        "Democratic People's Republic of Korea"
    ),
    "Lao People's Democratic Republic": "Lao People's Democratic Republic",
    "Micronesia": "Micronesia (Federated States of)",
    "Netherlands (Kingdom of the)": "Netherlands",
    "The former Yugoslav Republic of Macedonia": "North Macedonia",
    "Turkey": "Türkiye",
    "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
    "Venezuela (Bolivarian republic of)": "Venezuela (Bolivarian Republic of)",
}


def fetch(url: str, **kwargs) -> requests.Response:
    response = requests.get(url, headers=USER_AGENT, timeout=90, **kwargs)
    response.raise_for_status()
    return response


def compact(value: str) -> str:
    return " ".join(value.split())


def canonical_country(value: str) -> str:
    name = compact(value).replace("\u2019", "'").replace("*", "")
    name = re.sub(r"\s+[a-z]/$", "", name)
    name = re.sub(r"\s*\(formerly.*?\)\s*", "", name, flags=re.IGNORECASE)
    return COUNTRY_ALIASES.get(name, name)


def document_url(symbol: str) -> str:
    return f"{DOCUMENT_API_URL}?{urlencode({'l': 'en', 's': symbol, 't': 'pdf'})}"


def group_words_by_line(page: pymupdf.Page) -> list[list[tuple]]:
    """Return PDF words grouped by their visual baseline."""
    groups: list[list] = []
    baselines: list[float] = []
    for word in sorted(page.get_text("words"), key=lambda item: (item[1], item[0])):
        if not groups or abs(baselines[-1] - word[1]) > 0.8:
            groups.append([word])
            baselines.append(word[1])
        else:
            groups[-1].append(word)
    return [sorted(words, key=lambda item: item[0]) for words in groups]


def _parse_assessment_document_with_control(year: int, symbol: str) -> tuple[dict[str, dict], dict]:
    """Read the annual circular's regular-budget contribution table.

    For 2019-2024 the rightmost value is ``Net contributions``. From 2025,
    the circular's rightmost ``Total contributions`` also includes the small
    Peacebuilding Fund portion apportioned using peacekeeping rates. That is the
    amount reproduced by the honour roll as the year's net assessment.
    """
    response = fetch(DOCUMENT_API_URL, params={"l": "en", "s": symbol, "t": "pdf"})
    document = pymupdf.open(stream=response.content, filetype="pdf")
    rows: list[tuple[str, float, int, int]] = []
    in_contribution_table = False

    for page in document:
        page_text = compact(page.get_text())
        if "B. Contributions by Member States" in page_text:
            in_contribution_table = True
        # The shorter 2019 circular has no section B label before its table.
        if year == 2019 and "Gross contributions" in page_text and "Net contributions" in page_text:
            in_contribution_table = True
        if not in_contribution_table:
            continue
        if "Gross contributions" not in page_text or "Net contributions" not in page_text:
            continue

        pending_name: list[str] = []
        ready_for_rows = False
        reached_credit_table = False
        for words in group_words_by_line(page):
            line_text = compact(" ".join(word[4] for word in words))
            if "C. Credits returned to Member States" in line_text:
                reached_credit_table = True
                break
            if "Member State" in line_text:
                ready_for_rows = True
                pending_name = []
                continue
            decimal_words = [
                word for word in words if re.fullmatch(r"\d+\.\d{3,4}", word[4])
            ]
            if ready_for_rows and decimal_words:
                first_numeric_x = min(word[0] for word in decimal_words)
                name_words = [
                    word[4]
                    for word in words
                    if word[0] < first_numeric_x and not re.fullmatch(r"\d+", word[4])
                ]
                name = compact(" ".join([*pending_name, *name_words]))
                pending_name = []
                amount_words = [
                    word[4]
                    for word in words
                    if word[0] >= 500 and re.fullmatch(r"[\d,]+", word[4])
                ]
                if name and amount_words and name not in {"Member State", "Total"}:
                    rows.append(
                        (
                            canonical_country(name),
                            float(decimal_words[-1][4]),
                            int("".join(amount_words).replace(",", "")),
                            page.number + 1,
                        )
                    )
            elif ready_for_rows and words:
                # Long country names wrap once in the narrow first column. Save
                # a name-only line and prepend it to the next numeric row.
                if max(word[2] for word in words) < 300 and all(
                    not re.search(r"\d", word[4]) for word in words
                ):
                    header_fragments = (
                        "Member State",
                        "Scale of",
                        "United States dollars",
                        "ST/ADM",
                        "Original:",
                        "Total",
                    )
                    if not any(fragment in line_text for fragment in header_fragments):
                        pending_name.extend(word[4] for word in words)
        if reached_credit_table:
            break

    names = [name for name, _, _, _ in rows]
    duplicates = sorted(name for name, count in Counter(names).items() if count > 1)
    if duplicates:
        raise ValueError(f"{year} assessment document has duplicate states: {duplicates}")
    if len(rows) != 193:
        raise ValueError(f"{year} assessment document: expected 193 states, found {len(rows)}")
    if abs(sum(rate for _, rate, _, _ in rows) - 100) > 0.0001:
        raise ValueError(f"{year} assessment rates do not total 100%")

    assessments = {
        name: {"assessment_rate": rate, "assessment_amount": amount, "pdfPage": page}
        for name, rate, amount, page in rows
    }
    control = printed_assessment_control(document, year)
    control['source_sha256'] = hashlib.sha256(response.content).hexdigest()
    validate_assessment_dollars(assessments, control, year)
    return assessments, control


def parse_assessment_document(year: int, symbol: str) -> dict[str, dict]:
    assessments, _ = _parse_assessment_document_with_control(year, symbol)
    return assessments


def parse_scale_workbook() -> dict[int, dict[str, float]]:
    response = fetch(SCALE_WORKBOOK_URL)
    frame = pd.read_excel(BytesIO(response.content), header=None)
    year_columns: dict[int, int] = {}
    for column in range(1, frame.shape[1]):
        for value in frame.iloc[:3, column]:
            if pd.notna(value) and isinstance(value, Real):
                year_columns[int(value)] = column

    result: dict[int, dict[str, float]] = {}
    for year in ASSESSMENT_DOCUMENTS:
        column = year_columns[year]
        rates: dict[str, float] = {}
        for _, row in frame.iloc[4:].iterrows():
            name, rate = row.iloc[0], row.iloc[column]
            if pd.isna(name) or pd.isna(rate) or str(name).strip() == "Total":
                continue
            if not isinstance(rate, Real):
                continue
            rates[canonical_country(str(name))] = float(rate)
        if len(rates) != 193 or abs(sum(rates.values()) - 100) > 0.0001:
            raise ValueError(
                f"{year} scale workbook: expected 193 states totalling 100%, "
                f"found {len(rates)} totalling {sum(rates.values())}"
            )
        result[year] = rates
    return result


def parse_long_date(value: str) -> str:
    return datetime.strptime(compact(value), "%d %B %Y").date().isoformat()


def parse_payment_date(value: str) -> str:
    value = compact(value).replace(".", "-").replace(" ", "-")
    for date_format in ("%d-%b-%y", "%d-%B-%y", "%d-%b-%Y", "%d-%B-%Y"):
        try:
            return datetime.strptime(value, date_format).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Unrecognized honour-roll payment date: {value}")


def parse_honour_roll(year: int) -> tuple[dict, dict[str, dict]]:
    url = (
        HONOUR_ROLL_CURRENT_URL
        if year == max(ASSESSMENT_DOCUMENTS)
        else f"https://www.un.org/en/ga/contributions/honourroll_{year}.shtml"
    )
    return parse_honour_roll_html(fetch(url).content, year, url)


def parse_honour_roll_html(content: bytes, year: int, url: str) -> tuple[dict, dict[str, dict]]:
    """Parse every source row; an unfamiliar nonblank row must never disappear.

    The official HTML has a known unwrapped column header directly inside the
    table. Accept that header, but require all payment cells to belong to rows.
    Counts and row numbering are independently checked in both sections.
    """
    soup = BeautifulSoup(content, "html.parser")
    # The same page also has a separate monthly-statistics table.
    tables = [table for table in soup.find_all("table")
              if re.search(r"As of .*?Member States", compact(table.get_text(" ", strip=True)))]
    if len(tables) != 1:
        raise ValueError(f"{year} honour roll: expected one payment table, found {len(tables)}")
    table = tables[0]
    header = ["", "member state", "net assessment (in us$)", "date of payment"]

    def cell_text(cell) -> str:
        return compact(cell.get_text(" ", strip=True))

    orphan_cells = [cell for cell in table.find_all(["td", "th"])
                    if cell.find_parent("tr") is None]
    if orphan_cells and [cell_text(cell).lower() for cell in orphan_cells] != header:
        raise ValueError(f"{year} honour roll has unexpected cells outside rows")
    has_header = bool(orphan_cells)
    table_rows = table.find_all("tr")
    if len(table_rows) < 2:
        raise ValueError(f"{year} honour roll is missing its summary and sections")
    summary = cell_text(table_rows[0])
    summary_match = re.fullmatch(
        r"As of (.+?), (\d+) Member States have paid their regular budget assessments in full\.",
        summary,
    )
    if not summary_match:
        raise ValueError(f"Could not parse {year} honour-roll summary: {summary}")
    as_of = parse_long_date(summary_match[1])
    reported_count = int(summary_match[2])
    if not 0 <= reported_count <= 193 or not as_of.startswith(f"{year}-"):
        raise ValueError(f"{year} honour roll has an invalid count or snapshot year")

    payments: dict[str, dict] = {}
    section_counts: dict[str, int] = {}
    observed = Counter()
    status = None
    due_date = None
    for row in table_rows[1:]:
        cells = [cell_text(cell) for cell in row.find_all(["td", "th"], recursive=False)]
        row_text = cell_text(row)
        if not row_text:
            continue
        if row_text.startswith("I."):
            match = re.fullmatch(
                r"I\. The following (\d+) Member States have paid their regular budget assessments "
                r"in full within the 30 day due period specified in Financial Regulation 3\.5 "
                r"\(by (\d{1,2} \w+ \d{4})\)\.", row_text,
            )
            if not match or status is not None:
                raise ValueError(f"{year} honour roll has an unexpected section I heading")
            status = "paid_on_time"
            due_date = parse_long_date(match[2])
            if not due_date.startswith(f"{year}-"):
                raise ValueError(f"{year} honour roll has a different due-date year")
            section_counts[status] = int(match[1])
            continue
        if row_text.startswith("II."):
            match = re.fullmatch(
                r"II\. Subsequent to the end of the 30 day due period \((\d{1,2} \w+ \d{4})\), "
                r"(\d+) additional Member States have paid their (\d{4}) regular budget "
                r"assessments? in full\.", row_text,
            )
            if (not match or status != "paid_on_time" or
                    parse_long_date(match[1]) != due_date or int(match[3]) != year):
                raise ValueError(f"{year} honour roll has an unexpected section II heading")
            status = "paid_late"
            section_counts[status] = int(match[2])
            continue
        if [cell.lower() for cell in cells] == header:
            has_header = True
            continue
        if (status is None or len(cells) != 4 or not cells[0].isascii() or
                not cells[0].isdigit() or int(cells[0]) != observed[status] + 1):
            raise ValueError(f"{year} honour roll has an unexpected payment row: {row_text}")
        name = canonical_country(cells[1])
        if not name or name in payments:
            raise ValueError(f"{year} honour roll has an empty or duplicate state: {name}")
        if not re.fullmatch(r"(?:[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)", cells[2]):
            raise ValueError(f"{year} honour roll has an invalid amount for {name}: {cells[2]}")
        payment_date = parse_payment_date(cells[3])
        if (not payment_date.startswith(f"{year}-") or payment_date > as_of or
                (status == "paid_on_time" and payment_date > due_date) or
                (status == "paid_late" and payment_date <= due_date)):
            raise ValueError(f"{year} honour roll has an invalid payment date/section for {name}")
        payments[name] = {
            "payment_status": status,
            "payment_date": payment_date,
            "honour_roll_amount": int(cells[2].replace(",", "")),
        }
        observed[status] += 1

    if "paid_on_time" not in section_counts:
        raise ValueError(f"{year} honour roll is missing section I")
    if not has_header:
        raise ValueError(f"{year} honour roll is missing its payment column header")
    for section, count in section_counts.items():
        if observed[section] != count:
            raise ValueError(f"{year} honour roll {section}: reports {count}, lists {observed[section]}")
    if len(payments) != reported_count or sum(section_counts.values()) != reported_count:
        raise ValueError(f"{year} honour roll reports {reported_count} paid states but lists {len(payments)}")
    return {
        "url": url, "as_of": as_of, "due_date": due_date,
        "reported_paid_in_full": reported_count,
    }, payments


def validate_scale_rates(
    year: int, assessments: dict[str, dict], scale_rates: dict[str, float]
) -> None:
    if assessments.keys() != scale_rates.keys():
        missing_from_scale = sorted(assessments.keys() - scale_rates.keys())
        missing_from_document = sorted(scale_rates.keys() - assessments.keys())
        raise ValueError(
            f"{year} scale/document country mismatch; scale missing "
            f"{missing_from_scale}, document missing {missing_from_document}"
        )
    differences = [
        name
        for name, data in assessments.items()
        if abs(data["assessment_rate"] - scale_rates[name]) > 0.0001
    ]
    if differences:
        raise ValueError(f"{year} assessment rates disagree with scale: {differences}")


def export_year(year: int, symbol: str, scale_rates: dict[str, float]) -> None:
    assessments, assessment_control = _parse_assessment_document_with_control(year, symbol)
    validate_scale_rates(year, assessments, scale_rates)
    honour_meta, payments = parse_honour_roll(year)
    unknown_payments = sorted(payments.keys() - assessments.keys())
    if unknown_payments:
        raise ValueError(f"{year} honour-roll states missing from assessment: {unknown_payments}")

    discrepancies = []
    contributors = []
    for name, assessment in assessments.items():
        payment = payments.get(name)
        if payment and payment["honour_roll_amount"] != assessment["assessment_amount"]:
            discrepancies.append(
                {
                    "name": name,
                    "honour_roll_amount": payment["honour_roll_amount"],
                    "assessment_document_amount": assessment["assessment_amount"],
                }
            )
        contributors.append(
            {
                "name": name,
                "assessment_rate": assessment["assessment_rate"],
                "assessment_amount": assessment["assessment_amount"],
                "pdfPage": assessment["pdfPage"],
                "payment_status": (
                    payment["payment_status"] if payment else "not_paid_in_full"
                ),
                "payment_date": payment["payment_date"] if payment else None,
            }
        )

    contributors.sort(key=lambda item: (-item["assessment_amount"], item["name"]))
    status_counts = Counter(item["payment_status"] for item in contributors)
    amount_label = "Total contributions" if year >= 2025 else "Net contributions"
    payload = {
        "meta": {
            "year": year,
            "as_of": honour_meta["as_of"],
            "due_date": honour_meta["due_date"],
            "member_state_count": len(contributors),
            "assessment_total": sum(
                item["assessment_amount"] for item in contributors
            ),
            "assessment_source_control": assessment_control,
            "assessment_amount_column": amount_label,
            "paid_in_full_count": len(payments),
            "paid_on_time_count": status_counts["paid_on_time"],
            "paid_late_count": status_counts["paid_late"],
            "not_paid_in_full_count": status_counts["not_paid_in_full"],
            "amount_reconciliation": {
                "checked_paid_states": len(payments),
                "exact_matches": len(payments) - len(discrepancies),
                "discrepancies": discrepancies,
            },
            "sources": {
                "assessment_document": {
                    "symbol": symbol,
                    "url": document_url(symbol),
                },
                "honour_roll": {
                    "url": honour_meta["url"],
                    "archive_url": HONOUR_ROLL_ARCHIVE_URL,
                },
                "scale": {
                    "url": SCALE_PAGE_URL,
                    "workbook_url": SCALE_WORKBOOK_URL,
                },
            },
        },
        "contributors": contributors,
    }
    path = OUT / f"regular-budget-contributors-{year}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(
        f"{path}: {len(contributors)} states, "
        f"{status_counts['paid_on_time']} on time, "
        f"{status_counts['paid_late']} late, "
        f"{status_counts['not_paid_in_full']} not listed as paid in full"
    )
    if discrepancies:
        print(f"  source amount discrepancies: {discrepancies}")


def main() -> None:
    print("Fetching and validating the historical scale workbook...")
    scale_rates = parse_scale_workbook()
    for year, symbol in ASSESSMENT_DOCUMENTS.items():
        print(f"Processing {year} ({symbol})...")
        export_year(year, symbol, scale_rates[year])


if __name__ == "__main__":
    main()
