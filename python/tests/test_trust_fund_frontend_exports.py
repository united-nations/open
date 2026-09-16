"""Regression tests for trust-fund frontend export rules."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trust_fund_frontend_exports import (  # noqa: E402
    canonical_counterparty,
    selected_funding_rows,
    build_entity_export,
    flow_breakdown,
    row_references,
    selected_contribution_rows,
)


class TrustFundFrontendExportTests(unittest.TestCase):
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
