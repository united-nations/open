"""Independent-dimension reconciliation and preservation of source limitations."""
import importlib.util
import sys
import unittest
from pathlib import Path

import pandas as pd
from ceb_data import select_geographic_totals, select_sdg_expenses

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
spec = importlib.util.spec_from_file_location('flow_export', ROOT / 'python/19-export_system_flows.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FlowTests(unittest.TestCase):
    def test_corrected_geography_retains_source_codes_and_discloses_change(self):
        totals = pd.DataFrame([dict(calendar_year=2024, agency='UN', amount=100)])
        geography = pd.DataFrame([
            {'calendar_year': 2024, 'agency': 'UN', 'amount': 70, 'location_type': 'COU', 'country/territory': 'Southern Africa', 'region': 'Africa'},
            {'calendar_year': 2024, 'agency': 'UN', 'amount': 30, 'location_type': 'COU', 'country/territory': 'South Africa', 'region': 'Africa'},
        ])
        goals = pd.DataFrame([dict(calendar_year=2024, entity_code='UN', amount=100, sdg_goal='1')])
        rows = module.build_export(totals, geography, goals)['data'][0]['entities']['UN Secretariat']['geography']
        corrected = next(row for row in rows if row['label'] == 'Southern Africa')
        country = next(row for row in rows if row['label'] == 'South Africa')
        self.assertEqual(corrected['kind'], 'subregion')
        self.assertEqual(corrected['sourceLocationTypes'], ['COU'])
        self.assertIn('corrected to SUB', corrected['note'])
        self.assertEqual(country['kind'], 'country')
        self.assertEqual(country['sourceLocationTypes'], ['COU'])
        self.assertIsNone(country['note'])
        self.assertEqual(sum(row['amount'] for row in rows), 100)

    def test_signed_amounts_unallocated_and_missing_reports(self):
        totals = pd.DataFrame([dict(calendar_year=2024, agency='UN', amount=100)])
        geography = pd.DataFrame([
            {'calendar_year': 2024, 'agency': 'UN', 'amount': 80, 'location_type': 'COU', 'country/territory': 'France', 'region': 'Europe'},
            {'calendar_year': 2024, 'agency': 'UN', 'amount': -10, 'location_type': 'REG', 'country/territory': 'Global', 'region': 'Global'},
        ])
        goals = pd.DataFrame([
            dict(calendar_year=2024, entity_code='UN', amount=75, sdg_goal='1'),
            dict(calendar_year=2024, entity_code='UN', amount=10, sdg_goal='x00'),
            dict(calendar_year=2024, entity_code='UN', amount=5, sdg_goal='X00'),
        ])
        e = module.build_export(totals, geography, goals)['data'][0]['entities']['UN Secretariat']
        self.assertEqual(e['geographyDifference'], 30)
        self.assertEqual(e['goalsDifference'], 10)
        self.assertEqual(next(g['amount'] for g in e['goals'] if g['key'] == 'unallocated'), 15)
        self.assertTrue(any(g['amount'] < 0 for g in e['geography']))

    def test_all_source_years_reconcile_independently(self):
        sources = [pd.read_csv(ROOT / 'data/ceb/clean' / name) for name in (
            'expenses_sub_agency.csv', 'expenses_by_country_region_sub_agency.csv', 'expenses_sdgs.csv')]
        sources[1] = select_geographic_totals(sources[1])
        sources[2] = select_sdg_expenses(sources[2])
        result = module.build_export(*sources)
        self.assertEqual(result['meta']['years'], list(range(2018, 2025)))
        self.assertEqual(result['meta']['geographicAnomalyCount'], 0)
        for year in result['data']:
            for dimension, source in [('geography', sources[1]), ('goals', sources[2])]:
                expected = source[source.calendar_year == year['year']].amount.sum()
                actual = sum(sum(r['amount'] for r in e[dimension]) for e in year['entities'].values())
                self.assertAlmostEqual(actual, expected, places=3)
                for e in year['entities'].values():
                    if e['total'] is not None:
                        self.assertAlmostEqual(sum(r['amount'] for r in e[dimension]) + e[dimension + 'Difference'], e['total'], places=4)
        # DPO is the 2023 SDG alias of UN-DPO. UNRISD is a 2018 UN
        # sub-agency, not a separate organization in the spending backbone.
        self.assertNotIn('DPO', result['data'][-2]['entities'])
        # Geography now reports UNRISD separately, while its SDGs still roll
        # into the expense-source parent. Preserve that source distinction.
        self.assertIsNone(result['data'][0]['entities']['UNRISD']['total'])
        self.assertAlmostEqual(sum(g['amount'] for g in result['data'][0]['entities']['UN Secretariat']['goals']), 2207230)
        # Source-only reporters may have no backbone control; retain them explicitly.
        self.assertTrue(all(e['geographyDifference'] is None for y in result['data'] for e in y['entities'].values() if e['total'] is None))
        self.assertTrue(all(r['label'] for y in result['data'] for e in y['entities'].values() for r in e['geography']))
        women = result['data'][-1]['entities']['UN Women']
        anomalies = [r for r in women['geography'] if r['note'] and 'classification is inconsistent' in r['note']]
        # The new source no longer reports these two records as subregions of Africa.
        self.assertEqual(anomalies, [])


if __name__ == '__main__':
    unittest.main()
