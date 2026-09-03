"""Export Member State assessments for UN peacekeeping operations.

The Committee on Contributions publishes one assessment circular per mission
and peacekeeping cycle.  Each circular contains one or more 193-state tables:
ordinary assessments, credits from prior-period balances, and occasionally
additional assessments.  This exporter discovers the official circulars from
the Committee page, reads the tables from the source PDFs, applies credits as
negative ledger components, and aggregates the printed rows by Member State
and mission.

Outputs are keyed by the first year of the July-June cycle, matching the
portal's ``budget-pko-{year}.json`` convention:

    public/data/peacekeeping-contributors-2022.json  # 2022/23
    public/data/peacekeeping-contributors-2023.json  # 2023/24
    public/data/peacekeeping-contributors-2024.json  # 2024/25
    public/data/peacekeeping-contributors-2025.json  # 2025/26

The exported amount is the sum of the circulars' rightmost ``Net assessment``
column after subtracting ``Net credit`` sections.  For the United States, that
printed amount retains the share of staff-assessment credits reserved for tax
refunds, exactly as the circular's Member State row does.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode

import pymupdf
import requests
from bs4 import BeautifulSoup, NavigableString

OUT = Path("public/data")
USER_AGENT = {"User-Agent": "UN Transparency Portal data pipeline"}

ASSESSMENTS_PAGE_URL = "https://www.un.org/en/ga/contributions/peacekeeping.shtml"
PRIOR_ASSESSMENTS_PAGE_URL = "https://www.un.org/en/ga/contributions/prior.shtml"
DOCUMENT_API_URL = "https://documents.un.org/api/symbol/access"

CYCLES = {
    2022: "1 July 2022 to 30 June 2023",
    2023: "1 July 2023 to 30 June 2024",
    2024: "1 July 2024 to 30 June 2025",
    2025: "1 July 2025 to 30 June 2026",
}

HISTORICAL_MISSIONS = {
    "MINURSO",
    "MINUSCA",
    "MINUSMA",
    "MONUSCO",
    "UNDOF",
    "UNFICYP",
    "UNIFIL",
    "UNISFA",
    "UNMIK",
    "UNMISS",
    "UNSOS",
}

EXPECTED_MISSIONS = {
    2022: HISTORICAL_MISSIONS,
    2023: HISTORICAL_MISSIONS,
    2024: HISTORICAL_MISSIONS,
    2025: {
        "MINURSO",
        "MINUSCA",
        "MONUSCO",
        "UNDOF",
        "UNFICYP",
        "UNIFIL",
        "UNISFA",
        "UNMIK",
        "UNMISS",
        "UNSOH",
        "UNSOS",
    },
}

MISSION_NAME_OVERRIDES = {
    # The prior-year HTML label accidentally omits "Stabilization" even though
    # the linked statement PDFs print the mission's full official name.
    "MINUSCA": (
        "United Nations Multidimensional Integrated Stabilization Mission "
        "in the Central African Republic"
    ),
}

COUNTRY_ALIASES = {
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Côte d’Ivoire": "Côte d'Ivoire",
    "Bolivia": "Bolivia (Plurinational State of)",
    "Micronesia (Federated States of)": "Micronesia (Federated States of)",
    "Micronesia": "Micronesia (Federated States of)",
    "Netherlands (Kingdom of the)": "Netherlands",
    "Netherlands (Kingdom of the)b": "Netherlands",
    "Netherlands (Kingdom of the)c": "Netherlands",
    "Turkey": "Türkiye",
    "Syria": "Syrian Arab Republic",
    "Türkiye": "Türkiye",
    "Türkiyeb": "Türkiye",
}

WRAPPED_COUNTRY_PREFIXES = {
    "Democratic People's Republic of",
    "Türkiyeb",
    "United Kingdom of Great Britain",
    "United Kingdom of Great Britain and",
}


@dataclass(frozen=True)
class StatementDocument:
    period: str
    symbol: str
    url: str


@dataclass(frozen=True)
class Circular:
    cycle_year: int
    period: str
    mission_code: str
    mission_name: str
    symbol: str
    statement_documents: tuple[StatementDocument, ...] = ()

    @property
    def url(self) -> str:
        if self.statement_documents:
            return PRIOR_ASSESSMENTS_PAGE_URL
        query = urlencode({"l": "en", "s": self.symbol, "t": "pdf"})
        return f"{DOCUMENT_API_URL}?{query}"


def fetch(url: str, **kwargs) -> requests.Response:
    response = requests.get(url, headers=USER_AGENT, timeout=90, **kwargs)
    response.raise_for_status()
    return response


def compact(value: str) -> str:
    return " ".join(value.split())


def canonical_country(value: str) -> str:
    name = compact(value).replace("\u2019", "'").replace("*", "")
    name = re.sub(r"\s+[a-z]/$", "", name)
    if name.startswith("Netherlands (Kingdom of"):
        return "Netherlands"
    return COUNTRY_ALIASES.get(name, name)


def mission_code(heading: str) -> str:
    match = re.search(r"\(([A-Z]+)\)\s*$", heading)
    if not match:
        raise ValueError(f"Mission heading has no terminal acronym: {heading!r}")
    return match.group(1)


def discover_prior_circulars() -> list[Circular]:
    """Discover the prior cycle's statement PDFs from its list-based index."""
    soup = BeautifulSoup(fetch(PRIOR_ASSESSMENTS_PAGE_URL).text, "html.parser")
    heading = next(
        (
            item
            for item in soup.find_all("h5")
            if compact(item.get_text(" ", strip=True)) == "Peacekeeping Operations"
        ),
        None,
    )
    mission_list = heading.find_next_sibling("ul") if heading else None
    if mission_list is None:
        raise ValueError("Prior assessment index has no peacekeeping mission list")

    circulars: list[Circular] = []
    for item in mission_list.find_all("li"):
        # The source HTML has several unclosed outer <li> elements. Reading
        # only direct text nodes identifies each mission reliably without
        # accidentally attaching later missions' statement links.
        label = compact(
            " ".join(
                str(child) for child in item.contents if isinstance(child, NavigableString)
            )
        )
        match = re.search(
            r"Assessment of Member States' contributions for the\s+financing of\s+"
            r"(?:the\s+)?(.+?)\s+\(([A-Z]+)\)\s*$",
            label,
        )
        if not match:
            continue
        name, code = match.groups()
        statement_list = item.find("ul", recursive=False)
        if statement_list is None:
            raise ValueError(f"{code} has no statement-document list")

        documents: list[StatementDocument] = []
        for link in statement_list.find_all("a"):
            parent_text = compact(link.parent.get_text(" ", strip=True))
            symbol_match = re.search(r"ST/ADM/SER\.B/\d+", parent_text, re.IGNORECASE)
            if not symbol_match:
                raise ValueError(f"{code} statement link has no circular symbol")
            documents.append(
                StatementDocument(
                    period=compact(link.get_text(" ", strip=True)),
                    symbol=symbol_match.group(0).upper(),
                    url=requests.utils.requote_uri(
                        requests.compat.urljoin(PRIOR_ASSESSMENTS_PAGE_URL, link["href"])
                    ),
                )
            )

        symbols = {document.symbol for document in documents}
        if len(symbols) != 1:
            raise ValueError(f"{code} statement links disagree on symbol: {sorted(symbols)}")
        circulars.append(
            Circular(
                cycle_year=2025,
                period=CYCLES[2025],
                mission_code=code,
                mission_name=MISSION_NAME_OVERRIDES.get(code, name),
                symbol=symbols.pop(),
                statement_documents=tuple(documents),
            )
        )
    return circulars


