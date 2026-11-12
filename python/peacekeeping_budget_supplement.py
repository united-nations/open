"""Add verified UN budget tables alongside the versioned mission detail."""

import json
from pathlib import Path

SOURCE = Path("data/peacekeeping-budget-supplement.json")
MISSION_CLASSES = {
    "Military and police personnel": "military_police_personnel",
    "Civilian personnel": "civilian_personnel",
    "Operational costs": "operational_costs",
}


def load_supplement() -> dict:
    return json.loads(SOURCE.read_text())


def source_reference(citation: dict, documents: dict) -> dict:
    assert citation["pdfPage"] > 0, citation
    assert citation["rowLabel"] and citation["columnHeader"], citation
    return {
        **citation,
        "url": documents[citation["symbol"]],
        "pdfPageScope": "table",
    }


def export_fact(fact: dict, documents: dict) -> dict:
    assert type(fact["amount"]) is int and fact["amount"] >= 0, fact
    return {
        "amount": fact["amount"],
        "source": source_reference(fact["citation"], documents),
    }


def export_account(account: dict, documents: dict) -> dict:
    breakdown = []
    for row in account["breakdown"]:
        fact = export_fact(row, documents)
        fact["source"]["budgetItem"] = row["label"]
        breakdown.append({"label": row["label"], **fact})
    if breakdown:
        assert sum(row["amount"] for row in breakdown) == account["amount"], account
    return {
        "code": account["code"],
        "label": account["label"],
        "category": account["category"],
        **export_fact(account, documents),
        **({"note": account["note"]} if "note" in account else {}),
        "breakdown": breakdown,
    }


def attach_supplement(payload: dict, view: dict, documents: dict) -> None:
    """Reconcile the chart accounts to the printed gross total and later decisions."""
    base = {
        node["code"]: node["amount"]
        for node in payload["nodes"]
        if node["tier"] == "mission" and node.get("costClass") == "total"
    }
    assert sum(base.values()) == payload["meta"]["total"], payload["meta"]
    accounts = {}
    for account in view["accounts"]:
        code = account["code"]
        assert code not in accounts, code
        assert base.get(code) == account.get("replacesAmount"), account
        accounts[code] = export_account(account, documents)

    total = sum((base | {code: row["amount"] for code, row in accounts.items()}).values())
    control = export_fact(view["publishedTotal"], documents)
    adjustments = [
        {
            "amount": accounts[revision["code"]]["amount"] - revision["previousAmount"],
            "previous": source_reference(revision["previousCitation"], documents),
            "source": accounts[revision["code"]]["source"],
        }
        for revision in view.get("adjustments", [])
    ]
    assert total == control["amount"] + sum(row["amount"] for row in adjustments), (
        payload["meta"]["fiscalYear"], payload["meta"]["measure"], total, control, adjustments
    )
    payload["peacekeepingSupplement"] = {
        "accounts": list(accounts.values()),
        "publishedTotal": control,
        "inKind": export_fact(view["inKind"], documents),
        **({"adjustments": adjustments} if adjustments else {}),
    }
    # Keep the release's tree as source detail. The stage total covers both inputs.
    payload["meta"]["total"] = total
    payload["meta"]["scopeLabel"] = "Peacekeeping accounts in the consolidated UN budget tables"
    payload["meta"]["scopeWarning"] = (
        "Gross resources for the displayed accounts. Budgeted voluntary contributions in kind "
        "are reported separately. Mission and account detail follows the cited documents."
    )
    payload["meta"]["partial"] = False
    coverage = payload["meta"].setdefault("coverage", {})
    displayed = set(base) | {
        code for code, row in accounts.items() if row["category"] != "support_account"
    }
    unavailable = set(coverage.get("noPublishedValueForLens", ())) - displayed
    coverage.update({
        "missionsInCycleReference": max(
            coverage.get("missionsInCycleReference", 0), len(displayed | unavailable)
        ),
        "missionsDisplayed": len(displayed),
        "displayedMissionCodes": sorted(displayed),
        "noPublishedValueForLens": sorted(unavailable),
        "completeness": "complete_for_published_lens",
    })


def build_approved_summary(year: int, view: dict, documents: dict) -> dict:
    """Build the approved lens from the UN's consolidated annex when detail is unavailable."""
    control = source_reference(view["publishedTotal"]["citation"], documents)
    nodes = []
    support = []
    for source_account in view["accounts"]:
        account = export_account(source_account, documents)
        code = account["code"]
        if account["category"] == "support_account":
            support.append(source_account)
            continue
        nodes.append({
            "id": code, "parentId": "all-missions", "tier": "mission", "kind": "mission",
            "code": code, "label": account["label"], "amount": account["amount"],
            "basis": "directly_printed", "mission": code, "costClass": "total", "source": account["source"],
        })
        for row in account["breakdown"]:
            key = MISSION_CLASSES[row["label"]]
            nodes.append({
                "id": f"{code}~{key}", "parentId": code, "tier": "class", "kind": "class",
                "code": key, "label": row["label"], "amount": row["amount"],
                "basis": "directly_printed", "mission": code, "costClass": key, "source": row["source"],
            })
    total = sum(node["amount"] for node in nodes if node["tier"] == "mission")
    fiscal_year = f"{year}/{(year + 1) % 100:02}"
    payload = {
        "meta": {
            "stream": "pko", "title": "Peacekeeping operations",
            "label": f"Peacekeeping appropriation {fiscal_year} (USD)",
            "cycle": year, "measure": "appropriation", "year": year, "fiscalYear": fiscal_year,
            "currency": "USD", "total": total,
            "source": {"repo": "United Nations", "release": control["symbol"], "url": control["url"]},
        },
        "nodes": [{
            "id": "all-missions", "parentId": None, "tier": "whole", "kind": "whole",
            "code": None, "label": "Peacekeeping missions and support entities",
            "amount": total, "basis": "sum_of_published_accounts",
        }, *nodes],
    }
    attach_supplement(payload, {**view, "accounts": support}, documents)
    return payload
