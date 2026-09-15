"""Keep monetary selection and page citations tied to the same observations."""
import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("budget_export", Path(__file__).with_name("12-export_budget_json.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class MetricCitationTests(unittest.TestCase):
    def setUp(self):
        self.view = {"lens": {"edition": 2027}}
        self.node = {"kind": "entity", "values": {"regular_budget": {"sourceCitationIds": ["expense"]}}}
        self.financial = {"citations": [], "observations": []}
        for key, measure, year, value, page in [
            ("expense", "expenditure", 2025, 100, 3),
            ("approved", "approved", 2026, 200, 4),
            ("proposed", "proposed", 2027, 300, 5),
            ("wrong-year", "approved", 2024, 400, 6),
        ]:
            self.financial["citations"].append({
                "citationId": key, "tableId": "table", "row": 1,
                "symbol": "A_81_6", "pdfUrl": "https://example.test/report.pdf",
                "pdfPage": page, "rowLabel": "Entity",
                "headerPath": [str(year), measure],
            })
            self.financial["observations"].append({
                "observationId": key, "citationId": key,
                "lens": {"edition": 2027, "currency": "USD", "fundingSource": "regular_budget", "measure": measure, "dataYear": year},
                "money": {"amountExact": str(value)},
            })

    def test_target_column_citation_not_expenditure(self):
        value, references = exporter.metric_value_resolver(self.financial, self.view)
        for measure, expected, page in [("approved", 200, 4), ("proposed", 300, 5)]:
            self.assertEqual(value(self.node, "regular_budget", measure), expected)
            refs = references(self.node, "regular_budget", measure)
            self.assertEqual(len(refs), 1)
            self.assertEqual(refs[0]["pdfPage"], page)
            self.assertIn(measure, refs[0]["columnHeader"])

    def test_ambiguous_observation_is_not_guessed(self):
        duplicate = copy.deepcopy(self.financial["observations"][1])
        duplicate["observationId"] = "duplicate"
        self.financial["observations"].append(duplicate)
        value, references = exporter.metric_value_resolver(self.financial, self.view)
        self.assertIsNone(value(self.node, "regular_budget", "approved"))
        self.assertEqual(references(self.node, "regular_budget", "approved"), [])

    def test_same_source_row_is_counted_once(self):
        self.node["values"]["regular_budget"]["sourceCitationIds"] *= 2
        value, references = exporter.metric_value_resolver(self.financial, self.view)
        self.assertEqual(value(self.node, "regular_budget", "approved"), 200)
        self.assertEqual(len(references(self.node, "regular_budget", "approved")), 1)

    def test_derived_sum_keeps_each_contributing_row(self):
        source = copy.deepcopy(self.financial["citations"][0])
        source.update(citationId="expense-second", row=2)
        target = copy.deepcopy(self.financial["citations"][1])
        target.update(citationId="approved-second", row=2, rowLabel="Second entity", pdfPage=None)
        observation = copy.deepcopy(self.financial["observations"][1])
        observation.update(observationId="approved-second", citationId="approved-second", money={"amountExact": "75"})
        self.financial["citations"].extend([source, target])
        self.financial["observations"].append(observation)
        self.node["values"]["regular_budget"]["sourceCitationIds"].append("expense-second")
        value, references = exporter.metric_value_resolver(self.financial, self.view)
        self.assertEqual(value(self.node, "regular_budget", "approved"), 275)
        refs = references(self.node, "regular_budget", "approved")
        self.assertEqual(len(refs), 2)
        self.assertEqual(refs[1]["pdfPage"], None)
        self.assertNotIn("#page", refs[1]["url"])
        self.assertTrue(all("calculated total" in ref["label"] for ref in refs))

    def test_annual_projection_drops_legacy_and_other_metric_sources(self):
        payload = {"meta": {"edition": 2027, "metrics": {"approved": {"dataYear": 2026}}}, "nodes": [{
            "id": "whole", "parentId": None, "tier": "whole", "amount": 100,
            "source": {"url": "expense"}, "sources": {"regular_budget": {"url": "expense"}},
            "metricValues": {"approved": {"regular_budget": 200, "other_assessed": 8}},
            "metricSources": {"approved": {"regular_budget": [{"url": "approved"}], "other_assessed": [{"url": "other"}]}, "proposed": {"regular_budget": [{"url": "proposed"}]}},
        }]}
        result = exporter.annual_metric_payload(payload, "approved")
        node = result["nodes"][0]
        self.assertEqual(node["amount"], 200)
        self.assertNotIn("source", node)
        self.assertNotIn("sources", node)
        self.assertEqual(node["metricSources"], {"approved": {"regular_budget": [{"url": "approved"}]}})

    def test_rollups_keep_all_supporting_pages_without_changing_values(self):
        nodes = [
            {"id": "whole", "parentId": None, "metricValues": {"proposed": {"regular_budget": 300}}},
            {"id": "section", "parentId": "whole", "metricValues": {"proposed": {"regular_budget": 300}}},
        ]
        for name, value, page in [("first", 100, 4), ("second", 200, 9)]:
            nodes.append({
                "id": name, "parentId": "section",
                "metricValues": {"proposed": {"regular_budget": value}},
                "metricSources": {"proposed": {"regular_budget": [{
                    "url": f"https://example.test/report.pdf#page={page}",
                    "pdfPage": page, "rowLabel": name, "columnHeader": "2027 Proposed",
                }]}},
            })
        before = copy.deepcopy([node["metricValues"] for node in nodes])
        exporter.inherit_metric_sources(nodes)
        self.assertEqual(before, [node["metricValues"] for node in nodes])
        for node in nodes[:2]:
            refs = node["metricSources"]["proposed"]["regular_budget"]
            self.assertEqual([ref["pdfPage"] for ref in refs], [4, 9])
            self.assertTrue(all("calculated total" in ref["label"] for ref in refs))

    def test_printed_control_does_not_inherit_unrelated_child_pages(self):
        direct = [{"url": "https://example.test/control.pdf#page=1"}]
        nodes = [{"id": "parent", "parentId": None,
                  "metricValues": {"approved": {"regular_budget": 10}},
                  "metricSources": {"approved": {"regular_budget": direct}}},
                 {"id": "child", "parentId": "parent",
                  "metricValues": {"approved": {"regular_budget": 20}},
                  "metricSources": {"approved": {"regular_budget": [{"url": "child"}]}}}]
        exporter.inherit_metric_sources(nodes)
        self.assertEqual(nodes[0]["metricSources"]["approved"]["regular_budget"], direct)

    def test_unpublished_metric_never_inherits_another_measure(self):
        nodes = [{"id": "parent", "parentId": None, "metricValues": {"proposed": {}}},
                 {"id": "child", "parentId": "parent", "metricValues": {"approved": {"regular_budget": 0}},
                  "metricSources": {"approved": {"regular_budget": [{"url": "approved"}]}}}]
        exporter.inherit_metric_sources(nodes)
        self.assertNotIn("metricSources", nodes[0])

    def test_zero_expenditure_rollup_retains_negative_and_positive_inputs(self):
        nodes = [{"id": "parent", "parentId": None, "metricValues": {"expenditure": {"regular_budget": 0}}}]
        for name, value in [("credit", -10), ("expense", 10)]:
            nodes.append({"id": name, "parentId": "parent", "metricValues": {"expenditure": {"regular_budget": value}},
                          "metricSources": {"expenditure": {"regular_budget": [{"url": name, "rowLabel": name, "columnHeader": "Expenditure"}]}}})
        exporter.inherit_metric_sources(nodes)
        refs = nodes[0]["metricSources"]["expenditure"]["regular_budget"]
        self.assertEqual([ref["url"] for ref in refs], ["credit", "expense"])
        self.assertEqual(nodes[0]["metricValues"]["expenditure"]["regular_budget"], 0)

    def test_pdf_precision_survives_frontend_projection(self):
        source = self.financial["citations"][0]
        source.update(pagePrecision="row", pageLocatedBy="financial_row_unique")
        result = exporter.citation_source(source)
        self.assertEqual(result["pdfPageScope"], "row")
        self.assertEqual(result["pageLocatedBy"], "financial_row_unique")
        source.pop("pagePrecision")
        self.assertEqual(exporter.citation_source(source)["pdfPageScope"], "table")


if __name__ == "__main__":
    unittest.main()