def discover_circulars() -> dict[int, list[Circular]]:
    """Discover the target cycles from the official assessment index."""
    soup = BeautifulSoup(fetch(ASSESSMENTS_PAGE_URL).text, "html.parser")
    by_period = {period: year for year, period in CYCLES.items() if year < 2025}
    result: dict[int, list[Circular]] = {year: [] for year in CYCLES}

    for heading in soup.find_all("h5"):
        name = compact(heading.get_text(" ", strip=True))
        table = heading.find_next_sibling("table")
        if table is None:
            continue
        try:
            code = mission_code(name)
        except ValueError:
            continue

        for row in table.find_all("tr"):
            cells = [compact(cell.get_text(" ", strip=True)) for cell in row.find_all("td")]
            if len(cells) != 2 or cells[0] not in by_period:
                continue
            symbol_match = re.search(r"ST/ADM/SER\.B/\d+", cells[1], re.IGNORECASE)
            if not symbol_match:
                raise ValueError(f"{name} {cells[0]} has no assessment symbol")
            year = by_period[cells[0]]
            result[year].append(
                Circular(
                    cycle_year=year,
                    period=cells[0],
                    mission_code=code,
                    mission_name=re.sub(r"\s*\([A-Z]+\)\s*$", "", name),
                    symbol=symbol_match.group(0).upper(),
                )
            )

    result[2025] = discover_prior_circulars()

    for year, circulars in result.items():
        codes = [circular.mission_code for circular in circulars]
        symbols = [circular.symbol for circular in circulars]
        expected = EXPECTED_MISSIONS[year]
        if set(codes) != expected:
            missing = sorted(expected - set(codes))
            extra = sorted(set(codes) - expected)
            raise ValueError(f"{year} mission index mismatch; missing={missing}, extra={extra}")
        if len(codes) != len(set(codes)):
            raise ValueError(f"{year} mission index contains duplicate mission codes")
        if len(symbols) != len(set(symbols)):
            raise ValueError(f"{year} mission index contains duplicate document symbols")

    return result


