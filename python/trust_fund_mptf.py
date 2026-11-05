"""Read the named fund columns in Schedule 8.1, separately from coded funds."""

from __future__ import annotations

import json
import re
import csv
from pathlib import Path
from statistics import median

import pandas as pd
import pymupdf

from trust_fund_entity_crosswalk import normalize_fund_name
from trust_fund_schedules import parse_amount
from utils import normalize_entity


STATEMENT = re.compile(r"Statement of Financial (Position|Performance).*31 December (20\d\d)", re.I)
LINES = {
    name.casefold(): name for name in [
        "Voluntary contributions receivable", "Other assets",
        "Accounts payable and accrued liabilities", "Other liabilities", "Net assets",
        "Voluntary contributions", "Other revenue", "Investment revenue", "Total revenue",
        "Grants and other transfers", "Other operating expenses", "Other expenses", "Total expenses",
        "Surplus/(Deficit) for the year", "Net asset opening", "Net asset closing",
    ]
}
LINES.update({"net assets opening": "Net asset opening", "net assets closing": "Net asset closing"})

# Portal identities, not invented source fund codes. Match reviewed printed
# headers; preserve the source's own annual name alongside the stable identity.
FUND_NAMES = {
    "common humanitarian fund": "common-humanitarian-fund",
    "un peacebuilding fund": "peacebuilding-fund",
    "un mptf on migration": "migration-fund",
    "un haiti cholera response fund": "haiti-cholera-response-fund",
    "un covid 19 response and recovery fund": "covid-19-response-and-recovery-fund",
    "digital cooperation fund": "digital-cooperation-fund",
    "spotlight initiative 2 0 fund": "spotlight-initiative-2-0-fund",
}

ARWO_NOTES = {
    "common-humanitarian-fund": ["MPTF - Human Rights and Humanitarian Affairs", "MPTF - Humananitarian Funds"],
    "peacebuilding-fund": ["MPTF - Peacebuilding Fund"],
    "migration-fund": ["MPTF on Migration"],
    "haiti-cholera-response-fund": ["MPTF - Haiti Cholera Response Fund"],
    "covid-19-response-and-recovery-fund": ["MPTF - COVID-19", "MPTF - UN COVID-19 Multi Partner Trust Fund"],
    "digital-cooperation-fund": ["MPTF - Digital Cooperation Fund"],
    "spotlight-initiative-2-0-fund": ["Spotlight Initiative 2.0 Trust Fund"],
}

FUND_ACCOUNT_ENTITIES = {
    "MPTF-PBF": "Peacebuilding Fund",
    "MPTF-CVD": "COVID-19 Response and Recovery Fund",
    "MPTF-HTI": "Haiti Cholera Response Fund",
}


def physical_rows(page: pymupdf.Page) -> list[dict]:
    lines = [line for block in page.get_text("dict")["blocks"] for line in block.get("lines", [])]
    upright = sum(line["dir"][1] < -0.9 for line in lines) > len(lines) / 2
    words = []
    for x0, y0, x1, y1, text, *_ in page.get_text("words"):
        if upright:
            x0, y0, x1, y1 = page.rect.height - y1, x0, page.rect.height - y0, x1
        words.append((x0, y0, x1, y1, text))
    words.sort(key=lambda word: (word[1], word[0]))
    rows = []
    for word in words:
        if not rows or abs(rows[-1]["y"] - word[1]) > 2:
            rows.append({"y": word[1], "words": []})
        rows[-1]["words"].append(word)
    for row in rows:
        row["words"].sort(key=lambda word: word[0])
        row["text"] = " ".join(word[4] for word in row["words"])
    return rows


def row_label(row: dict) -> str | None:
    text = row["text"].strip().casefold()
    return next((LINES[key] for key in sorted(LINES, key=len, reverse=True)
                 if text == key or text.startswith(key + " ")), None)


def amount_cells(row: dict) -> list[dict]:
    cells = []
    for x0, _, x1, _, text in row["words"]:
        if not re.fullmatch(r"[\d,()−–—-]+", text):
            continue
        if not cells or x0 - cells[-1]["right"] > 8:
            cells.append({"left": x0, "right": x1, "text": text})
        else:
            cells[-1]["right"] = x1
            cells[-1]["text"] += " " + text
    return cells


