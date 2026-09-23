"""Annual-report occurrences: exact amounts, orthogonal classifications, no joins on money."""
from __future__ import annotations
import csv
import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from utils import normalize_entity
from trust_fund_entity_crosswalk import normalize_fund_name

INPUTS = [Path("data/un-secretariat-expenses.csv"),
          *[Path(f"data/un-secretariat-expenses-{y}.csv") for y in (2024, 2025)]]
FAMILIES = {
    "programme": "Programme budget", "peacekeeping": "Peacekeeping budget",
    "irmct": "IRMCT assessed budget", "trust_funds": "Trust funds",
    "treaty": "Treaty/convention financing",
    "unitemized": "Unitemized extrabudgetary resources",
    "unresolved": "Unresolved convention identity",
}
SOURCES = {"Regular assessed": "regular_budget", "Other Assessed": "other_assessed",
           "Voluntary": "extrabudgetary"}
MISSION = {"A/74/736", "A/75/786", "A/76/717", "A/77/779", "A/78/726", "A/79/788", "A/80/643"}
SUPPORT = {"A/74/743", "A/75/656", "A/76/596", "A/77/631", "A/78/638", "A/79/680", "A/80/631"}
IRMCT = {"A/75/383", "ST/ADM/SER.B/1010", "ST/ADM/SER.B/1025", "A/77/528", "A/79/555", "A/80/505"}


def read_json(path: str) -> dict:
    return json.loads(Path(path).read_text())


def funding(row: dict, arrangements: dict) -> dict:
    source, reference = row["SOURCE_TYPE"], row["REFERENCE"]
    if source == "Voluntary":
        return arrangements[normalize_fund_name(row["NOTE"])]
    if source == "Regular assessed":
        family = "programme"
    elif source == "Other Assessed" and reference in MISSION | SUPPORT:
        family = "peacekeeping"
    elif source == "Other Assessed" and reference in IRMCT and normalize_entity(row["ENTITY"]) == "MICT":
        family = "irmct"
    else:
        raise ValueError(f"Unclassified financing: {source} / {reference}")
    return {"id": family, "family": family, "label": FAMILIES[family],
            "subtype": "budget", "evidence": f"Annual-report source: {source}; {reference}"}


def resolve_records() -> tuple[list[dict], dict, dict]:
    taxonomy = read_json("data/secretariat-overview-classification.json")
    arrangements = read_json("data/secretariat-funding-arrangements.json")
    spm = read_json("data/references/spm-catalogue.json")["records"]
    records, snapshots = [], {}
    for path in INPUTS:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        snapshots[path.name] = digest
        with path.open() as stream:
            source_rows = list(csv.DictReader(stream))
        for ordinal, raw in enumerate(source_rows, 1):
            code, year = normalize_entity(raw["ENTITY"]), int(raw["YEAR"])
            entity = taxonomy["entities"][code].copy()
            overrides = [o for o in taxonomy["source_identity_overrides"] if
                         o["original_code"] == raw["ENTITY"] and o["first"] <= year <= o["last"]]
            assert len(overrides) <= 1, "Ambiguous dated identity"
            if overrides:
                entity.update(overrides[0])
            dated = [o for o in taxonomy["dated_reporting_labels"] if
                     o["code"] == code and o["first"] <= year <= o["last"]]
            assert len(dated) <= 1, "Ambiguous budget reporting identity"

            assert taxonomy["period"]["first"] <= year <= taxonomy["period"]["last"]
            arrangement = funding(raw, arrangements)
            membership = [r for r in spm if r["reportingYear"] == year and
                          (r["shortLabel"] == dated[0]["budget_code"] if dated else
                           r["entityId"] == entity["entity_id"]) and r["disposition"] == "named_member"]
            records.append({
                "id": f"{digest}:{ordinal}", "input": path.name, "ordinal": ordinal,
                "year": year, "financial_year": raw["FINANCIAL_YEAR"],
                "original_code": raw["ENTITY"], "code": code, "entity_id": entity["entity_id"],
                "name": entity["name"], "group": entity["group"], "group_basis": entity["basis"],
                "budgetary_spm": (True if membership else False if entity["group"] != "spm" or code in {"UNOAU", "UNSCO"} else None),
                "budgetary_spm_status": ("named_source_row" if membership else
                    "outside_spm_budget_group" if entity["group"] != "spm" or code in {"UNOAU", "UNSCO"} else
                    "no_named_same_year_evidence"),
                "budget_reporting_identity": ({"id": membership[0]["entityId"], "name": membership[0]["canonicalName"],
                    "edition": membership[0]["edition"], "reportingYear": year,
                    "qualification": "Dated budget reporting label; does not establish operational succession date"} if membership else None),
                "identity_status": ("historical_source_context" if overrides else entity["identity_status"]),
                "spm_evidence": [r["source"].get("citationId") for r in membership],
                "priority_area": raw["PRIORITY_AREA"], "source_type": raw["SOURCE_TYPE"],
                "funding_source": SOURCES[raw["SOURCE_TYPE"]],
                "reference": raw["REFERENCE"], "note": raw["NOTE"],
                "amount_exact": raw["AMOUNT"], "amount": float(Decimal(raw["AMOUNT"])),
                "arrangement": arrangement,
            })
    assert len({r["id"] for r in records}) == len(records)
    return records, taxonomy, snapshots


