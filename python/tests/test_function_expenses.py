"""CEB function export safeguards: classification boundary and exact reconciliation."""
import importlib.util
import sys
import unittest
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
spec = importlib.util.spec_from_file_location('function_export', ROOT / 'python/18-export_function_expenses.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FunctionExpenseTests(unittest.TestCase):
    def test_classification_boundary_and_signed_adjustments(self):
        data = pd.DataFrame([
            {'calendar_year': 2017, 'agency': 'UN', 'transaction_type': 'Old category', 'amount': 999},
            {'calendar_year': 2018, 'agency': 'UN', 'transaction_type': 'Development Assistance', 'amount': 100},
            {'calendar_year': 2018, 'agency': 'UN', 'transaction_type': 'Development Assistance', 'amount': -10},
            {'calendar_year': 2018, 'agency': 'UN', 'transaction_type': 'Peace Operations', 'amount': 20},
        ])
        output = module.build_export(data)
        self.assertEqual(output['meta']['years'], [2018])
        row = output['data'][0]
        self.assertEqual(row['total'], 110)
        self.assertEqual(row['functions'], {'development': 90, 'peace': 20})
        self.assertEqual(next(iter(row['entities'].values())), {'development': 90, 'peace': 20})

    def test_unknown_classification_is_not_silently_dropped(self):
        data = pd.DataFrame([{'calendar_year': 2024, 'agency': 'UN', 'transaction_type': 'Unexpected function', 'amount': 100}])
        with self.assertRaises(ValueError):
            module.build_export(data)

    def test_source_reconciles_by_year_and_entity(self):
        source = pd.read_csv(ROOT / 'data/ceb/clean/expenses_sub_agency.csv')
        output = module.build_export(source)
        for row in output['data']:
            with self.subTest(year=row['year']):
                rows = source[source.calendar_year == row['year']]
                self.assertAlmostEqual(row['total'], rows.amount.sum(), places=3)
                self.assertAlmostEqual(row['total'], sum(row['functions'].values()), places=3)
                self.assertAlmostEqual(row['total'], sum(sum(amounts.values()) for amounts in row['entities'].values()), places=3)
                for entity, rows in rows.groupby(rows.agency.map(module.normalize_entity)):
                    self.assertAlmostEqual(sum(row['entities'][entity].values()), rows.amount.sum(), places=3)


if __name__ == '__main__':
    unittest.main()
