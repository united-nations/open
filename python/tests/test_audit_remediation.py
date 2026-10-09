"""Independent source/export regressions for the September 2026 audit."""
import csv
import json
from collections import defaultdict
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
from utils import normalize_entity, normalize_country_name
from revenue_categories import rev_category
from ceb_data import select_geographic_totals


def read(name):
    return json.loads((ROOT / 'public/data' / name).read_text())


class AuditRemediationTests(unittest.TestCase):
    def test_revenue_against_source_textual_instruments(self):
        # Do not import fusion code or its R-code map for this control.
        labels = {'Assessed Contributions': 'Assessed', 'Assessed contributions': 'Assessed',
                  'Voluntary core (un-earmarked) contributions': 'Voluntary un-earmarked',
                  'Voluntary non-core (earmarked) contributions': 'Voluntary earmarked',
                  'Revenue from other activities': 'Other'}
        controls = defaultdict(float)
        with (ROOT / 'data/ceb/clean/revenue.csv').open() as stream:
            for row in csv.DictReader(stream):
                year = int(row['calendar_year'])
                if year < 2013:
                    continue
                if row['amount']:
                    controls[year, normalize_entity(row['agency']), labels[row['rev_type']]] += float(row['amount'])
        actual = {}
        for year in read('manifest.json')['entityRevenue']['years']:
            for entity, data in read(f'entity-revenue-{year}.json').items():
                for label, amount in data['by_type'].items():
                    actual[year, entity, label] = amount
        for key in controls.keys() | actual.keys():
            self.assertAlmostEqual(controls[key], actual.get(key, 0), places=2, msg=str(key))
        self.assertEqual(read('entity-revenue-2024.json')['PAHO']['total'], 1195033314)
        self.assertAlmostEqual(read('entity-revenue-2023.json')['IRMCT']['total'], 76239000, places=2)
        self.assertAlmostEqual(read('entity-revenue-2020.json')['UNICEF']['by_type']['Other'], 246046799.78, places=2)

    def test_legacy_and_unknown_financing(self):
        self.assertEqual(rev_category('R02'), 'Voluntary un-earmarked')
        with self.assertRaises(KeyError):
            rev_category('unexpected')

    def test_annual_and_trends_same_instruments_and_scope(self):
        trends = read('contributor-trends.json')
        fields = {'Assessed': 'assessed', 'Voluntary un-earmarked': 'voluntary_unearmarked',
                  'Voluntary earmarked': 'voluntary_earmarked', 'Other': 'other'}
        for year in read('manifest.json')['entityRevenue']['years']:
            donors = read(f'donors-{year}.json')
            totals = defaultdict(float)
            for name, donor in donors.items():
                by_type = defaultdict(float)
                for amounts in donor['contributions'].values():
                    for label, amount in amounts.items():
                        totals[fields[label]] += amount
                        by_type[fields[label]] += amount
                if name in trends['contributors']:
                    point = next(p for p in trends['contributors'][name] if p['year'] == year)
                    for key in fields.values():
                        self.assertAlmostEqual(point[key], by_type[key], places=2, msg=(year, name, key))
            point = next(p for p in trends['aggregates']['all'] if p['year'] == year)
            for key in fields.values():
                self.assertAlmostEqual(point[key], totals[key], places=2)
            self.assertAlmostEqual(point['total'], sum(totals.values()), places=2)

    def test_uninfo_scope_and_grain(self):
        index = read('uninfo-countries-index.json')
        unknown = {code for code, row in index.items() if row['year'] is None}
        self.assertEqual(unknown, {'COD','BHR','COM','DJI','ETH','JOR','MMR','NAM','PRY','RWA','SLE','SYR','UKR'})
        for code, entry in index.items():
            full = read(f'uninfo-countries/{code}.json')
            self.assertEqual(entry['project_count'], len({p['id'] for p in full['projects']}))
            self.assertEqual(len(full['projects']), len({p['row_key'] for p in full['projects']}))
            if len(entry['workspace_countries']) > 1:
                self.assertEqual(entry['geographic_scope'], 'workspace')
            # Legacy project/framework snapshots lost query-period provenance.
            self.assertIsNone(full['projects_year'])
            self.assertIsNone(full['framework_year'])
        for sdg in read('uninfo-sdgs.json').values():
            for code in sdg['countries']:
                self.assertEqual(index[code]['year'], 2024)
                self.assertEqual(index[code]['geographic_scope'], 'country')

    def test_budget_source_exceptions(self):
        data = read('budget-ppb-proposed-2022.json')
        parts = [n for n in data['nodes'] if n['parentId'] == 'section-8~office-of-legal-affairs']
        self.assertEqual(sorted(n['amount'] for n in parts), [903300,1147700,1795700,23714400])
        self.assertTrue(all(n.get('metricSources') for n in parts))
        data = read('budget-ppb-proposed-2025.json')
        self.assertEqual(next(n['amount'] for n in data['nodes'] if n['id']=='section-24'),240210200)
        inconsistency = next(n for n in data['nodes'] if n['id'].startswith('section-24~office-') and n['id'].endswith('~programme-of-work'))
        self.assertEqual(inconsistency['breakdowns']['regular_budget']['difference'], -861200)
        data = read('budget-ppb-proposed-2024.json')
        self.assertEqual(next(n['amount'] for n in data['nodes'] if 'conferencing-infrastructure' in n['id']),3500000)
        for identity in ['section-33','section-33~section-special-purpose-allocations']:
            self.assertEqual(next(n['amount'] for n in data['nodes'] if n['id']==identity),30985800)

    def test_repaired_trust_fund_source_columns(self):
        samples = [(2022, 'DDN', 'UNDP Multi-Partner Trust Fund Office', 461663168),
                   (2024, 'MNA', 'UNDP Multi-Partner Trust Fund Office', 5860258),
                   (2024, 'GLA', 'Trust Fund for the United Nations Peace and Development (PDF)', 1944014)]
        for year, fund, name, amount in samples:
            data = read(f'trust-fund-contributors-{year}.json')
            donor = next(d for d in data['contributors'] if d['name'] == name)
            destination = next(d for d in donor['destinations'] if d['fund_code'] == fund)
            self.assertEqual(destination['amount_usd'], amount)
            self.assertTrue(all(s['columnHeader'] == 'Total' for s in destination['supportingSources']))

    def test_manifest_points_to_existing_files(self):
        manifest = read('manifest.json')
        for key, prefix in [('budgetPpb','budget-ppb'),('budgetPpbApproved','budget-ppb-approved'),('budgetPpbProposed','budget-ppb-proposed')]:
            for year in manifest[key]['years']:
                self.assertTrue((ROOT / 'public/data' / f'{prefix}-{year}.json').exists())

    def test_peacekeeping_stages_match_latest_source_observations(self):
        expected = {}
        for cycle in (2024, 2025, 2026):
            source = json.loads((ROOT / f'data/references/programme-budget-data-financial-v1.8/pko/{cycle}.json').read_text())
            observations = {o['observationId']: o for o in source['observations']}
            for view in source['treemapViews']:
                lens = view['lens']
                expected[lens['measure'], int(lens['fiscalYear'].split('/')[0])] = (cycle, view, observations)
        for (measure, year), (cycle, view, observations) in expected.items():
            metric = 'approved' if measure == 'appropriation' else measure
            actual = read(f'budget-pko-{metric}-{year}.json')
            self.assertEqual(actual['meta']['measure'], measure)
            self.assertEqual(actual['meta']['fiscalYear'], view['lens']['fiscalYear'])
            self.assertEqual(actual['meta']['cycle'], cycle)
            for node, original in zip(actual['nodes'], view['nodes'], strict=True):
                # Compare the published money, not a sum reconstructed from children.
                self.assertEqual(node['amount'], float(original['money']['amountExact']))
                if original.get('observationId'):
                    observation = observations[original['observationId']]
                    self.assertEqual(node['source']['columnHeader'], observation['source']['columnHeader'])
                    self.assertEqual(node['source']['symbol'], observation['source']['symbol'])
        manifest = read('manifest.json')
        self.assertEqual(manifest['budgetPko']['default'], 2024)
        self.assertEqual(manifest['budgetPkoApproved']['years'], [2023, 2024, 2025])
        self.assertEqual(manifest['budgetPkoProposed']['years'], [2024, 2025, 2026])
        proposal = read('budget-pko-proposed-2026.json')
        self.assertTrue(proposal['meta']['partial'])
        self.assertEqual(proposal['meta']['coverage']['missingCanonicalDetail'], ['UNSOH'])

    def test_curacao_normalization(self):
        self.assertEqual(normalize_country_name('Cura├ºao'),'Curaçao')
        with (ROOT / 'data/ceb/clean/expenses_by_country_region_sub_agency.csv').open() as stream:
            controls = defaultdict(float)
            for row in csv.DictReader(stream):
                if normalize_country_name(row['country/territory']) in ('Curaçao', 'Curacao') and row['location_type']=='COU':
                    if row.get('expenses_type', 'E06') == 'E06':
                        controls[int(row['calendar_year'])] += float(row['amount'])
        for year, expected in controls.items():
            actual = next(n['total'] for n in read(f'country-expenses-{year}.json') if n['iso3']=='CUW')
            self.assertAlmostEqual(actual,expected,places=2)


if __name__ == '__main__':
    unittest.main()
