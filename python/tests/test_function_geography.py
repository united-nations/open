"""Reported function/geography intersections must reconcile without allocation."""
import importlib.util
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
spec = importlib.util.spec_from_file_location('function_geography_export', ROOT / 'python/21-export_function_geography.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def record(amount=100, **values):
    return {'calendar_year': 2024, 'amount': amount, 'function': 'Development Assistance',
            'country/territory': 'Haiti', 'location_type': 'COU', 'expenses_type': 'E06', **values}


class FunctionGeographyTests(unittest.TestCase):
    def test_totals_do_not_double_count_components_or_lose_corrections(self):
        rows = pd.DataFrame([
            record(100), record(-10), record(999, expenses_type='E06A'),
            record(20, location_type='REG', **{'country/territory': 'Africa'}),
            record(10, location_type='SUB', **{'country/territory': 'Eastern Africa'}),
            record(50, location_type='REG', **{'country/territory': 'Global and Interregional'}),
        ])
        data = module.build_export(rows)[2024]
        self.assertEqual(data['total'], 170)
        self.assertEqual(data['meta']['sourceRows'], 5)
        cells = {cell['level']: cell for cell in data['functions'][0]['geography']}
        self.assertEqual(cells['global']['amount'], 50)
        self.assertEqual(cells['regional']['amount'], 30)
        self.assertEqual(cells['country']['amount'], 90)
        self.assertEqual(cells['country']['negativeAdjustments'], -10)

    def test_existing_geographic_crosswalk_is_reused(self):
        data = module.build_export(pd.DataFrame([record(**{'country/territory': 'Southern Africa'})]))[2024]
        self.assertEqual(next(cell['amount'] for cell in data['functions'][0]['geography'] if cell['level'] == 'regional'), 100)

    def test_incomplete_old_years_are_not_inferred(self):
        data = module.build_export(pd.DataFrame([record(calendar_year=2019, function=None), record()]))
        self.assertEqual(list(data), [2019, 2024])
        self.assertEqual(data[2019]['functions'][0]['key'], 'unreported')
        self.assertEqual(data[2019]['functions'][0]['total'], 100)
        self.assertFalse(data[2019]['meta']['functionAttributionComplete'])

    def test_unresolved_current_dimensions_and_nonfinite_amounts_fail(self):
        for row in [record(function=None), record(function='Unknown'), record(location_type='UNKNOWN'), record(float('inf'))]:
            with self.subTest(row=row), self.assertRaises(ValueError):
                module.build_export(pd.DataFrame([row]))

    def test_actual_source_reconciles_at_every_intersection(self):
        source = pd.read_csv(module.SOURCE)
        selected = module.select_geographic_totals(source)
        exported = module.build_export(source)
        self.assertEqual(list(exported), list(range(2010, 2026)))
        for year, data in exported.items():
            rows = selected[selected.calendar_year == year]
            self.assertAlmostEqual(data['total'], rows.amount.sum(), places=3)
            self.assertEqual(data['meta']['sourceRows'], len(rows))
            self.assertAlmostEqual(data['total'], sum(item['total'] for item in data['functions']), places=3)
            for item in data['functions']:
                members = rows[rows['function'].map(module.CEB_FUNCTIONS).fillna('unreported') == item['key']]
                self.assertAlmostEqual(item['total'], members.amount.sum(), places=3)
                self.assertAlmostEqual(item['total'], sum(cell['amount'] for cell in item['geography']), places=3)
                self.assertAlmostEqual(sum(cell['negativeAdjustments'] for cell in item['geography']), members.loc[members.amount < 0, 'amount'].sum(), places=3)


if __name__ == '__main__':
    unittest.main()
