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
    def test_contributor_and_discount_rows_are_not_headers(self) -> None:
        for label, amount in [
            ("Other donors", "2 486 433"),
            ("Other donors", "(1 695 000)"),
            ("Add/(Less): Discounting of Non-Current Receivable", "29 849"),
        ]:
            with self.subTest(label=label, amount=amount):
                table = {
                    "table_id": "regression", "calendar_year": 2024,
                    "recid": 4087012, "page": 356, "schedule_number": "1",
                    "fund_code": "CCS", "table_kind": "voluntary_contribution",
                    "columns": ["counterparty", "total"],
                    "rows": [{"counterparty": label, "total": amount, "y": 100}],
                }
                result = schedules.normalize_flow_table(table)
                self.assertEqual(len(result), 1)
                self.assertEqual(result[0]["counterparty"], label)
                self.assertEqual(result[0]["total_usd"], schedules.parse_amount(amount)[0])
        for label in ["Donor", "(United States dollars) Donor", "Current", "Non-Current", "Total as at 31 December 2024"]:
            self.assertTrue(schedules.is_flow_header(label))

    def flow_table(self, rows: list[dict]) -> dict:
        return {
            "table_id": "regression", "calendar_year": 2022,
            "recid": 4017052, "page": 305, "schedule_number": "4.8.1",
            "fund_code": "DXA", "table_kind": "voluntary_contribution",
            "columns": ["counterparty", "monetary", "in_kind", "refunds_transfers_adjustments", "total"],
            "rows": rows,
        }

    def test_year_in_header_is_not_an_amount(self) -> None:
        self.assertEqual(schedules.parse_amount("Total for the year 2022"), (None, False))
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "Internal", "total": "Total for the year 2022"},
            {"y": 110, "counterparty": "Norway", "monetary": "100", "total": "100"},
        ]))
        self.assertEqual(sum(r["total_usd"] for r in rows), 100)

    def test_resolution_year_is_part_of_wrapped_label(self) -> None:
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "Investigative Mechanism pursuant to UNSCR 2235", "monetary": "(2015)"},
            {"y": 110, "counterparty": "(DJA)", "monetary": "-", "in_kind": "-", "refunds_transfers_adjustments": "(721 056)", "total": "(721 056)"},
        ]))
        self.assertEqual(len(rows), 1)
        self.assertIn("2235 (2015) (DJA)", rows[0]["counterparty"])
        self.assertEqual(rows[0]["total_usd"], -721056)

    def test_wrapped_total_completes_preceding_row(self) -> None:
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "From/(To) Technical Cooperation Trust Fund", "monetary": "-", "in_kind": "-", "refunds_transfers_adjustments": "(4 394)", "total": ""},
            {"y": 109, "counterparty": "by UNCTAD (OUN)", "total": "(4 394)"},
        ]))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["total_usd"], -4394)
        self.assertIn("by UNCTAD (OUN)", rows[0]["counterparty"])

    def test_blank_source_name_retains_amount_without_claiming_identity(self) -> None:
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "Government"},
            {"y": 110, "counterparty": "", "monetary": "9 970", "total": "9 970"},
            {"y": 120, "counterparty": "Total", "monetary": "9 970", "total": "9 970"},
        ]))
        self.assertEqual(rows[0]["counterparty"], "Contributor not identified in source")
        self.assertEqual(rows[0]["counterparty_group"], "Government")
        self.assertFalse(rows[0]["is_total"])
        self.assertEqual(rows[0]["total_usd"], 9970)

    def test_low_table_currency_header_does_not_cut_off_contributors(self) -> None:
        document = schedules.ScheduleDocument(
            recid=3984139, calendar_year=2021, publication_year=2022,
            symbol="test", title="test", source_catalog="test",
            landing_page_url="test", source_pdf_url="test",
        )
        physical = [
            row(670, (20, 140, "(United States dollars)")),
            row(680, (20, 50, "Donor")),
            row(690, (20, 60, "Algeria"), (300, 350, "80 000")),
        ]
        result = schedules.make_table(document, 280, "3.41.1", "IDP", "IDEP", "voluntary_contribution", ["counterparty", "total"], physical, [0, 200, 613], 0, 3)
        self.assertEqual(result["rows"][-1]["counterparty"], "Algeria")

    def test_blank_group_subtotal_is_not_a_contributor(self) -> None:
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "Government"},
            {"y": 110, "counterparty": "Norway", "monetary": "100", "total": "100"},
            {"y": 120, "counterparty": "", "monetary": "100", "total": "100"},
            {"y": 130, "counterparty": "Others"},
            {"y": 140, "counterparty": "Foundation", "monetary": "50", "total": "50"},
        ]))
        self.assertEqual(rows[1]["counterparty"], "Total Government")
        self.assertTrue(rows[1]["is_total"])

    def test_split_header_year_is_not_an_unnamed_contributor(self) -> None:
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "", "total": "Total for the year"},
            {"y": 108, "counterparty": "", "total": "2022"},
            {"y": 116, "counterparty": "UNDP", "monetary": "100", "total": "100"},
        ]))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["counterparty"], "UNDP")

    def test_numeric_band_spill_preserves_name_and_amount(self) -> None:
        rows = schedules.normalize_flow_table(self.flow_table([
            {"y": 100, "counterparty": "United Kingdom of Great Britain and Northern", "monetary": "Ireland 19 405", "in_kind": "-", "total": "19 405"},
        ]))
        self.assertEqual(rows[0]["counterparty"], "United Kingdom of Great Britain and Northern Ireland")
        self.assertEqual(rows[0]["monetary_usd"], 19405)
        self.assertEqual(schedules.parse_amount("- 1 532 761"), (1532761, False))
        self.assertEqual(schedules.parse_amount("339 -"), (339, False))

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

    def test_grand_total_is_classified_as_total(self) -> None:
        table = {
            "table_id": "2024-p269-voluntary-contribution-3.34.1-y055",
            "calendar_year": 2024,
            "recid": 4099450,
            "page": 269,
            "schedule_number": "3.34.1",
            "fund_code": "TXB",
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
                    "y": 100,
                    "counterparty": "European Union",
                    "monetary": "4 991 183",
                    "in_kind": "-",
                    "refunds_transfers_adjustments": "-",
                    "total": "4 991 183",
                },
                {
                    "y": 110,
                    "counterparty": "Grand Total",
                    "monetary": "44 233 137",
                    "in_kind": "-",
                    "refunds_transfers_adjustments": "(82 600)",
                    "total": "44 150 537",
                },
            ],
        }
        rows = schedules.normalize_flow_table(table)
        self.assertFalse(rows[0]["is_total"])
        self.assertTrue(rows[1]["is_total"])


if __name__ == "__main__":
    unittest.main()