def fund_id(name: str) -> str:
    cleaned = re.sub(r"\s*/[a-z]\s*$", "", name, flags=re.I).strip()
    key = normalize_fund_name(cleaned)
    return "mptf:" + FUND_NAMES.get(key, key.replace(" ", "-"))


def parse_table(rows: list[dict], year: int, page: int) -> tuple[list[dict], list[dict], dict]:
    heading = STATEMENT.search(rows[0]["text"])
    statement = "financial_position" if heading[1].lower() == "position" else "financial_performance"
    period = int(heading[2])
    financial = [row for row in rows[1:] if row_label(row)]
    anchor_name = "Net assets" if statement == "financial_position" else "Total expenses"
    anchor = next(row for row in financial if row_label(row) == anchor_name)
    anchors = amount_cells(anchor)
    if len(anchors) < 3:
        raise ValueError(f"Incomplete MPTF columns: {year}, PDF p. {page}")
    rights = [cell["right"] for cell in anchors]
    width = median(b - a for a, b in zip(rights, rights[1:]))
    boundaries = [rights[0] - width * 1.2, *[right + 3 for right in rights]]
    headers = [[] for _ in rights]
    for row in rows[1:]:
        if row_label(row):
            break
        for x0, _, x1, _, text in row["words"]:
            center = (x0 + x1) / 2
            for index, (left, right) in enumerate(zip(boundaries, boundaries[1:])):
                if left <= center < right:
                    headers[index].append(text)
                    break
    names = [" ".join(header).strip() for header in headers]
    if names[-1] != "Total" or any(not name for name in names):
        raise ValueError(f"Invalid MPTF headers: {year}, PDF p. {page}: {names}")
    ids = [fund_id(name) for name in names[:-1]]
    if len(set(ids)) != len(ids):
        raise ValueError(f"Duplicate MPTF fund identity: {year}, PDF p. {page}")
    facts, controls, literal = [], [], []
    for row in financial:
        label = row_label(row)
        cells = [None] * len(rights)
        for cell in amount_cells(row):
            index = min(range(len(rights)), key=lambda i: abs(rights[i] - cell["right"]))
            if abs(rights[index] - cell["right"]) > width * 0.3 or cells[index] is not None:
                raise ValueError(f"Ambiguous MPTF amount column: {year}, PDF p. {page}, {row['text']}")
            cells[index] = cell["text"]
        amounts = [parse_amount(cell or "")[0] for cell in cells]
        common = {"calendar_year": year, "period_year": period, "statement_type": statement,
                  "line_item": label, "page": page, "source_y": row["y"]}
        for index, (identifier, name, value) in enumerate(zip(ids, names, amounts)):
            facts.append({**common, "fund_id": identifier, "fund_name": re.sub(r"\s*/[a-z]$", "", name),
                          "source_column": name, "amount_usd": value,
                          "reported_text": cells[index] or "", "reported_as_dash": parse_amount(cells[index] or "")[1]})
        complete = all(value is not None for value in amounts[:-1])
        total = amounts[-1]
        child_sum = sum(value for value in amounts[:-1] if value is not None) if complete else None
        controls.append({**common, "reported_total_usd": total, "fund_sum_usd": child_sum,
                         "difference_usd": total - child_sum if complete and total is not None else None,
                         "missing_cells": sum(value is None for value in amounts[:-1])})
        literal.append({"line_item": label, "source_y": row["y"], "cells": cells})
    return facts, controls, {"calendar_year": year, "period_year": period, "page": page,
                            "statement_type": statement, "columns": names, "rows": literal}


