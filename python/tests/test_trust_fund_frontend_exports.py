"""Regression tests for trust-fund frontend export rules."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from trust_fund_frontend_exports import (  # noqa: E402
    canonical_counterparty,
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

    def test_known_case_and_typo_variants_collapse(self) -> None:
        self.assertEqual(
            canonical_counterparty("United States Of America"),
            "United States of America",
        )
        self.assertEqual(canonical_counterparty("Europena Union"), "European Union")


if __name__ == "__main__":
    unittest.main()
