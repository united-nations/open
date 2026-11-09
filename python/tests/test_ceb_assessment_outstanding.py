"""CEB outstanding extraction must preserve full dollar cells and source scope."""

import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
spec = importlib.util.spec_from_file_location(
    "ceb_assessment_outstanding", ROOT / "python/26-export_ceb_assessment_outstanding.py"
)
exporter = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = exporter
spec.loader.exec_module(exporter)


class OutstandingAssessmentTests(unittest.TestCase):
    def source(self, second_outstanding="1 568 073 936", dates=True):
        document = pymupdf.open()
        page = document.new_page(width=612, height=792)
        page.insert_text((50, 30), "A/81/408")
        page.insert_text((50, 60), "Table 7")
        page.insert_text((50, 80), "Collection of assessed contributions (2024-2025)")
        page.insert_text((250, 100), "2024")
        page.insert_text((450, 100), "2025")
        rights = [236, 296, 355, 434, 491, 550]
        for x, label in zip((200, 260, 330, 398, 455, 525),
                            ("Percentage", "Percentage", "Amount") * 2):
            page.insert_text((x, 125), label, fontsize=8)
        rows = [
            ("United Nations", ["61.0", "78.0", "760 318 672", "53.0", "75.0", second_outstanding]),
            ("United Nations peacekeeping", ["75.03", "-", "2 261 836 949", "77.44", "-", "2 245 149 570"]),
            ("UNFCCC", ["40", "80", "-", "50", "90", "0"]),
            ("UNFCCC", ["50", "90", "-12", "60", "95", "10 446 432."]),
        ]
        for i, (entity, cells) in enumerate(rows):
            y = 150 + i * 20
            page.insert_text((50, y), entity, fontsize=8)
            for right, cell in zip(rights, cells):
                x = right - pymupdf.get_text_length(cell, fontname="Times-Roman", fontsize=8)
                page.insert_text((x, y), cell, fontname="Times-Roman", fontsize=8)
        page.insert_text((50, 255), "Notes:")
        page.insert_text((50, 275), "(a) The amount outstanding reflects all years, current and prior.", fontsize=8)
        page.insert_text((50, 290), "(b) UNFCCC has two budgets with different membership.", fontsize=8)
        if dates:
            page.insert_text((50, 305), "(c) United Nations peacekeeping amount outstanding is as at 30 June 2025.", fontsize=8)
        page.insert_text((50, 750), "26-13634", fontsize=8)
        content = document.tobytes()
        document.close()
        return content

    def report(self):
        return exporter.Report(2026, "A/81/408", (2024, 2025), (1,), 4, "https://example.test/source.pdf")

    def test_full_dollars_signed_null_and_duplicate_rows_remain_distinct(self):
        result = exporter.extract_report(self.source(), self.report())
        rows = result[2025]["organizations"]
        self.assertEqual(rows[0]["entity"], "UN Secretariat")
        self.assertEqual(rows[0]["outstanding"], 1_568_073_936)
        self.assertEqual(rows[1]["entity"], "Peacekeeping Operations")
        self.assertEqual(rows[1]["asOf"], "2025-06-30")
        self.assertEqual(rows[1]["reportedHeaderAsOf"], "2025-12-31")
        self.assertEqual(rows[1]["asOfBasis"], "table_note")
        self.assertIsNone(result[2024]["organizations"][1]["asOf"])
        self.assertEqual([row["sourceRowOccurrence"] for row in rows[2:]], [1, 2])
        self.assertEqual([row["outstanding"] for row in rows[2:]], [0, 10_446_432])
        self.assertIsNone(result[2024]["organizations"][2]["outstanding"])
        self.assertEqual(result[2024]["organizations"][3]["outstanding"], -12)
        self.assertNotIn("26-13634", result[2025]["source"]["notes"][-1]["text"])
        self.assertEqual(rows[3]["rawOutstanding"], "10 446 432.")

    def test_missing_cells_and_changed_row_count_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "Incomplete Table 7 row"):
            exporter.extract_report(self.source(second_outstanding=""), self.report())
        wrong_rows = exporter.Report(2026, "A/81/408", (2024, 2025), (1,), 3,
                                     "https://example.test/source.pdf")
        with self.assertRaisesRegex(ValueError, "Unexpected Table 7 rows"):
            exporter.extract_report(self.source(), wrong_rows)

    def test_footnotes_keep_source_text_and_select_the_observation_year(self):
        result = exporter.extract_report(self.source(), self.report())
        notes = result[2025]["source"]["notes"]
        self.assertEqual([note["marker"] for note in notes], ["a", "b", "c"])
        self.assertEqual(notes[0]["years"], [2024, 2025])
        self.assertEqual(notes[2]["years"], [2025])
        self.assertEqual(notes[2]["text"],
                         "United Nations peacekeeping amount outstanding is as at 30 June 2025.")
        self.assertEqual(exporter.footnote_years(
            "New organizations reporting from 2021: ISA; and from 2022: IRMCT.",
            (2022, 2023)), [2022, 2023])
        self.assertEqual(exporter.footnote_years(
            "The fiscal year is from 1 July 2022 to 30 June 2023; the amount is as at 30 June 2023.",
            (2022, 2023)), [2023])

    def test_no_partial_export_if_later_source_is_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / "2026.pdf").write_bytes(self.source())
            invalid = exporter.Report(2026, "A/99/999", (2024, 2025), (1,), 4,
                                      "https://example.test/source.pdf")
            output = path / "output"
            with patch.object(exporter, "REPORTS", (self.report(), invalid)):
                with self.assertRaisesRegex(ValueError, "Unexpected report"):
                    exporter.export(path, output)
            self.assertFalse(output.exists())

    def test_review_metadata_is_cited_and_fails_if_source_changes(self):
        result = exporter.extract_report(self.source(), self.report())
        review = {"entity": "Peacekeeping Operations", "year": 2024,
                  "reportedAmount": 2_261_836_949, "kind": "gross",
                  "sourceUrl": "https://example.test/audit.pdf", "pdfPage": 7,
                  "note": "Gross before loss allowance.", "asOf": "2024-06-30"}
        exporter.apply_accounting_reviews(result, [review])
        row = result[2024]["organizations"][1]
        self.assertEqual(row["outstanding"], 2_261_836_949)
        self.assertEqual(row["accountingBasis"]["kind"], "gross")
        self.assertEqual(row["asOf"], "2024-06-30")
        self.assertEqual(row["dateSource"]["pdfPage"], 7)
        self.assertNotIn(exporter.DATE_UNKNOWN_NOTE, row["notes"])
        with self.assertRaisesRegex(ValueError, "no longer matches"):
            exporter.apply_accounting_reviews(result, [{**review, "reportedAmount": 1}])


if __name__ == "__main__":
    unittest.main()