def extract_mptf(source: dict) -> tuple[list[dict], list[dict], list[dict]]:
    facts, controls, tables = [], [], []
    year = int(source["calendar_year"])
    with pymupdf.open(source["pdf_path"]) as document:
        for number, page in enumerate(document, 1):
            text = page.get_text()
            if not re.search(r"^\s*Schedule\s+8\.1\s*$", text, re.M) or not STATEMENT.search(text):
                continue
            rows = physical_rows(page)
            starts = [index for index, row in enumerate(rows) if STATEMENT.search(row["text"])]
            for index, start in enumerate(starts):
                end = starts[index + 1] if index + 1 < len(starts) else len(rows)
                f, c, t = parse_table(rows[start:end], year, number)
                facts.extend(f); controls.extend(c); tables.append(t)
    selected = [row for row in facts if row["period_year"] == year
                and row["statement_type"] == "financial_performance" and row["line_item"] == "Total expenses"]
    if not selected or any(row["amount_usd"] is None for row in selected):
        raise ValueError(f"Missing current-year MPTF fund expenses in {year}")
    keys = [(row["fund_id"], row["period_year"], row["statement_type"], row["line_item"]) for row in facts]
    if len(set(keys)) != len(keys):
        raise ValueError(f"Duplicate MPTF statement facts in {year}")
    expense_control = [row for row in controls if row["period_year"] == year
                       and row["line_item"] == "Total expenses"]
    if len(expense_control) != 1 or expense_control[0]["difference_usd"] != 0:
        raise ValueError(f"MPTF current expense columns do not reconcile to their printed total in {year}")
    contributions = [row for row in facts if row["period_year"] == year
                     and row["line_item"] == "Voluntary contributions"]
    contribution_total = [row["reported_total_usd"] for row in controls
                          if row["period_year"] == year and row["line_item"] == "Voluntary contributions"]
    if (len(contribution_total) != 1
            or {row["fund_id"] for row in contributions} != {row["fund_id"] for row in selected}
            or sum(row["amount_usd"] for row in contributions if row["amount_usd"] is not None)
            != contribution_total[0]):
        raise ValueError(f"MPTF current voluntary contributions do not reconcile in {year}")
    for expense in selected:
        values = {row["line_item"]: row["amount_usd"] for row in facts
                  if row["fund_id"] == expense["fund_id"] and row["period_year"] == year
                  and row["statement_type"] == "financial_performance"}
        for positive, negative, reported in [
            ("Total revenue", "Total expenses", "Surplus/(Deficit) for the year"),
        ]:
            if any(values.get(key) is None for key in [positive, negative, reported]):
                raise ValueError(f"Missing current MPTF statement control: {year}, {expense['fund_id']}")
            if abs(values[positive] - values[negative] - values[reported]) > 2:
                raise ValueError(f"MPTF revenue/expense equation failed: {year}, {expense['fund_id']}")
        if abs(values["Net asset opening"] + values["Surplus/(Deficit) for the year"] - values["Net asset closing"]) > 2:
            raise ValueError(f"MPTF opening/closing balance equation failed: {year}, {expense['fund_id']}")
    return facts, controls, tables


def extract_bundle(manifest: list[dict], stage2: Path) -> pd.DataFrame:
    stage2.mkdir(parents=True, exist_ok=True)
    (stage2.parent / "stage1").mkdir(parents=True, exist_ok=True)
    facts, controls, tables = [], [], []
    for source in manifest:
        f, c, t = extract_mptf(source)
        facts.extend(f); controls.extend(c); tables.extend(t)
    frame = pd.DataFrame(facts)
    frame["amount_usd"] = pd.array(frame.amount_usd, dtype="Int64")
    frame.to_csv(stage2 / "mptf-statement-facts.csv", index=False)
    pd.DataFrame(controls).to_csv(stage2 / "mptf-source-controls.csv", index=False)
    (stage2.parent / "stage1" / "mptf-tables.json").write_text(json.dumps(tables, indent=2), encoding="utf-8")
    exceptions = [row for row in controls if row["difference_usd"] or row["missing_cells"]]
    (stage2.parent / "mptf-quality-profile.json").write_text(json.dumps({
        "status": "pass", "tables": len(tables), "statement_facts": len(facts),
        "current_expense_controls": [row for row in controls if row["period_year"] == row["calendar_year"]
                                     and row["line_item"] == "Total expenses"],
        "source_exceptions": exceptions,
        "policy": "Printed blanks remain unknown; printed dashes are zero. Comparative source discrepancies are retained, not corrected.",
    }, indent=2), encoding="utf-8")
    return frame


