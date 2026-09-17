"""Regression tests for trust-fund frontend export rules."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trust_fund_frontend_exports import (  # noqa: E402
    financial_position,
    canonical_counterparty,
    is_adjustment,
    selected_funding_rows,
    build_entity_export,
    flow_breakdown,
    row_references,
    selected_contribution_rows,
)


class TrustFundFrontendExportTests(unittest.TestCase):
    def test_financial_position_uses_current_year_stocks_and_pdf_rows(self) -> None:
        rows = []
        for period, line, amount, page in [
            (2023, "Cash and cash equivalents", 999, 8),
            (2024, "Cash and cash equivalents", 10, 9),
            (2024, "Voluntary contributions receivable", 20, 9),
            (2024, "Voluntary contributions receivables", 30, 10),
            (2024, "Total net assets", -5, 10),
        ]:
            rows.append({"calendar_year": 2024, "period_year": period,
                         "statement_type": "financial_position", "fund_code": "ABC",
                         "line_item": line, "reported_line_item": line,
                         "amount_usd": amount, "page": page, "schedule_number": "1"})
        facts = pd.DataFrame(rows)
        source = {"symbol": "A/79/5", "landing_page_url": "https://example.org/source"}
        position = financial_position(2024, facts, ["ABC"], source)
        metrics = {row["key"]: row for row in position["metrics"]}
        self.assertEqual(metrics["cash"]["amount"], 10)
        self.assertEqual(metrics["contributionsReceivable"]["amount"], 50)
        self.assertEqual(metrics["netAssets"]["amount"], -5)
        self.assertIsNone(metrics["investments"]["amount"])
        self.assertEqual([r["pdfPage"] for r in metrics["contributionsReceivable"]["supportingSources"]], [9, 10])
        self.assertIn("Financial position", metrics["cash"]["supportingSources"][0]["tableTitle"])
        same_page = facts.copy()
        same_page["section"] = "Assets > Current assets"
        same_page.loc[same_page.page.eq(10), "section"] = "Assets > Non-current assets"
        same_page["page"] = 9
        same_page.loc[same_page.line_item.str.contains("receivabl"), "reported_line_item"] = "Voluntary contributions receivable"
        same_page_position = financial_position(2024, same_page, ["ABC"], source)
        receivables = next(row for row in same_page_position["metrics"] if row["key"] == "contributionsReceivable")
        self.assertEqual(len(receivables["supportingSources"]), 2)
        self.assertEqual(receivables["components"], [{"label": "Current", "amount": 20}, {"label": "Non-current", "amount": 30}])
        partial = financial_position(2024, facts, ["ABC", "MISSING"], source)
        self.assertTrue(all(row["amount"] is None for row in partial["metrics"]))
        incomplete = financial_position(2024, facts.loc[facts.page.ne(10)], ["ABC"], source)
        self.assertIsNone(next(row for row in incomplete["metrics"] if row["key"] == "contributionsReceivable")["amount"])

    def test_unnamed_aggregate_and_discount_adjustment_remain_distinct(self) -> None:
        self.assertEqual(canonical_counterparty("Other donors"),
                         "Other contributors (not individually identified)")
        self.assertFalse(is_adjustment("Other donors"))
        self.assertTrue(is_adjustment("Add/(Less): Discounting of Non-Current Receivable"))

    def test_contributor_rows_stop_at_statement_matching_total(self) -> None:
        flows = pd.DataFrame(
            [
                {
                    "calendar_year": 2022,
                    "fund_code": "DDN",
                    "flow_type": "voluntary_contribution",
                    "page": 1,
                    "source_y": 100,
                    "source_row_index": 1,
                    "counterparty": "Government A",
                    "is_total": False,
                    "total_usd": 90,
                },
                {
                    "calendar_year": 2022,
                    "fund_code": "DDN",
                    "flow_type": "voluntary_contribution",
                    "page": 1,
                    "source_y": 110,
                    "source_row_index": 2,
                    "counterparty": "Total",
                    "is_total": True,
                    "total_usd": 90,
                },
                {
                    "calendar_year": 2022,
                    "fund_code": "DDN",
                    "flow_type": "voluntary_contribution",
                    "page": 1,
                    "source_y": 120,
                    "source_row_index": 3,
                    "counterparty": "UNDP MPTF",
                    "is_total": False,
                    "total_usd": 400,
                },
            ]
        )
        statements = pd.DataFrame(
            [
                {
                    "calendar_year": 2022,
                    "period_year": 2022,
                    "fund_code": "DDN",
                    "statement_type": "financial_performance",
                    "line_item": "Voluntary contributions",
                    "amount_usd": 90,
                }
            ]
        )
        selected, reconciliation = selected_contribution_rows(
            2022, flows, statements
        )
        self.assertEqual(selected["counterparty"].tolist(), ["Government A"])
        self.assertEqual(reconciliation.iloc[0]["residual_usd"], 0)

    def test_aggregate_references_keep_physical_pages_and_reported_rows(self) -> None:
        rows = pd.DataFrame([
            {"fund_code": "AAA", "page": 8, "reported_line_item": "Total expenses",
             "schedule_number": "1.1"},
            {"fund_code": "BBB", "page": 19, "reported_line_item": "Total expenses",
             "schedule_number": "2.1"},
        ])
        source = {"symbol": "Schedule", "landing_page_url": "https://example.org/record",
                  "pdf_final_url": "https://example.org/document.pdf"}
        references = row_references(rows, source, 2023)
        self.assertEqual([reference["pdfPage"] for reference in references], [8, 19])
        self.assertEqual([reference["columnHeader"] for reference in references], ["2023", "2023"])
        self.assertTrue(all(reference["url"].endswith(".pdf") for reference in references))
        self.assertEqual(len(row_references(pd.concat([rows, rows]), source, 2023)), 2)

    def test_transfers_are_disjoint_and_receivables_are_excluded(self) -> None:
        common = {"calendar_year": 2024, "fund_code": "AAA", "page": 3,
                  "schedule_number": "1.1", "is_total": False}
        rows = [
            {"counterparty": "Country A", "flow_type": "voluntary_contribution", "total_usd": 100},
            {"counterparty": "Total", "flow_type": "voluntary_contribution", "total_usd": 100, "is_total": True},
            # A continuation transfer row parsed under the preceding table layout.
            {"counterparty": "UNDP MPTF", "flow_type": "voluntary_contribution", "refunds_transfers_adjustments_usd": 40},
            {"counterparty": "Total", "flow_type": "voluntary_contribution", "refunds_transfers_adjustments_usd": 40, "is_total": True},
            {"counterparty": "From/(To) Fund B", "flow_type": "other_transfer_allocation_internal_transfers", "total_usd": -5},
            {"counterparty": "Country A", "flow_type": "voluntary_contribution_receivable", "total_usd": 900},
        ]
        flows = pd.DataFrame([{**common, **row, "source_y": i * 10, "source_row_index": i} for i, row in enumerate(rows)])
        facts = pd.DataFrame([
            {"calendar_year": 2024, "period_year": 2024, "fund_code": "AAA", "statement_type": "financial_performance", "line_item": label, "amount_usd": amount}
            for label, amount in [("Voluntary contributions", 100), ("Other transfers and allocations", 35)]
        ])
        selected, reconciliation = selected_funding_rows(2024, flows, facts)
        self.assertEqual(len(selected), 3)
        self.assertEqual(selected.effective_amount_usd.sum(), 135)
        self.assertEqual(reconciliation.residual_usd.abs().sum(), 0)
        self.assertEqual(selected.iloc[1].flow_type, "other_transfer_allocation_contributions")
        self.assertEqual(selected.iloc[2].flow_type, "other_transfer_allocation_internal_transfers")
        self.assertEqual(canonical_counterparty("UNDP MPTF"), canonical_counterparty("UNDP Multi-Partner Trust Fund - MPTF"))

    def test_missing_mapping_does_not_drop_funds_or_signed_expenses(self) -> None:
        facts = pd.DataFrame([
            {"calendar_year": 2024, "period_year": 2024, "fund_code": code,
             "statement_type": "financial_performance", "line_item": "Total expenses",
             "reported_line_item": "Total expenses", "amount_usd": value, "page": 2, "schedule_number": "1"}
            for code, value in [("AAA", 100), ("BBB", -5), ("CCC", 0)]
        ])
        crosswalk = pd.DataFrame([{"fund_code": "AAA", "fund_name": "Fund A",
                                  "approved_for_aggregation": True, "audited_entity_code": "ENTITY"}])
        funds = pd.DataFrame([{"fund_code": code, "fund_name": name} for code, name in [("AAA", "Fund A"), ("BBB", "Fund B"), ("CCC", "Fund C")]])
        result = build_entity_export(2024, facts, crosswalk, {"symbol": "Source", "landing_page_url": "https://example.org"}, {}, funds)
        self.assertEqual(result["meta"]["total"], 95)
        leaves = [node for node in result["nodes"] if node["tier"] == "detail"]
        self.assertEqual(len(leaves), 3)
        missing = next(node for node in leaves if node["code"] == "BBB")
        self.assertEqual(missing["label"], "Fund B")
        self.assertEqual(missing["parentId"], "trust-fund-entity:UNMAPPED")
        self.assertIn("missing", missing["note"])

    def test_flow_categories_split_source_rows_without_duplicating_amounts(self) -> None:
        rows = pd.DataFrame([
            {"flow_type": kind, "counterparty_group": group, "effective_amount_usd": amount,
             "fund_code": "AAA", "counterparty": "Same contributor", "page": page,
             "schedule_number": "1", "total_usd": amount}
            for kind, group, amount, page in [
                ("voluntary_contribution", "Government", 10, 1),
                ("voluntary_contribution", "Others", -2, 2),
                ("other_transfer_allocation_contributions", None, 30, 3),
                ("other_transfer_allocation_internal_transfers", None, 4, 4),
            ]
        ])
        groups = flow_breakdown(rows, {"symbol": "Source", "landing_page_url": "https://example.org"}, 2024)
        self.assertEqual([g["group"] for g in groups], ["governments", "other", "inter_organizational", "internal"])
        self.assertEqual(sum(g["amount_usd"] for g in groups), 42)
        self.assertEqual([g["supportingSources"][0]["pdfPage"] for g in groups], [1, 2, 3, 4])

    def test_known_case_and_typo_variants_collapse(self) -> None:
        self.assertEqual(
            canonical_counterparty("United States Of America"),
            "United States of America",
        )
        self.assertEqual(canonical_counterparty("Europena Union"), "European Union")


if __name__ == "__main__":
    unittest.main()
