"""Regression controls for complete debtor lists and source reconciliation."""
import importlib.util
import json
import unittest
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("outstanding", ROOT / "python/24-export_regular_budget_outstanding.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class OutstandingTests(unittest.TestCase):
    def test_pdf_country_boundaries_and_both_table_orders(self):
        aliases = MODULE.country_aliases(["Bahamas", "Niger", "Nigeria"])
        self.assertEqual(MODULE.normalize("People’s"), MODULE.normalize("People's"))
        for year, text in [
            (2026, "Bahamas (The)\n435,098\nNiger\n185,391\nNigeria\n4,323,787"),
            (2024, "435,098\nBahamas\n185,391\nNiger\n4,323,787\nNigeria"),
        ]:
            with self.subTest(year=year):
                document = pymupdf.open()
                document.new_page().insert_text((40, 50), text)
                self.assertEqual(MODULE.pdf_debtors(document.tobytes(), 1, year, aliases), {"Bahamas": 435_098, "Niger": 185_391, "Nigeria": 4_323_787})

    def test_published_country_examples_and_cutoffs(self):
        expected = {
            2019: ("2019-10-04", "United States of America", 1_055_324_418),
            2020: ("2020-09-30", "United States of America", 1_089_625_403),
            2021: ("2021-10-08", "United States of America", 1_001_804_450),
            2024: ("2024-09-30", "China", 380_636_257),
            2025: ("2025-09-30", "Mexico", 19_893_126),
            2026: ("2026-09-30", "Mexico", 32_774_307),
        }
        for year, (date, name, amount) in expected.items():
            with self.subTest(year=year):
                data = json.loads((ROOT / f"public/data/regular-budget-outstanding-{year}.json").read_text())
                self.assertEqual(data["meta"]["as_of"], date)
                self.assertEqual(next(row["outstanding_amount"] for row in data["contributors"] if row["name"] == name), amount)

    def test_complete_rosters_and_no_later_honour_roll_inference(self):
        for year, _, _, _, count, _, _ in MODULE.SOURCES:
            with self.subTest(year=year):
                data = json.loads((ROOT / f"public/data/regular-budget-outstanding-{year}.json").read_text())
                rows = data["contributors"]
                self.assertEqual(len({row["name"] for row in rows}), 193)
                self.assertEqual(sum(row["outstanding_amount"] > 0 for row in rows), count)
                self.assertEqual(sum(row["outstanding_amount"] for row in rows), data["meta"]["total_outstanding"])
                self.assertTrue(all(row["basis"] == ("reported_balance" if row["outstanding_amount"] else "complete_list_complement") for row in rows))
        data = json.loads((ROOT / "public/data/regular-budget-outstanding-2026.json").read_text())
        self.assertEqual(next(row["outstanding_amount"] for row in data["contributors"] if row["name"] == "China"), 0)

    def test_known_source_difference_is_not_distributed(self):
        data = json.loads((ROOT / "public/data/regular-budget-outstanding-2021.json").read_text())
        self.assertEqual(data["meta"]["total_outstanding"], 1_254_267_798)
        self.assertEqual(data["meta"]["reported_total"], 1_255_000_000)
        self.assertIsNotNone(data["meta"]["reconciliation_note"])

    def test_validation_rejects_incomplete_and_unreconciled_lists(self):
        roster = [f"State {index}" for index in range(193)]
        with self.assertRaises(ValueError):
            MODULE.validate_debtors({"State 0": 100}, roster, 2, 100, 0)
        with self.assertRaises(ValueError):
            MODULE.validate_debtors({"State 0": 100}, roster, 1, 200, 0)

    def test_parser_preserves_partial_balances_and_punctuation(self):
        for year, _, filename, page, count, _, _ in MODULE.SOURCES:
            source = MODULE.RAW / filename
            with self.subTest(year=year):
                if not source.exists():
                    self.skipTest(f"Download cache absent for {year}; rerun exporter to check original-source parsing")
                roster = [row["name"] for row in json.loads((ROOT / f"public/data/regular-budget-contributors-{year}.json").read_text())["contributors"]]
                aliases = MODULE.country_aliases(roster)
                parsed = MODULE.pptx_debtors(source.read_bytes(), aliases) if filename.endswith("pptx") else MODULE.pdf_debtors(source.read_bytes(), page, year, aliases)
                self.assertEqual(len(parsed), count)
                actual = json.loads((ROOT / f"public/data/regular-budget-outstanding-{year}.json").read_text())
                self.assertEqual(parsed, {row["name"]: row["outstanding_amount"] for row in actual["contributors"] if row["outstanding_amount"]})


if __name__ == "__main__":
    unittest.main()