def entity_crosswalk() -> dict[str, dict]:
    """Reconstruct organizational attribution from exact reviewed ARWO notes.

    ARWO supplies attribution only. Its amounts never replace printed Schedule
    8.1 expenses. Fund-account pseudo-entities remain distinct from departments.
    """
    evidence = []
    paths = [Path("data/un-secretariat-expenses.csv"),
             *sorted(Path("data").glob("un-secretariat-expenses-*.csv"))]
    for path in paths:
        with path.open() as stream:
            for number, row in enumerate(csv.DictReader(stream), 2):
                if row["SOURCE_TYPE"] == "Voluntary" and row["NOTE"]:
                    evidence.append({**row, "input_path": str(path), "csv_row": number})
    output = {}
    for slug, aliases in ARWO_NOTES.items():
        keys = {normalize_fund_name(alias) for alias in aliases}
        matched = [row for row in evidence if normalize_fund_name(row["NOTE"]) in keys]
        codes = {normalize_entity(row["ENTITY"]) for row in matched}
        if len(codes) != 1:
            raise ValueError(f"Missing or ambiguous MPTF entity assignment: {slug}: {codes}")
        output["mptf:" + slug] = {
            "entity_code": codes.pop(), "mapping_method": "reviewed_exact_arwo_note",
            "evidence": [{key: row[key] for key in ["input_path", "csv_row", "YEAR", "ENTITY", "NOTE"]} for row in matched],
        }
    return output


def reference(row: dict, source: dict) -> dict:
    return {"symbol": source["symbol"],
            "url": source.get("pdf_final_url") or source["source_pdf_url"],
            "pdfPage": int(row["page"]), "pdfPageScope": "row",
            "pageStatus": "extracted_pdf_row", "tableTitle": "Schedule 8.1 — " + row["statement_type"].replace("_", " "),
            "rowLabel": row["line_item"], "columnHeader": row["source_column"],
            "label": row["fund_name"] + " — " + str(row["period_year"])}


def extend_contributors(payload: dict, facts: pd.DataFrame, source: dict, spending: dict) -> None:
    """Add the printed matrix amounts as one source-reported aggregate."""
    meta = payload["meta"]
    year = meta["year"]
    rows = facts.loc[
        facts.calendar_year.eq(year) & facts.period_year.eq(year)
        & facts.statement_type.eq("financial_performance")
        & facts.line_item.eq("Voluntary contributions") & facts.amount_usd.notna()
    ]
    nodes = {node["id"]: node for node in spending["nodes"]}
    accounts = {node["id"].split(":fund:", 1)[1]: node for node in nodes.values()
                if node.get("fundAccountType") == "mptf"}
    flow = {"type": "voluntary_contribution", "label": "Voluntary contributions",
            "group": "unitemized"}
    destinations = []
    for row in rows.to_dict("records"):
        fund = accounts[row["fund_id"]]
        entity = nodes[fund["parentId"]]
        amount = int(row["amount_usd"])
        refs = [reference(row, source)]
        destinations.append({
            "fund_code": None, "fund_id": fund["id"], "fund_name": fund["label"],
            "entity_code": entity["code"], "entity_name": entity["label"], "entity_id": entity["id"],
            "mapping_status": "unresolved" if entity["code"] == "UNMAPPED" else "mapped",
            "amount_usd": amount, "supportingSources": refs,
            "flows": [{**flow, "amount_usd": amount, "supportingSources": refs}],
        })
    destinations.sort(key=lambda fund: fund["amount_usd"], reverse=True)
    amounts = [fund["amount_usd"] for fund in destinations]
    total = sum(amounts)
    total_refs = [ref for fund in destinations for ref in fund["supportingSources"]]
    name = "MPTF voluntary contributions"
    if any(item["name"] == name for item in payload["contributors"]):
        raise ValueError(f"Duplicate MPTF contribution aggregate in {year}")
    payload["contributors"].append({
        "name": name, "counterparty_group": "Unspecified", "amount_usd": total,
        "positive_amount_usd": sum(amount for amount in amounts if amount > 0),
        "negative_amount_usd": sum(amount for amount in amounts if amount < 0),
        "reported_names": [], "destinations": destinations,
        "flows": [{**flow, "amount_usd": total, "supportingSources": total_refs}],
    })
    payload["contributors"].sort(key=lambda item: item["amount_usd"], reverse=True)
    meta["mptf_voluntary_contributions_usd"] = total
    meta["statement_total_usd"] += total
    meta["contributor_total_usd"] += total
    meta["unresolved_entity_amount_usd"] += sum(
        fund["amount_usd"] for fund in destinations if fund["mapping_status"] == "unresolved"
    )
    meta["method_note"] += (
        " Schedule 8.1 adds reported MPTF voluntary contributions by recipient fund, "
        "without a contributor breakdown. Named-row reconciliation covers the individually coded funds."
    )