def group_words_by_line(page: pymupdf.Page) -> list[list[tuple]]:
    """Return PDF words grouped by their visual baseline."""
    groups: list[list[tuple]] = []
    baselines: list[float] = []
    for word in sorted(page.get_text("words"), key=lambda item: (item[1], item[0])):
        if not groups or abs(baselines[-1] - word[1]) > 0.8:
            groups.append([word])
            baselines.append(word[1])
        else:
            groups[-1].append(word)
    return [sorted(words, key=lambda item: item[0]) for words in groups]


def parse_integer_words(words: list[tuple]) -> int | None:
    """Parse one visually separated integer, including accounting parentheses."""
    text = "".join(word[4] for word in sorted(words, key=lambda item: item[0]))
    text = text.replace(",", "").replace(" ", "")
    if not text or text in {"-", "–", "—"}:
        return None
    negative = text.startswith("(") and text.endswith(")")
    digits = re.sub(r"[^0-9]", "", text)
    if not digits:
        return None
    value = int(digits)
    return -value if negative else value


def parse_summary_totals(document: pymupdf.Document) -> dict[str, int] | None:
    """Read the final gross/net assessment totals from the section-I summary."""
    for page in document[:3]:
        if "Summary of assessments" not in page.get_text():
            continue
        for words in group_words_by_line(page):
            if not words or words[0][4] != "Total" or words[0][0] >= 100:
                continue
            # Layouts differ (UNFICYP adds voluntary Cyprus/Greece columns).
            # Numeric tokens within one amount are at most 16 points apart;
            # adjacent amount columns are at least 19 points apart. The final
            # two visual groups are always gross and net assessment.
            numbers = sorted(
                [word for word in words[1:] if re.fullmatch(r"[\d,]+", word[4])],
                key=lambda word: word[0],
            )
            groups: list[list[tuple]] = []
            for word in numbers:
                if not groups or word[0] - groups[-1][-1][0] > 18:
                    groups.append([word])
                else:
                    groups[-1].append(word)
            if len(groups) < 2:
                continue
            gross = parse_integer_words(groups[-2])
            net = parse_integer_words(groups[-1])
            if gross is not None and net is not None:
                return {"gross": gross, "net_before_us_tax_credit": net}
    return None


def parse_member_row(words: list[tuple]) -> dict | None:
    """Parse one Member State row using the stable visual column bands."""
    rate_words = [word for word in words if 220 <= word[0] < 300]
    share_words = [word for word in words if 300 <= word[0] < 365]
    if len(rate_words) != 1 or len(share_words) != 1:
        return None
    if not re.fullmatch(r"\d+\.\d{2,3}", rate_words[0][4]):
        return None
    if not re.fullmatch(r"\d+\.\d{3,4}", share_words[0][4]):
        return None

    name = canonical_country(" ".join(word[4] for word in words if word[0] < 220))
    if not name or name in {"Subtotal", "Total"}:
        return None
    gross = parse_integer_words([word for word in words if 365 <= word[0] < 440])
    net = parse_integer_words([word for word in words if word[0] >= 500])
    if gross is None or net is None:
        return None

    return {
        "name": name,
        "regular_budget_rate": float(rate_words[0][4]),
        "peacekeeping_rate": float(share_words[0][4]),
        "gross": gross,
        "net": net,
        "basis": "printed_member_state_row",
    }


def parse_section_total(words: list[tuple]) -> dict | None:
    """Parse the final total row of one Member State table."""
    label = compact(" ".join(word[4] for word in words if word[0] < 220))
    if label != "Total":
        return None
    gross = parse_integer_words([word for word in words if 365 <= word[0] < 440])
    net = parse_integer_words([word for word in words if word[0] >= 500])
    if gross is None or net is None:
        return None
    regular_rate = "".join(word[4] for word in words if 220 <= word[0] < 300)
    peacekeeping_rate = "".join(word[4] for word in words if 300 <= word[0] < 365)
    return {
        "regular_budget_rate": (
            float(regular_rate) if re.fullmatch(r"\d+\.\d+", regular_rate) else None
        ),
        "peacekeeping_rate": (
            float(peacekeeping_rate)
            if re.fullmatch(r"\d+\.\d+", peacekeeping_rate)
            else None
        ),
        "gross": gross,
        "net": net,
    }


def parse_statement_amount(value: str) -> int | None:
    """Parse a monetary token in the compact Umoja statement layout."""
    token = value.strip()
    if token in {"-", "–", "—"}:
        return 0
    if not re.fullmatch(r"\(?[\d,]+\)?", token):
        return None
    negative = token.startswith("(") and token.endswith(")")
    amount = int(re.sub(r"[^0-9]", "", token))
    return -amount if negative else amount