def exact_total(records: list[dict]) -> Decimal:
    return sum((Decimal(r["amount_exact"]) for r in records), Decimal(0))


def build_overview(year: int, records: list[dict], taxonomy: dict, snapshots: dict) -> dict:
    entities = []
    by_code = defaultdict(list)
    for row in records:
        by_code[row["code"]].append(row)
    for code, rows in sorted(by_code.items()):
        grouped = defaultdict(list)
        for row in rows:
            grouped[(row["priority_area"], row["funding_source"])].append(row)
        cells = [{"priority_area": p, "funding_source": s, "amount": float(exact_total(rs)),
                  "amount_exact": str(exact_total(rs)), "record_ids": [r["id"] for r in rs]}
                 for (p, s), rs in sorted(grouped.items())]
        total = exact_total(rows)
        priorities = {p: exact_total([r for r in rows if r["priority_area"] == p]) for p, _ in grouped}
        assert sum((Decimal(c["amount_exact"]) for c in cells), Decimal(0)) == total
        entities.append({
            "code": code, "name": rows[0]["name"], "entity_id": rows[0]["entity_id"],
            "total": float(total), "amount_exact": str(total),
            "primary_priority": max(priorities, key=priorities.get),
            "split_across_priorities": True, "group": rows[0]["group"],
            "group_basis": rows[0]["group_basis"], "cells": cells,
        })
    total = exact_total(records)
    rounded = total.quantize(Decimal("0.01"))
    return {"meta": {
        "schema_version": 2, "year": year, "currency": "USD", "measure": "expenses",
        "total": float(total), "amount_exact": str(total), "display_total": str(rounded),
        "rounding_difference": str(rounded - total), "input_snapshots": snapshots,
        "priorities": sorted({r["priority_area"] for r in records}),
        "funding_sources": list(SOURCES.values()), "funding_families": FAMILIES,
        "groups": taxonomy["groups"], "classification_note": taxonomy["classification_note"],
        "source": {"label": "Annual Report on the Work of the Organization — expenditure",
                   "url": "https://www.un.org/annualreport/"}},
        "entities": entities, "records": records}


def export_overviews() -> None:
    records, taxonomy, snapshots = resolve_records()
    for year in sorted({r["year"] for r in records}):
        payload = build_overview(year, [r for r in records if r["year"] == year], taxonomy, snapshots)
        Path(f"public/data/secretariat-overview-{year}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Resolved {len(records)} annual-report occurrences exactly once")


if __name__ == "__main__":
    export_overviews()