def fund_position(rows: list[dict], source: dict, year: int) -> dict:
    keys = {"Voluntary contributions receivable": ("contributionsReceivable", "Contributions receivable"),
            "Other assets": ("otherAssets", "Other assets"),
            "Accounts payable and accrued liabilities": ("accountsPayable", "Accounts payable and accrued liabilities"),
            "Other liabilities": ("otherLiabilities", "Other liabilities"),
            "Net assets": ("netAssets", "Net assets")}
    metrics = []
    for row in rows:
        if row["statement_type"] != "financial_position" or row["line_item"] not in keys:
            continue
        key, label = keys[row["line_item"]]
        amount = None if pd.isna(row["amount_usd"]) else int(row["amount_usd"])
        metrics.append({"key": key, "label": label, "amount": amount,
                        "fundsCovered": int(amount is not None), "supportingSources": [reference(row, source)]})
    return {"asOf": f"{year}-12-31", "fundCount": 1, "metrics": metrics}


def merge_positions(positions: list[dict], year: int) -> dict:
    metrics = {}
    for position in positions:
        for metric in position["metrics"]:
            metrics.setdefault(metric["key"], metric)
    merged = []
    for key, exemplar in metrics.items():
        parts = [next((row for row in p["metrics"] if row["key"] == key), None) for p in positions]
        complete = all(part is not None and part["amount"] is not None for part in parts)
        merged.append({"key": key, "label": exemplar["label"],
                       "amount": sum(part["amount"] for part in parts) if complete else None,
                       "fundsCovered": sum(part["fundsCovered"] for part in parts if part),
                       "supportingSources": [ref for part in parts if part for ref in part["supportingSources"]]})
    return {"asOf": f"{year}-12-31", "fundCount": sum(p["fundCount"] for p in positions),
            "metrics": merged, "scopeNote": "Fund-account balances before eliminations. Some balance categories are not itemized for every fund."}


