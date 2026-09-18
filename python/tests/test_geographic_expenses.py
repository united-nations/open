"""Geographic export must preserve independent reported amounts across all years."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import pandas as pd
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
spec = importlib.util.spec_from_file_location('geographic_export', ROOT / 'python/20-export_geographic_expenses.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class GeographicTests(unittest.TestCase):
    def test_every_year_preserves_source_totals_and_levels(self):
        source = pd.read_csv(ROOT / 'data/ceb/clean/expenses_by_country_region_sub_agency.csv')
        for year, frame in source.groupby('calendar_year'):
            rows = json.loads((ROOT / f'public/data/geographic-expenses-{year}.json').read_text())
            self.assertEqual(len(rows), len({r['iso3'] for r in rows}))
            self.assertAlmostEqual(sum(r['total'] for r in rows), frame.amount.sum(), places=3)
            for row in rows:
                self.assertAlmostEqual(row['total'], sum(row['entities'].values()), places=4)
            for kind, level in [('COU', 'country'), ('SUB', 'subregion')]:
                self.assertAlmostEqual(sum(r['total'] for r in rows if r['level'] == level), frame.loc[frame.location_type == kind, 'amount'].sum(), places=3)
            self.assertTrue(all(r['notes'] for r in rows if r['level'] != 'country'))

    def test_unknown_countries_stay_distinct_and_corrections_are_flagged(self):
        source = pd.DataFrame([
            {'calendar_year': 2024, 'agency': 'UN', 'country/territory': name, 'region': 'Africa', 'location_type': kind, 'amount': amount}
            for name, kind, amount in [('Unknown A', 'COU', 100), ('Unknown B', 'COU', -5), ('Eastern Europe', 'SUB', 10), ('Türkiye', 'SUB', 20)]
        ])
        with patch.object(module.expenses, 'get_iso3', return_value='not found'):
            rows = module.build_geography(source)[2024]
        self.assertEqual(len(rows), 4)
        self.assertEqual(sum(r['total'] for r in rows), 125)
        for row in rows:
            self.assertTrue(row['notes'])
            if row['level'] == 'subregion':
                self.assertNotEqual(row['region'], 'Africa')
                self.assertTrue(any('conflict' in note for note in row['notes']))

    def test_unallocated_sdgs_match_source(self):
        source = pd.read_csv(ROOT / 'data/ceb/clean/expenses_sdgs.csv')
        for year, frame in source.groupby('calendar_year'):
            exported = json.loads((ROOT / f'public/data/sdg-expenses-{year}.json').read_text())
            self.assertAlmostEqual(exported['unallocated']['total'], frame.loc[frame.sdg_goal.str.lower() == 'x00', 'amount'].sum(), places=3)
            self.assertAlmostEqual(sum(r['total'] for r in exported.values()), frame.amount.sum(), places=3)

if __name__ == '__main__':
    unittest.main()
