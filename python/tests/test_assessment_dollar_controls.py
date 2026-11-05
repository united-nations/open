"""Independent printed dollar totals must catch corruption that rates cannot."""
from pathlib import Path
import sys
import unittest

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from regular_budget_assessment_controls import printed_assessment_control, validate_assessment_dollars


class AssessmentDollarControlTests(unittest.TestCase):
    def document(self, year=2026, totals=1):
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text((50, 30), 'Working capital fund')
        page.insert_text((50, 50), 'Total')
        page.insert_text((300, 50), '100.000')
        page.insert_text((500, 50), '999')
        page = doc.new_page()
        page.insert_text((50, 30), 'B. Contributions by Member States')
        page.insert_text((300, 50), 'Gross contributions', fontsize=8)
        page.insert_text((480, 50), 'Net contributions', fontsize=8)
        for i in range(totals):
            page.insert_text((50, 100 + i * 20), 'Total', fontsize=8)
            page.insert_text((300, 100 + i * 20), '100.000', fontsize=8)
            # Cover leading billion digit left of the producer's row cutoff.
            page.insert_text((497, 100 + i * 20), '3 262 963 498', fontsize=8)
        return doc

    def test_selects_matching_table_and_full_rightmost_amount(self):
        result = printed_assessment_control(self.document(), 2026)
        self.assertEqual(result, {'amount': 3262963498, 'pdfPage': 2,
                                  'column': 'Total contributions'})

    def test_post_2025_column_includes_peacebuilding_fund(self):
        self.assertEqual(printed_assessment_control(self.document(), 2024)['column'], 'Net contributions')
        self.assertEqual(printed_assessment_control(self.document(), 2025)['column'], 'Total contributions')

    def test_missing_or_ambiguous_printed_controls_fail_closed(self):
        for count in (0, 2):
            with self.subTest(count=count), self.assertRaises(ValueError):
                printed_assessment_control(self.document(totals=count), 2026)

    def test_changed_amount_fails_even_when_rates_and_computed_total_agree(self):
        control = {'amount': 100, 'pdfPage': 2, 'column': 'Total contributions'}
        rows = {'A': {'assessment_amount': 60, 'assessment_rate': 60},
                'B': {'assessment_amount': 40, 'assessment_rate': 40}}
        validate_assessment_dollars(rows, control, 2026)
        rows['A']['assessment_amount'] += 1
        with self.assertRaisesRegex(ValueError, 'dollar rows total 101'):
            validate_assessment_dollars(rows, control, 2026)


if __name__ == '__main__':
    unittest.main()