def extend_spending(payload: dict, year: int, facts: pd.DataFrame, source: dict,
                    heading: dict, entity_names: dict[str, str], scope: dict,
                    crosswalk: dict[str, dict]) -> dict:
    """Add each current-year MPTF account once, using the printed source measure."""
    annual = facts.loc[facts.calendar_year.eq(year) & facts.period_year.eq(year)]
    expenses = annual.loc[annual.statement_type.eq("financial_performance") & annual.line_item.eq("Total expenses")]
    nodes = payload["nodes"]
    if any(node.get("fundAccountType") == "mptf" for node in nodes):
        raise ValueError("MPTF accounts have already been added")
    by_id = {node["id"]: node for node in nodes}
    section_id = "trust-funds~entities"
    positions = {}
    total = 0
    coverage = "Schedule 8.1 reports aggregate contributions but does not name contributors."
    for row in expenses.to_dict("records"):
        identifier = row["fund_id"]
        code = crosswalk.get(identifier, {}).get("entity_code", "UNMAPPED")
        entity_id = f"trust-fund-entity:{code}"
        if entity_id not in by_id:
            name = FUND_ACCOUNT_ENTITIES.get(code, entity_names.get(code, code))
            if code == "UNMAPPED": name = "Unmapped Trust Funds"
            node = {"id": entity_id, "parentId": section_id, "tier": "budget_unit", "kind": "entity",
                    "code": code, "label": name, "amount": 0, "values": {"extrabudgetary": 0},
                    "basis": "derived_from_printed_fund_totals", "unitType": "entity", "role": "source_node",
                    "entity": {"name": name, "acronym": None if code in FUND_ACCOUNT_ENTITIES else code,
                               "relationship": "fund_account" if code in FUND_ACCOUNT_ENTITIES else "trust_fund_crosswalk"},
                    "contributorsAvailable": False, "contributorCoverageNote": coverage}
            if code in FUND_ACCOUNT_ENTITIES:
                node["note"] = "ARWO reports this fund-account grouping separately; it is not a Secretariat department."
            nodes.append(node); by_id[entity_id] = node
        entity = by_id[entity_id]
        if entity_id not in positions:
            positions[entity_id] = [entity["financialPosition"]] if entity.get("financialPosition") else []
        amount = int(row["amount_usd"])
        entity["amount"] += amount
        entity["values"]["extrabudgetary"] += amount
        entity["contributorCoverageNote"] = coverage + (" Contributor detail below covers the other funds only."
                                                      if entity.get("contributorsAvailable", True) else "")
        fund_rows = annual.loc[annual.fund_id.eq(identifier)].to_dict("records")
        position = fund_position(fund_rows, source, year)
        positions[entity_id].append(position)
        ref = reference(row, source)
        nodes.append({"id": f"{entity_id}:fund:{identifier}", "parentId": entity_id,
                      "tier": "detail", "kind": "allocation", "code": None,
                      "fundAccountType": "mptf", "label": row["fund_name"], "amount": amount,
                      "basis": "directly_printed", "values": {"extrabudgetary": amount},
                      "source": ref, "supportingSources": [ref], "financialPosition": position,
                      "contributorsAvailable": False, "contributorCoverageNote": coverage,
                      "note": "UN-controlled fund account administered by the UNDP Multi-Partner Trust Fund Office. Reported expenses include grants and transfers.",
                      "scheduleGroup": {"code": heading["schedule_group_code"], "label": heading["schedule_group_name"],
                                        "source": {"symbol": source["symbol"], "url": ref["url"],
                                                   "pdfPage": int(heading["heading_pdf_page"]), "tableTitle": "Contents — schedule groups",
                                                   "rowLabel": heading["schedule_group_name"]}},
                      "description": scope["description"], "descriptionBlocks": scope["description_blocks"],
                      "descriptionSources": [{"symbol": source["symbol"], "url": ref["url"], "pdfPage": page,
                                              "label": "Schedule 8.1 — Portfolio scope", "pdfPageScope": "section"}
                                             for page in scope["pdf_pages"]]})
        total += amount
    for entity_id, parts in positions.items():
        by_id[entity_id]["financialPosition"] = merge_positions(parts, year)
    for node in nodes:
        if node["tier"] in {"whole", "part", "section"}:
            node["amount"] += total
            node["values"]["extrabudgetary"] += total
    meta = payload["meta"]
    meta["total"] += total
    meta["verification"]["coded_fund_total_usd"] = meta["verification"]["schedule_total_usd"]
    meta["verification"]["mptf_total_usd"] = str(total)
    meta["verification"]["mptf_funds"] = str(len(expenses))
    meta["verification"]["schedule_total_usd"] = str(meta["total"])
    mapped = expenses.loc[expenses.fund_id.isin(crosswalk)]
    meta["verification"]["mapped_funds"] = str(int(meta["verification"]["mapped_funds"]) + len(mapped))
    meta["verification"]["mapped_total_usd"] = str(int(meta["verification"]["mapped_total_usd"]) + int(mapped.amount_usd.sum()))
    unknown = expenses.loc[~expenses.fund_id.isin(crosswalk)]
    meta["verification"]["unresolved_funds"] = str(int(meta["verification"]["unresolved_funds"]) + len(unknown))
    if not unknown.empty:
        meta["verification"]["unresolved_fund_codes"] += ", " + ", ".join(unknown.fund_id)
    if sum(node["amount"] for node in nodes if node["tier"] == "detail") != meta["total"]:
        raise ValueError(f"Combined coded/MPTF fund totals do not reconcile in {year}")
    for entity_id in positions:
        if sum(node["amount"] for node in nodes if node["parentId"] == entity_id) != by_id[entity_id]["amount"]:
            raise ValueError(f"Combined coded/MPTF entity children do not reconcile: {year}, {entity_id}")
    return payload
