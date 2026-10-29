"""CEB release hazards: incomplete attribution, overlapping totals and coverage."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
from ceb_data import normalize_frame, revenue_controls, resolve_reporting_entities, select_geographic_totals, select_sdg_expenses

spec = importlib.util.spec_from_file_location('revenue_refresh', ROOT / 'python/03-fuse_ceb_revenue.py')
revenue = importlib.util.module_from_spec(spec)
spec.loader.exec_module(revenue)


class CebRefreshTests(unittest.TestCase):
    def test_blank_stays_unknown_and_infinity_fails(self):
        frame = normalize_frame(pd.DataFrame({'Calendar Year': [2025], 'USD Amount': [None]}))
        self.assertTrue(frame.amount.isna().all())
        with self.assertRaises(ValueError):
            normalize_frame(pd.DataFrame({'calendar_year': [2025], 'amount': [float('inf')]}))

    def test_missing_donor_uses_unattributed_remainder_with_original_instrument(self):
        controls = pd.DataFrame([dict(calendar_year=2025, agency='UNDP', rev_type='R03E', amount=100)])
        gov = pd.DataFrame([
            dict(calendar_year=2025, entity='UNDP', government_donor='Austria', rev_type='R03E', amount=None),
            dict(calendar_year=2025, entity='UNDP', government_donor='Germany', rev_type='R03E', amount=70),
        ])
        nongov = pd.DataFrame(columns=['calendar_year', 'entity', 'donor', 'contrib_type', 'rev_type', 'amount'])
        ct = pd.DataFrame(columns=['calendar_year', 'entity', 'contrib_type', 'rev_type', 'amount'])
        breakdown = pd.DataFrame(columns=['calendar_year', 'entity', 'sub_entity'])
        expenses = pd.DataFrame(columns=['calendar_year', 'agency', 'sub_agency'])
        sources = {'revenue.csv': controls, 'revenue_sub_agency.csv': controls,
                   'revenue_government_donors.csv': gov, 'revenue_non_gov_donors.csv': nongov,
                   'revenue_contrib_type.csv': ct,
                   'revenue_by_financing_instruments_and_government_contributors.csv': breakdown,
                   'expenses_sub_agency.csv': expenses}
        with patch.object(revenue, 'load', side_effect=lambda name: sources[name].copy()), patch.object(pd.DataFrame, 'to_csv'):
            result = revenue.fuse_revenue()
        self.assertNotIn('Austria', set(result.donor_name))
        residual = result[result.donor_name == 'Unattributed'].iloc[0]
        self.assertEqual(residual.amount, 30)
        self.assertEqual(residual.rev_type, 'R03')
        self.assertEqual(result.amount.sum(), 100)
        self.assertTrue(result.amount.notna().all())
        # A signed discrepancy must not be clipped or reassigned to Other financing.
        gov.loc[1, 'amount'] = 120
        with patch.object(revenue, 'load', side_effect=lambda name: sources[name].copy()), patch.object(pd.DataFrame, 'to_csv'):
            result = revenue.fuse_revenue()
        self.assertEqual(result.loc[result.donor_name == 'Unattributed', 'amount'].iloc[0], -20)

    def test_independent_controls_only_replace_groups_with_missing_amounts(self):
        summary = pd.DataFrame([
            dict(calendar_year=2024, agency='UNRWA', rev_type='R03E', amount=None),
            dict(calendar_year=2024, agency='UNRWA', rev_type='R03E', amount=70),
            dict(calendar_year=2024, agency='UNRWA', rev_type='R02A', amount=20),
        ])
        detail = pd.DataFrame([
            dict(calendar_year=2024, agency='UNRWA', rev_type='R03E', amount=100),
            dict(calendar_year=2024, agency='UNRWA', rev_type='R02A', amount=25),
        ])
        controls = revenue_controls(summary, detail).set_index('rev_type')
        self.assertEqual(controls.loc['R03E', 'amount'], 100)
        self.assertEqual(controls.loc['R02A', 'amount'], 20)
        with self.assertRaises(ValueError):
            revenue_controls(summary, detail[detail.rev_type != 'R03E'])

    def test_total_plus_component_geography_is_not_double_counted(self):
        frame = pd.DataFrame([dict(calendar_year=2025, expenses_type=t, amount=a) for t,a in
                              [('E06',100),('E06A',30),('E06B',50),('E06C',20)]])
        self.assertEqual(select_geographic_totals(frame).amount.sum(), 100)
        for invalid in [None, 'E99']:
            frame.loc[0, 'expenses_type'] = invalid
            with self.assertRaises(ValueError):
                select_geographic_totals(frame)

    def test_sdg_budgets_do_not_inflate_actual_spending(self):
        frame = pd.DataFrame({'calendar_year': [2024,2024], 'type_of_financial_information': ['EXP','BUD'], 'amount': [50,100]})
        actuals = select_sdg_expenses(frame)
        self.assertEqual(actuals.amount.sum(),50)
        self.assertNotIn(2025,set(actuals.calendar_year))

    def test_parent_resolution_keeps_standalone_reporting_and_rejects_unknowns(self):
        controls = pd.DataFrame({'calendar_year': [2024,2024], 'agency': ['UN', 'UNRISD']})
        frame = pd.DataFrame({'calendar_year': [2024,2024], 'entity': ['UN-Tech Bank','UNRISD']})
        result = resolve_reporting_entities(frame,'entity',controls,[])
        self.assertEqual(list(result.entity),['UN Secretariat','UNRISD'])
        frame.loc[0,'entity']='Unknown agency'
        with self.assertRaises(ValueError):
            resolve_reporting_entities(frame,'entity',controls,[])

    def test_published_2025_controls_and_dataset_availability(self):
        def read(name):
            return json.loads((ROOT/'public/data'/name).read_text())
        manifest = read('manifest.json')
        for key in ['donors','entityRevenue','entitySpending','geographicExpenses','countryExpenses']:
            self.assertEqual(manifest[key]['default'],2025)
        self.assertEqual(manifest['sdgExpenses']['max'],2025)
        self.assertTrue((ROOT/'public/data/sdg-expenses-2025.json').exists())
        entities = read('entity-revenue-2025.json')
        self.assertNotIn('ITC',entities)
        self.assertAlmostEqual(sum(e['total'] for e in entities.values()),62970982927.20749,places=2)
        self.assertAlmostEqual(sum(e['amount'] for e in read('entity-spending-2025.json')),64396743592.987045,places=2)
        self.assertAlmostEqual(sum(e['total'] for e in read('geographic-expenses-2025.json')),64396743594.12447,places=2)
        self.assertEqual(read('donors-2025.json')['MISC']['record_kind'], 'reported_aggregate')
        self.assertFalse(read('donors-2025.json')['MISC']['is_other'])
        # Austria/UNDP is blank in both government-detail presentations.
        self.assertEqual(sum(len(f['missingAmounts']) for f in read('ceb-source.json')['files']),5)
        # Raw source unknowns remain unknown, rather than ad hoc zero replacements.
        self.assertEqual(pd.read_csv(ROOT/'data/ceb/clean/revenue_government_donors.csv').amount.isna().sum(),1)


if __name__ == '__main__':
    unittest.main()
