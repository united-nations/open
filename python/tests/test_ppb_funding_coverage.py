import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ppb_funding_coverage import validate_section1_funding

ROOT = Path(__file__).resolve().parents[2]


class PPBFundingCoverageTest(unittest.TestCase):
    def fixture(self):
        cell = "ppb2027:section1-xb"
        section = {"treeNodeId": "section:1", "chartTier": "section", "code": "1"}
        unit = {"treeNodeId": "eosg", "parentTreeNodeId": "section:1", "chartTier": "budget_unit",
                "label": "Executive Office of the Secretary-General",
                "values": {"extrabudgetary": {"total": {"money": None}}}}
        observation = {"observationId": cell, "citationId": cell,
                       "lens": {"currency": "USD", "measure": "expenditure", "dataYear": 2025,
                                "fundingSource": "extrabudgetary"},
                       "sourceContext": {"section": "1", "entity": "1. Executive Office of the Secretary-General",
                                         "tableKind": "financial_by_component", "isTotal": True},
                       "money": {"amountExact": "34180200"}}
        return ({"lens": {"edition": 2027}, "nodes": [section, unit]},
                {"citations": [{"citationId": cell, "rowLabel": "Subtotal, 3"}],
                 "observations": [observation]})

    def test_rejects_absent_and_false_zero_controls(self):
        for money in [None, {"amountExact": "0"}]:
            view, financial = self.fixture()
            view["nodes"][1]["values"]["extrabudgetary"]["total"]["money"] = money
            with self.assertRaisesRegex(ValueError, "Section 1 loses extrabudgetary"):
                validate_section1_funding(view, financial)

    def test_accepts_source_control_and_preserves_inputs(self):
        view, financial = self.fixture()
        view["nodes"][1]["values"]["extrabudgetary"]["total"]["money"] = {"amountExact": "34180200"}
        before = copy.deepcopy((view, financial))
        validate_section1_funding(view, financial)
        self.assertEqual((view, financial), before)

    def test_all_reviewed_missing_controls_are_restored(self):
        data = json.loads((ROOT / "public/data/budget-ppb-expenditure-2025.json").read_text())
        import csv
        from decimal import Decimal
        with (ROOT / "docs/data-quality/ppb-funding-coverage-audit.csv").open() as handle:
            controls = list(csv.DictReader(handle))
        units = {n["label"].casefold(): n for n in data["nodes"] if n["tier"] == "budget_unit"}
        from ppb_funding_coverage import entity_key
        units = {entity_key(name): node for name, node in units.items()}
        self.assertEqual(len(controls), 26)
        for row in controls:
            node = units[entity_key(row["entity"])]
            self.assertEqual(Decimal(str(node["values"][row["funding_source"]])), Decimal(row["amount_usd"]))
        section = next(n for n in data["nodes"] if n["id"] == "section-1")
        self.assertEqual(section["amount"], 224719800)
        self.assertEqual(data["meta"]["publishedUsdTotal"], 12085071200)

    def test_unreported_section_stream_stays_unavailable(self):
        data = json.loads((ROOT / "public/data/budget-ppb-expenditure-2025.json").read_text())
        for node in data["nodes"]:
            if node["id"] in {"section-2", "section-2~section-wide-allocations"}:
                self.assertNotIn("other_assessed", node["values"])
                self.assertNotIn("other_assessed", node["metricValues"]["expenditure"])
