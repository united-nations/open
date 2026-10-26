"""Historical coverage stays honest when source dimensions have different years."""
import json
import unittest
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


def read(name):
    return json.loads((ROOT / 'public/data' / name).read_text())


class HistoricalCoverageTests(unittest.TestCase):
    def test_early_donor_records_are_preserved_without_invented_controls(self):
        source = pd.read_csv(ROOT / 'data/ceb/clean/revenue_non_gov_donors.csv')
        coverage = read('revenue-coverage.json')
        for year in (2009, 2010):
            rows = read(f'donors-{year}.json')
            total = sum(sum(sum(amounts.values()) for amounts in donor['contributions'].values()) for donor in rows.values())
            self.assertAlmostEqual(total, source.loc[source.calendar_year == year, 'amount'].sum(), delta=0.01)
            self.assertFalse(coverage[str(year)]['controls'])
            self.assertFalse(coverage[str(year)]['government'])
            self.assertNotIn('Unattributed', rows)
            self.assertFalse((ROOT / f'public/data/entity-revenue-{year}.json').exists())
        for year in (2011, 2012):
            donors = read(f'donors-{year}.json')
            self.assertIn('Unattributed', donors)
            self.assertTrue(coverage[str(year)]['controls'])
            self.assertFalse(coverage[str(year)]['government'])
            annual = read(f'entity-revenue-{year}.json')
            self.assertAlmostEqual(sum(row['total'] for row in annual.values()), sum(sum(sum(v.values()) for v in d['contributions'].values()) for d in donors.values()), delta=0.01)

    def test_flow_year_union_does_not_turn_missing_goals_into_zero(self):
        flows = {row['year']: row for row in read('system-flow-spending.json')['data']}
        self.assertEqual(sorted(flows), list(range(2010, 2026)))
        for year in (2010, 2011, 2017, 2025):
            self.assertFalse(flows[year]['availability']['goals'])
            self.assertTrue(all(not row['goals'] and row['goalsDifference'] is None for row in flows[year]['entities'].values()))
        self.assertFalse(flows[2010]['availability']['total'])
        self.assertTrue(all(row['total'] is None for row in flows[2010]['entities'].values()))

    def test_ppb_2018_keeps_partial_scope_and_only_published_funding(self):
        data = read('budget-ppb-2018.json')
        self.assertTrue(data['meta']['partial'])
        self.assertEqual(data['meta']['fundingSources'], ['regular_budget'])
        self.assertEqual(read('manifest.json')['budgetPpb']['fundingSourcesByYear']['2018'], ['regular_budget'])
        self.assertIn('not comparable', data['meta']['scopeWarning'])
        self.assertTrue(all(set(row['values']).issubset({'regular_budget'}) for row in data['nodes']))
        self.assertEqual(data['meta']['total'], next(row['amount'] for row in data['nodes'] if row['parentId'] is None))

    def test_unobserved_early_donors_have_unavailable_markers(self):
        data = read('contributor-trends.json')
        government = data['meta']['governmentContributors'][0]
        early = [row for row in data['contributors'][government] if row['year'] < 2013]
        self.assertTrue(all(row.get('available') is False for row in early))
