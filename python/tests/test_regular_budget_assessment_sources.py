"""Assessment row citations use physical PDF pages, independently of page labels."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import pymupdf

MODULE_PATH = Path(__file__).resolve().parents[1] / "13-export_regular_budget_contributors.py"
SPEC = importlib.util.spec_from_file_location("regular_budget_contributor_export", MODULE_PATH)
assert SPEC and SPEC.loader
exporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(exporter)


class AssessmentSourcePageTests(unittest.TestCase):
    def test_member_rows_keep_physical_page_across_table_continuation(self) -> None:
        document = pymupdf.open()
        document.new_page().insert_text((50, 50), "Assessment circular cover")
        for start, stop in [(0, 100), (100, 193)]:
            page = document.new_page(width=620, height=1100)
            page.insert_text((50, 30), "B. Contributions by Member States", fontsize=8)
            page.insert_text((300, 50), "Gross contributions", fontsize=8)
            page.insert_text((480, 50), "Net contributions", fontsize=8)
            page.insert_text((50, 70), "Member State", fontsize=8)
            for index in range(start, stop):
                baseline = 90 + (index - start) * 9
                # Alphabetic names avoid introducing a numeric row-index field.
                suffix = chr(65 + index // 26) + chr(65 + index % 26)
                page.insert_text((50, baseline), f"Country {suffix}", fontsize=7)
                page.insert_text((310, baseline), "4.000" if index == 192 else "0.500", fontsize=7)
                page.insert_text((520, baseline), str(1000 + index), fontsize=7)
            page.insert_text((50, 1050), "Printed page 999", fontsize=8)
            if stop == 193:
                page.insert_text((50, 1025), "Total", fontsize=7)
                page.insert_text((310, 1025), "100.000", fontsize=7)
                page.insert_text((520, 1025), str(sum(range(1000, 1193))), fontsize=7)
        with patch.object(exporter, "fetch", return_value=SimpleNamespace(content=document.tobytes())):
            rows = exporter.parse_assessment_document(2026, "ST/ADM/SER.B/test")
        self.assertEqual(len(rows), 193)
        self.assertEqual(rows["Country AA"], {
            "assessment_rate": 0.5, "assessment_amount": 1000, "pdfPage": 2})
        self.assertEqual(rows["Country DV"]["pdfPage"], 2)
        self.assertEqual(rows["Country DW"]["pdfPage"], 3)
        self.assertEqual(rows["Country HK"], {
            "assessment_rate": 4.0, "assessment_amount": 1192, "pdfPage": 3})


if __name__ == "__main__":
    unittest.main()
