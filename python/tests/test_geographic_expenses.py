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
from ceb_data import normalize_frame, normalize_geographic_locations, select_geographic_totals, select_sdg_expenses
from utils import GEOGRAPHIC_AREA_TYPES, canonical_geographic_area, normalize_entity
spec = importlib.util.spec_from_file_location('geographic_export', ROOT / 'python/20-export_geographic_expenses.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class GeographicTests(unittest.TestCase):
    def test_reviewed_areas_are_corrected_without_changing_money_or_countries(self):
        names = [*GEOGRAPHIC_AREA_TYPES, 'South Africa', 'Micronesia (Federated States of)', 'Türkiye', 'Global and Interregional', 'Unknown area']
        source = pd.DataFrame([
            dict(calendar_year=2025, agency='UN', **{'country/territory': name},
                 location_type='REG' if name.startswith('Global') else 'COU',
                 region='Source parent', amount=-5 if index % 2 else 100)
            for index, name in enumerate(names)
        ])
        prepared = normalize_geographic_locations(source)
        pd.testing.assert_frame_equal(prepared.drop(columns=['source_location_type', 'location_type']), source.drop(columns='location_type'), check_exact=True)
        self.assertEqual(prepared.source_location_type.tolist(), source.location_type.tolist())
        for index, name in enumerate(names):
            self.assertEqual(prepared.iloc[index].location_type, GEOGRAPHIC_AREA_TYPES.get(name, source.iloc[index].location_type))
        pd.testing.assert_frame_equal(normalize_geographic_locations(prepared), prepared)
        self.assertEqual(source.location_type.tolist(), ['REG' if name.startswith('Global') else 'COU' for name in names])

    def test_conservative_normalization_preserves_existing_classifications(self):
        source = pd.DataFrame({'country/territory': ['\xa0  eastern  EUROPE ', 'Eastern Europe', 'Northern America', 'Eastern Europe Office'],
                               'location_type': ['COU', 'SUB', 'REG', 'COU']})
        prepared = normalize_geographic_locations(source)
        self.assertEqual(prepared.location_type.tolist(), ['SUB', 'SUB', 'REG', 'COU'])
        self.assertEqual(prepared.source_location_type.tolist(), ['COU', 'SUB', 'REG', 'COU'])
        self.assertEqual(canonical_geographic_area(source.iloc[0]['country/territory']), 'Eastern Europe')
        self.assertIsNone(canonical_geographic_area('Eastern Europe Office'))

    def test_preparation_and_exports_correct_the_entire_historical_source(self):
        raw = pd.read_csv(ROOT / 'data/ceb/raw/expenses_by_country_region_sub_agency.csv')
        prepared = normalize_frame(raw)
        pd.testing.assert_frame_equal(prepared.drop(columns=['source_location_type', 'location_type']), raw.drop(columns='location_type'), check_exact=True)
        self.assertEqual(prepared.source_location_type.tolist(), raw.location_type.tolist())
        known = raw['country/territory'].map(canonical_geographic_area).notna()
        corrected = known & (raw.location_type == 'COU')
        self.assertTrue(corrected.any())
        self.assertFalse(((prepared.location_type == 'COU') & known).any())
        selected = select_geographic_totals(prepared)
        for year, frame in selected.groupby('calendar_year'):
            rows = json.loads((ROOT / f'public/data/geographic-expenses-{year}.json').read_text())
            countries = json.loads((ROOT / f'public/data/country-expenses-{year}.json').read_text())
            self.assertFalse(any(canonical_geographic_area(row['name']) for row in countries))
            for row in rows:
                if canonical_geographic_area(row['name']):
                    self.assertNotEqual(row['level'], 'country')
                    self.assertNotEqual((row['lat'], row['long']), (-52, -135))
            raw_year = raw[(raw.calendar_year == year) & (raw.expenses_type == 'E06')]
            expected = raw_year.groupby(raw_year.agency.map(normalize_entity)).amount.sum()
            actual = {}
            for row in rows:
                for entity, amount in row['entities'].items():
                    actual[entity] = actual.get(entity, 0) + amount
            self.assertEqual(set(actual), set(expected.index))
            for entity, amount in expected.items():
                self.assertAlmostEqual(actual[entity], amount, places=3)
            corrected_names = set(frame.loc[(frame.source_location_type == 'COU') & (frame.location_type != 'COU'), 'country/territory'])
            for name in corrected_names:
                matches = [row for row in rows if row['name'] == canonical_geographic_area(name)]
                self.assertTrue(matches)
                self.assertTrue(any('COU' in row['sourceLocationTypes'] for row in matches))
                self.assertTrue(any(any('classification conflict' in note for note in row['notes']) for row in matches))
            if year in (2024, 2025):
                # The 20 ocean-fallback labels plus two areas previously
                # misresolved by country_converter to real country ISO codes.
                self.assertEqual(len(corrected_names), 22)
                self.assertTrue({'Southern Africa', 'Micronesia'}.issubset(corrected_names))

    def test_every_year_preserves_source_totals_and_levels(self):
        source = select_geographic_totals(pd.read_csv(ROOT / 'data/ceb/clean/expenses_by_country_region_sub_agency.csv'))
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
        source = select_sdg_expenses(pd.read_csv(ROOT / 'data/ceb/clean/expenses_sdgs.csv'))
        for year, frame in source.groupby('calendar_year'):
            exported = json.loads((ROOT / f'public/data/sdg-expenses-{year}.json').read_text())
            self.assertAlmostEqual(exported['non_sdg']['total'], frame.loc[frame.sdg_goal.str.lower() == 'x00', 'amount'].sum(), places=3)
            control = json.loads((ROOT / f'public/data/entity-spending-{year}.json').read_text())
            self.assertAlmostEqual(sum(r['total'] for r in exported.values()), sum(row['amount'] for row in control), places=3)
            self.assertNotIn('unallocated', exported)

if __name__ == '__main__':
    unittest.main()