def parse_statement_member_row(words: list[tuple]) -> dict | None:
    """Parse one row from the 2025/26 Umoja assessment statements.

    The 20 source PDFs use several horizontal layouts, so their semantic token
    order is more stable than fixed x-coordinate bands: country, level, three
    percentage fields, then gross/staff/net amounts. The United States row
    replaces its staff amount with an ``a/`` footnote marker, hence gross and
    net are selected as the first and last monetary tokens.
    """
    tokens = [word[4] for word in words]
    level_index = next(
        (
            index
            for index, token in enumerate(tokens)
            if re.fullmatch(r"[A-J](?:\d)?", token)
        ),
        None,
    )
    if level_index is None or level_index == 0:
        return None

    rate_indexes = [
        index
        for index, token in enumerate(tokens[level_index + 1 :], level_index + 1)
        if re.fullmatch(r"\d+\.\d+", token)
    ]
    if len(rate_indexes) != 3 or rate_indexes != list(
        range(rate_indexes[0], rate_indexes[0] + 3)
    ):
        return None

    amounts = [
        parsed
        for token in tokens[rate_indexes[-1] + 1 :]
        if (parsed := parse_statement_amount(token)) is not None
    ]
    if len(amounts) < 2:
        return None
    return {
        "name": canonical_country(" ".join(tokens[:level_index])),
        "regular_budget_rate": float(tokens[rate_indexes[0]]),
        "peacekeeping_rate": float(tokens[rate_indexes[2]]),
        "gross": amounts[0],
        "net": amounts[-1],
        "basis": "printed_member_state_row",
    }


def parse_statement_total(words: list[tuple]) -> dict | None:
    """Parse a statement's final unlabelled gross/staff/net total row."""
    tokens = [word[4] for word in words]
    if any(re.fullmatch(r"[A-J](?:\d)?", token) for token in tokens):
        return None
    if any(re.fullmatch(r"\d+\.\d+", token) for token in tokens):
        return None
    amounts = [
        parsed
        for token in tokens
        if (parsed := parse_statement_amount(token)) is not None
    ]
    if len(amounts) != 3:
        return None
    return {"gross": amounts[0], "net": amounts[-1]}


def parse_statement_document(
    circular: Circular, source: StatementDocument, heading_offset: int
) -> list[dict]:
    """Parse every assessment/credit statement in one linked 2025/26 PDF."""
    response = fetch(source.url)
    document = pymupdf.open(stream=response.content, filetype="pdf")
    first_page = compact(document[0].get_text())
    # Several source sheets leave the Mission field blank, omit the acronym,
    # or use a slightly different expansion of it. The document ID is printed
    # consistently and is also repeated beside every link on the source index.
    if circular.symbol not in first_page:
        raise ValueError(
            f"{source.url} title does not match {circular.mission_code} {circular.symbol}"
        )

    sections: list[dict] = []
    current: dict | None = None
    for page_number, page in enumerate(document, 1):
        page_text = compact(page.get_text())
        if "Mission:" in page_text:
            mandate_text = page_text.split("Mandate:", 1)[-1].split("Rates:", 1)[0]
            dates = re.findall(r"\d{1,2}-[A-Za-z]{3}-\d{4}", mandate_text)
            if not dates:
                raise ValueError(f"{source.url} page {page_number} has no mandate date")
            # Credit sheets describe only the historical balance cutoff rather
            # than a from/to assessment range. Keep that semantic fallback in
            # addition to the heading because not every rendered sheet exposes
            # the heading consistently to text extraction.
            kind = (
                "credit"
                if "CREDIT FROM" in page_text or len(dates) == 1
                else "assessment"
            )
            statement_period = " to ".join(dates)
            current = {
                "heading": chr(ord("A") + heading_offset + len(sections)),
                "label": (
                    f"Credit at {statement_period}"
                    if kind == "credit"
                    else f"Assessment for {statement_period}"
                ),
                "kind": kind,
                "rows": [],
                "pages": [],
                "source_total": None,
                "source_period": source.period,
                "statement_period": statement_period,
                "source_url": source.url,
            }
            sections.append(current)

        if current is None:
            raise ValueError(f"{source.url} page {page_number} precedes its statement header")
        current["pages"].append(page_number)
        for words in group_words_by_line(page):
            row = parse_statement_member_row(words)
            if row:
                current["rows"].append(row)
                continue
            source_total = parse_statement_total(words)
            if source_total:
                current["source_total"] = source_total

    for section in sections:
        section["source_file_page_count"] = len(document)
    return sections


