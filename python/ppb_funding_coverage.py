"""Reject the known PPB 2027 Section 1 supplement-order regression.

Compare printed controls to their chart units, rather than accepting a balanced
but incomplete hierarchy. No amount is inferred or patched in the importer.
"""
import re
from decimal import Decimal


def entity_key(label: str) -> str:
    label = re.sub(r"^(?:[IVXLCDM]+|\d+[A-Z]?)[.:]\s*", "", label, flags=re.I)
    return re.sub(r"[^\w]+", " ", label.casefold()).strip()


def validate_section1_funding(view: dict, financial: dict | None) -> None:
    if not financial or view["lens"]["edition"] != 2027:
        return
    section = next((n for n in view["nodes"] if n.get("chartTier") == "section"
                    and str(n.get("code")) == "1"), None)
    if section is None:
        return
    units = {entity_key(n["label"]): n for n in view["nodes"]
             if n.get("parentTreeNodeId") == section["treeNodeId"]
             and n.get("chartTier") == "budget_unit"}
    citations = {c["citationId"]: c for c in financial["citations"]}
    for observation in financial["observations"]:
        lens, context = observation["lens"], observation.get("sourceContext", {})
        citation = citations[observation["citationId"]]
        if not (str(context.get("section")) == "1"
                and context.get("tableKind") == "financial_by_component"
                and context.get("isTotal")
                and re.fullmatch(r"Subtotal,\s*\d+", citation.get("rowLabel") or "")
                and lens["currency"] == "USD" and lens["measure"] == "expenditure"
                and lens["dataYear"] == 2025
                and lens["fundingSource"] in {"other_assessed", "extrabudgetary"}):
            continue
        unit = units.get(entity_key(context.get("entity") or ""))
        if unit is None:
            raise ValueError(f"PPB 2027 Section 1 source entity absent from chart: {context.get('entity')}")
        total = unit["values"][lens["fundingSource"]]["total"]["money"]
        expected = Decimal(observation["money"]["amountExact"])
        if total is None or Decimal(total["amountExact"]) != expected:
            raise ValueError(
                f"PPB 2027 Section 1 loses {lens['fundingSource']} for {unit['label']}: "
                f"source control {observation['observationId']} = {expected} USD. "
                "Rebuild the producer with Section 1 supplemented before parent totals, "
                "then import the corrected financial release or use --local-financial."
            )
