"""Focused regression tests for the trust-fund schedule parser."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import trust_fund_schedules as schedules


def row(y: float, *words: tuple[float, float, str]) -> schedules.PhysicalRow:
    return schedules.PhysicalRow(
        y=y,
        words=[(x0, y, x1, y + 10, text) for x0, x1, text in words],
    )


class TrustFundScheduleTests(unittest.TestCase):
    def test_documents_url_preserves_pseudo_symbol_slash(self) -> None:
        symbol = (
            "(DMSPC/OPPFB) FINANCIAL STATEMENTS FOR THE YEAR ENDED 31 DECEMBER 2020"
        )
        url = schedules.documents_access_url(symbol, "pdf")
        self.assertIn("(DMSPC/OPPFB)%20FINANCIAL", url)
        self.assertNotIn("DMSPC%2FOPPFB", url)

    def test_amount_parsing_preserves_sign_and_reported_dash(self) -> None:
        self.assertEqual(
            schedules.parse_amount("1 482 068 475"), (1_482_068_475, False)
        )
        self.assertEqual(schedules.parse_amount("(96 423)"), (-96_423, False))
        self.assertEqual(schedules.parse_amount("-"), (0, True))

    def test_statement_bands_follow_period_headers(self) -> None:
        rows = [
            row(70, (100, 200, "II. Statement of Financial Performance")),
            row(
                100,
                (285, 333, "Schedule"),
                (385, 415, "2018"),
                (480, 510, "2017"),
            ),
            row(120, (50, 100, "Revenue")),
        ]
        boundaries = schedules.statement_boundaries(rows, 0, 2, 2018, 612)
        data = row(
            140,
            (50, 150, "Voluntary contributions"),
            (298, 319, "7.1.1"),
            (378, 388, "26"),
            (390, 405, "709"),
            (408, 423, "687"),
            (473, 483, "27"),
            (486, 501, "322"),
            (503, 518, "003"),
        )
        self.assertEqual(
            schedules.cells_for_bands(data, boundaries),
            ["Voluntary contributions", "7.1.1", "26 709 687", "27 322 003"],
        )

    def test_single_period_statement_uses_current_period_column(self) -> None:
        rows = [
            row(70, (100, 200, "II. Statement of Financial Performance")),
            row(100, (508, 528, "2017")),
            row(120, (50, 100, "Revenue")),
        ]
        boundaries = schedules.statement_boundaries(rows, 0, 2, 2017, 612)
        data = row(140, (50, 100, "Total revenues"), (508, 528, "602"))
        self.assertEqual(
            schedules.cells_for_bands(data, boundaries),
            ["Total revenues", "", "602", ""],
        )

    def test_statement_label_removes_presentation_footnotes(self) -> None:
        self.assertEqual(
            schedules.canonical_statement_label("/a Voluntary contributions ᐟᵇ"),
            "Voluntary contributions",
        )

    def test_unlabelled_final_contribution_total_is_retained(self) -> None:
        table = {
            "table_id": "2023-p297-voluntary-contribution-4.2.1-y074",
            "calendar_year": 2023,
            "recid": 4060617,
            "page": 297,
            "schedule_number": "4.2.1",
            "fund_code": "CER",
            "table_kind": "voluntary_contribution",
            "columns": [
                "counterparty",
                "monetary",
                "in_kind",
                "refunds_transfers_adjustments",
                "total",
            ],
            "rows": [
                {
                    "y": 552.74,
                    "counterparty": "Add/(Less): Present Value Adjustment",
                    "monetary": "-",
                    "in_kind": "-",
                    "refunds_transfers_adjustments": "22 518 424",
                    "total": "22 518 424",
                },
                {
                    "y": 561.78,
                    "counterparty": "",
                    "monetary": "230 030 627",
                    "in_kind": "-",
                    "refunds_transfers_adjustments": "21 018 260",
                    "total": "251 048 887",
                },
            ],
        }
        rows = schedules.normalize_flow_table(table)
        self.assertEqual(rows[-1]["counterparty"], "Total")
        self.assertEqual(rows[-1]["total_usd"], 251_048_887)


if __name__ == "__main__":
    unittest.main()