def parse_statement_circular(circular: Circular) -> dict:
    """Parse and aggregate the prior page's 2025/26 statement PDFs."""
    sections: list[dict] = []
    for source in circular.statement_documents:
        sections.extend(parse_statement_document(circular, source, len(sections)))

    reference_names: set[str] | None = None
    signed_by_country: dict[str, dict[str, int]] = defaultdict(
        lambda: {"gross": 0, "net": 0}
    )
    section_output: list[dict] = []
    assessment_periods: set[str] = set()
    for section in sections:
        rows = section.pop("rows")
        names = [row["name"] for row in rows]
        duplicates = sorted(name for name, count in Counter(names).items() if count > 1)
        if duplicates:
            raise ValueError(
                f"{circular.symbol} {section['source_period']} duplicates {duplicates}"
            )
        name_set = set(names)
        if section["kind"] == "assessment":
            if len(rows) != 193:
                raise ValueError(
                    f"{circular.symbol} {section['statement_period']}: expected 193 "
                    f"states, found {len(rows)}"
                )
            if section["statement_period"] in assessment_periods:
                raise ValueError(
                    f"{circular.symbol} duplicates assessment period "
                    f"{section['statement_period']}"
                )
            assessment_periods.add(section["statement_period"])
            if reference_names is None:
                reference_names = name_set
            elif name_set != reference_names:
                raise ValueError(
                    f"{circular.symbol} assessment country set differs for "
                    f"{section['statement_period']}"
                )
        elif reference_names is not None and not name_set.issubset(reference_names):
            raise ValueError(
                f"{circular.symbol} credit contains unknown states: "
                f"{sorted(name_set - reference_names)}"
            )

        regular_rate_total = sum(row["regular_budget_rate"] for row in rows)
        peacekeeping_rate_total = sum(row["peacekeeping_rate"] for row in rows)
        if len(rows) == 193:
            if abs(regular_rate_total - 100) > 0.001:
                raise ValueError(
                    f"{circular.symbol} {section['statement_period']} regular rates "
                    f"total {regular_rate_total}"
                )
            if abs(peacekeeping_rate_total - 100) > 0.001:
                raise ValueError(
                    f"{circular.symbol} {section['statement_period']} peacekeeping "
                    f"rates total {peacekeeping_rate_total}"
                )

        source_total = section["source_total"]
        if source_total is None:
            raise ValueError(
                f"{circular.symbol} {section['statement_period']} has no total row"
            )
        row_gross = sum(row["gross"] for row in rows)
        row_net = sum(row["net"] for row in rows)
        if row_gross != source_total["gross"] or row_net != source_total["net"]:
            raise ValueError(
                f"{circular.symbol} {section['statement_period']} row sum does not "
                f"match source total: rows=({row_gross}, {row_net}), "
                f"source={source_total}"
            )

        sign = -1 if section["kind"] == "credit" else 1
        for row in rows:
            signed_by_country[row["name"]]["gross"] += sign * row["gross"]
            signed_by_country[row["name"]]["net"] += sign * row["net"]
        section_output.append(
            {
                **section,
                "sign": sign,
                "contributor_count": len(rows),
                "omitted_zero_credit_rows": (
                    193 - len(rows) if section["kind"] == "credit" else 0
                ),
                "rates_complete": True,
                "regular_budget_rate_total": round(regular_rate_total, 4),
                "peacekeeping_rate_total": round(peacekeeping_rate_total, 4),
                "rate_total_matches_printed": True,
                "rate_anomalies": [],
                "derived_member_state_rows": [],
                "gross": sign * row_gross,
                "net": sign * row_net,
            }
        )

    if reference_names is None:
        raise ValueError(f"{circular.symbol} contains no assessment statements")
    missing_contributors = reference_names - set(signed_by_country)
    if missing_contributors:
        raise ValueError(
            f"{circular.symbol} has no ledger entries for {sorted(missing_contributors)}"
        )
    contributors = {
        name: {"gross": values["gross"], "net": values["net"]}
        for name, values in signed_by_country.items()
    }
    gross = sum(value["gross"] for value in contributors.values())
    net = sum(value["net"] for value in contributors.values())
    return {
        "mission_code": circular.mission_code,
        "mission_name": circular.mission_name,
        "symbol": circular.symbol,
        "url": circular.url,
        "page_count": sum(
            section["source_file_page_count"]
            for section in section_output
            if section["pages"][0] == 1
        ),
        "summary": {"gross": gross, "net_before_us_tax_credit": net},
        "sections": section_output,
        "statement_documents": [
            {"period": source.period, "symbol": source.symbol, "url": source.url}
            for source in circular.statement_documents
        ],
        "contributors": contributors,
    }


def parse_circular(circular: Circular) -> dict:
    """Parse and validate every signed Member State table in one circular."""
    if circular.statement_documents:
        return parse_statement_circular(circular)
    response = fetch(DOCUMENT_API_URL, params={"l": "en", "s": circular.symbol, "t": "pdf"})
    document = pymupdf.open(stream=response.content, filetype="pdf")
    first_page = compact(document[0].get_text())
    if circular.mission_code not in first_page or circular.period not in first_page:
        raise ValueError(f"{circular.symbol} title does not match {circular.mission_code} {circular.period}")

    sections: list[dict] = []
    current: dict | None = None
    for page_number, page in enumerate(document, 1):
        page_text = compact(page.get_text())
        section_match = re.search(
            r"\b([A-Z])\.\s+((?:Assessment|Credit).+?)\s+Regular budget scale",
            page_text,
        )
        if section_match:
            heading, label = section_match.groups()
            current = {
                "heading": heading,
                "label": label,
                "kind": "credit" if label.startswith("Credit") else "assessment",
                "rows": [],
                "pages": [],
                "source_total": None,
            }
            sections.append(current)

        if current is None or "Regular budget scale" not in page_text:
            continue
        if "Net assessment" not in page_text and "Net credit" not in page_text:
            continue
        current["pages"].append(page_number)
        pending_name: list[str] = []
        for words in group_words_by_line(page):
            source_total = parse_section_total(words)
            if source_total:
                current["source_total"] = source_total
                continue
            row = parse_member_row(words)
            if row is None and pending_name and current["kind"] == "credit":
                # In some sparse credit tables the wrapped United Kingdom row
                # prints its rates on neither visual line, but still prints
                # the three monetary columns on the continuation line.
                gross = parse_integer_words(
                    [word for word in words if 365 <= word[0] < 440]
                )
                net = parse_integer_words([word for word in words if word[0] >= 500])
                if gross is not None and net is not None:
                    continuation_name = [word[4] for word in words if word[0] < 220]
                    row = {
                        "name": canonical_country(
                            " ".join([*pending_name, *continuation_name])
                        ),
                        "regular_budget_rate": None,
                        "peacekeeping_rate": None,
                        "gross": gross,
                        "net": net,
                        "basis": "printed_member_state_row",
                    }
                    pending_name = []
            if row:
                if pending_name:
                    row["name"] = canonical_country(
                        " ".join([*pending_name, row["name"]])
                    )
                    pending_name = []
                current["rows"].append(row)
                continue

            # The United Kingdom wraps after "and" in this narrow column in
            # some templates. Preserve a name-only line and prepend it to the
            # following numeric row. Table headers and footnotes are excluded.
            name_words = [word[4] for word in words if word[0] < 220]
            name_text = compact(" ".join(name_words))
            normalized_prefix = name_text.replace("\u2019", "'")
            if normalized_prefix in WRAPPED_COUNTRY_PREFIXES:
                pending_name = name_words

    if not sections:
        raise ValueError(f"{circular.symbol} contains no Member State tables")

    reference_names: set[str] | None = None
    signed_by_country: dict[str, dict[str, int]] = defaultdict(lambda: {"gross": 0, "net": 0})
    section_output: list[dict] = []
    for section in sections:
        rows = section.pop("rows")
        names = [row["name"] for row in rows]
        duplicates = sorted(name for name, count in Counter(names).items() if count > 1)
        if duplicates:
            raise ValueError(f"{circular.symbol} section {section['heading']} duplicates {duplicates}")
        name_set = set(names)
        if reference_names is None and len(rows) != 193:
            raise ValueError(
                f"{circular.symbol} first section: expected 193 states, found {len(rows)}"
            )
        if reference_names is None:
            reference_names = name_set
        elif not name_set.issubset(reference_names):
            extra = sorted(name_set - reference_names)
            raise ValueError(
                f"{circular.symbol} section {section['heading']} has unknown states: {extra}"
            )
        elif section["kind"] == "assessment" and name_set != reference_names:
            missing = sorted(reference_names - name_set)
            if len(missing) != 1 or section["source_total"] is None:
                raise ValueError(
                    f"{circular.symbol} assessment section {section['heading']} "
                    f"omits states: {missing}"
                )
            residual_gross = section["source_total"]["gross"] - sum(
                row["gross"] for row in rows
            )
            residual_net = section["source_total"]["net"] - sum(
                row["net"] for row in rows
            )
            if residual_gross <= 0 or residual_net <= 0:
                raise ValueError(
                    f"{circular.symbol} section {section['heading']} has unusable "
                    f"residual for {missing[0]}: gross={residual_gross}, net={residual_net}"
                )
            rows.append(
                {
                    "name": missing[0],
                    "regular_budget_rate": None,
                    "peacekeeping_rate": None,
                    "gross": residual_gross,
                    "net": residual_net,
                    "basis": "derived_from_printed_section_total",
                }
            )
            name_set.add(missing[0])

        complete_rates = all(
            row["regular_budget_rate"] is not None
            and row["peacekeeping_rate"] is not None
            for row in rows
        )
        regular_rate_total = sum(
            row["regular_budget_rate"] or 0 for row in rows
        )
        peacekeeping_rate_total = sum(
            row["peacekeeping_rate"] or 0 for row in rows
        )
        rate_anomalies: list[dict] = []
        if len(rows) == 193 and complete_rates:
            if abs(regular_rate_total - 100) > 0.001:
                raise ValueError(
                    f"{circular.symbol} section {section['heading']} regular rates do not total 100%"
                )
            if abs(peacekeeping_rate_total - 100) > 0.01:
                # Keep a source-level inconsistency visible without changing
                # the printed assessment amounts. ST/ADM/SER.B/1065, section
                # B, for example prints 27.8908% for the United States even
                # though its $2,715,387 row is 26.9493% of the section total.
                # The printed total still says 100.0000% and all dollar rows
                # reconcile, so the percentage is metadata, not an input to
                # the exported assessment amount.
                for row in rows:
                    implied_rate = 100 * row["gross"] / section["source_total"]["gross"]
                    difference = row["peacekeeping_rate"] - implied_rate
                    if abs(difference) > 0.02:
                        rate_anomalies.append(
                            {
                                "contributor": row["name"],
                                "printed_peacekeeping_rate": row["peacekeeping_rate"],
                                "implied_rate_from_gross_amount": round(implied_rate, 4),
                                "difference_percentage_points": round(difference, 4),
                            }
                        )
                if not rate_anomalies:
                    raise ValueError(
                        f"{circular.symbol} section {section['heading']} peacekeeping "
                        f"rates total {peacekeeping_rate_total}, but no row explains the mismatch"
                    )

        sign = -1 if section["kind"] == "credit" else 1
        for row in rows:
            signed_by_country[row["name"]]["gross"] += sign * row["gross"]
            signed_by_country[row["name"]]["net"] += sign * row["net"]

        signed_section_gross = sign * sum(row["gross"] for row in rows)
        signed_section_net = sign * sum(row["net"] for row in rows)
        if section["source_total"] is None:
            raise ValueError(
                f"{circular.symbol} section {section['heading']} has no parseable total row"
            )
        if (
            abs(signed_section_gross) != section["source_total"]["gross"]
            or abs(signed_section_net) != section["source_total"]["net"]
        ):
            raise ValueError(
                f"{circular.symbol} section {section['heading']} row sum does not "
                f"match its printed total: rows=({abs(signed_section_gross)}, "
                f"{abs(signed_section_net)}), source={section['source_total']}"
            )

        section_output.append(
            {
                **section,
                "sign": sign,
                "contributor_count": len(rows),
                "omitted_zero_credit_rows": (
                    193 - len(rows) if section["kind"] == "credit" else 0
                ),
                "rates_complete": complete_rates,
                "regular_budget_rate_total": round(regular_rate_total, 4),
                "peacekeeping_rate_total": round(peacekeeping_rate_total, 4),
                "rate_total_matches_printed": not rate_anomalies,
                "rate_anomalies": rate_anomalies,
                "derived_member_state_rows": [
                    {
                        "contributor": row["name"],
                        "gross": row["gross"],
                        "net": row["net"],
                    }
                    for row in rows
                    if row["basis"] == "derived_from_printed_section_total"
                ],
                "gross": signed_section_gross,
                "net": signed_section_net,
            }
        )

    contributors = {
        name: {"gross": values["gross"], "net": values["net"]}
        for name, values in signed_by_country.items()
    }
    parsed_gross = sum(value["gross"] for value in contributors.values())
    summary = parse_summary_totals(document)
    if summary is None:
        raise ValueError(f"{circular.symbol} has no parseable section-I total row")
    if parsed_gross != summary["gross"]:
        raise ValueError(
            f"{circular.symbol} gross total mismatch: rows={parsed_gross}, "
            f"summary={summary['gross']}, sections="
            f"{[(item['heading'], item['gross']) for item in section_output]}"
        )

    return {
        "mission_code": circular.mission_code,
        "mission_name": circular.mission_name,
        "symbol": circular.symbol,
        "url": circular.url,
        "page_count": len(document),
        "summary": summary,
        "sections": section_output,
        "contributors": contributors,
    }


def export_cycle(cycle_year: int, circulars: list[Circular]) -> dict:
    parsed = [parse_circular(circular) for circular in circulars]
    country_sets = [set(item["contributors"]) for item in parsed]
    for item, countries in zip(parsed[1:], country_sets[1:], strict=True):
        if countries != country_sets[0]:
            raise ValueError(
                f"{cycle_year} Member State set differs for {item['mission_code']}; "
                f"missing={sorted(country_sets[0] - countries)}, "
                f"extra={sorted(countries - country_sets[0])}"
            )

    by_country: dict[str, dict] = {}
    for name in sorted(country_sets[0]):
        missions = []
        for item in sorted(parsed, key=lambda value: value["mission_code"]):
            amount = item["contributors"][name]
            missions.append(
                {
                    "code": item["mission_code"],
                    "name": item["mission_name"],
                    "gross_assessment": amount["gross"],
                    "net_assessment": amount["net"],
                    "source_symbol": item["symbol"],
                    "source_url": item["url"],
                    **(
                        {
                            "source_statement_urls": [
                                source["url"] for source in item["statement_documents"]
                            ]
                        }
                        if item.get("statement_documents")
                        else {}
                    ),
                }
            )
        gross = sum(mission["gross_assessment"] for mission in missions)
        net = sum(mission["net_assessment"] for mission in missions)
        by_country[name] = {
            "name": name,
            "gross_assessment": gross,
            "net_assessment": net,
            "tax_equalization_adjustment": net - gross,
            "missions": missions,
        }

    contributors = sorted(
        by_country.values(), key=lambda item: (-item["net_assessment"], item["name"])
    )
    total_gross = sum(item["gross_assessment"] for item in contributors)
    total_net = sum(item["net_assessment"] for item in contributors)
    section_count = sum(len(item["sections"]) for item in parsed)
    source_file_count = sum(
        len(item.get("statement_documents", [])) or 1 for item in parsed
    )
    rate_anomalies = [
        {
            "mission_code": item["mission_code"],
            "symbol": item["symbol"],
            "section": section["heading"],
            **anomaly,
        }
        for item in parsed
        for section in item["sections"]
        for anomaly in section["rate_anomalies"]
    ]
    derived_rows = [
        {
            "mission_code": item["mission_code"],
            "symbol": item["symbol"],
            "section": section["heading"],
            "rows": section["derived_member_state_rows"],
        }
        for item in parsed
        for section in item["sections"]
        if section["derived_member_state_rows"]
    ]

    payload = {
        "meta": {
            "stream": "pko-contributors",
            "title": "Peacekeeping assessed contributions",
            "cycle_year": cycle_year,
            "fiscal_year": CYCLES[cycle_year].replace("1 July ", "").replace(
                " to 30 June ", "/"
            ),
            "period": CYCLES[cycle_year],
            "currency": "USD",
            "measure": "net_assessment",
            "total_gross_assessment": total_gross,
            "total_net_assessment": total_net,
            "source_page": (
                PRIOR_ASSESSMENTS_PAGE_URL
                if cycle_year == 2025
                else ASSESSMENTS_PAGE_URL
            ),
            "scope": (
                (
                    "Mission assessment documents indexed by the Committee on "
                    "Contributions; credits are subtracted and split-period "
                    "assessments are included."
                )
                if cycle_year == 2025
                else (
                    "Mission assessment circulars indexed by the Committee on "
                    "Contributions; credits are subtracted and additional "
                    "assessments are included."
                )
            ),
            "coverage": {
                "missions": len(parsed),
                "contributors": len(contributors),
                "table_sections": section_count,
                **({"source_files": source_file_count} if cycle_year == 2025 else {}),
            },
            "verification": {
                "member_states_per_section": 193,
                "country_sets_consistent": True,
                "rates_total_100_percent": not rate_anomalies,
                "gross_rows_match_source_summary": True,
                "mission_documents": len(parsed),
                "source_rate_anomalies": rate_anomalies,
                "rows_derived_from_printed_totals": derived_rows,
            },
            "source_documents": [
                {
                    "mission_code": item["mission_code"],
                    "mission_name": item["mission_name"],
                    "symbol": item["symbol"],
                    "url": item["url"],
                    "page_count": item["page_count"],
                    "summary": item["summary"],
                    "sections": item["sections"],
                    **(
                        {"statement_documents": item["statement_documents"]}
                        if item.get("statement_documents")
                        else {}
                    ),
                }
                for item in sorted(parsed, key=lambda value: value["mission_code"])
            ],
        },
        "contributors": contributors,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    output = OUT / f"peacekeeping-contributors-{cycle_year}.json"
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    return payload


def main() -> None:
    discovered = discover_circulars()
    for year, circulars in discovered.items():
        payload = export_cycle(year, circulars)
        coverage = payload["meta"]["coverage"]
        print(
            f"{year}: {coverage['missions']} missions, "
            f"{coverage['table_sections']} table sections, "
            f"{coverage['contributors']} contributors, "
            f"net ${payload['meta']['total_net_assessment']:,}"
        )


if __name__ == "__main__":
    main()
