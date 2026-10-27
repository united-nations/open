"""Guard reporting boundaries, chart totals and citations for separate XB sources."""
from copy import deepcopy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from secretariat_xb_frontend import extend_spending

REPO = Path(__file__).resolve().parents[2]
STAGE2 = REPO / 'data/trust-fund-source-candidates/stage2'


def baseline():
    return {'meta': {'total': 100, 'scopeWarning': 'Original schedule coverage.'},
            'nodes': [
                {'id': 'root', 'parentId': None, 'tier': 'whole', 'amount': 100,
                 'values': {'extrabudgetary': 100}},
                {'id': 'old-entity', 'parentId': 'root', 'tier': 'budget_unit', 'amount': 100},
                {'id': 'old-fund', 'parentId': 'old-entity', 'tier': 'detail', 'amount': 105},
                {'id': 'old-negative', 'parentId': 'old-entity', 'tier': 'detail', 'amount': -5}]}


class SeparateXBFrontendTests(unittest.TestCase):
    def export(self, year=2024):
        return extend_spending(baseline(), year, STAGE2)

    def test_original_fund_identity_values_and_signed_group_total_preserved(self):
        old = baseline()
        enriched = self.export()
        indexed = {n['id']: n for n in enriched['nodes']}
        for node in old['nodes'][1:]:
            actual = deepcopy(indexed[node['id']])
            self.assertEqual(actual.pop('sourceGroup'), 'volume_i')
            self.assertEqual(actual, node)
        self.assertEqual(enriched['meta']['sourceGroups'][0]['amount'], 100)
        self.assertEqual(indexed['old-negative']['amount'], -5)
        self.assertEqual(indexed['root']['amount'], 100)
        self.assertEqual(indexed['root']['values'], {'extrabudgetary': 100})
        self.assertEqual(indexed['xb-entity:UNEP']['referenceSources'][0]['pdfPage'],30)
        self.assertIn('Annual Report',indexed['xb-entity:UNEP']['referenceSources'][0]['symbol'])

    def test_entity_totals_use_selected_current_year_measures(self):
        payload = self.export()
        entities = {n['code']: n for n in payload['nodes'] if n.get('chartAsAggregate')}
        self.assertEqual({k:v['amount'] for k,v in entities.items()},
                         {'UNEP': 808064000, 'UNODC': 447618000,
                          'UN-HABITAT': 172645000, 'ITC': 117300000})
        self.assertIn('gross XB', entities['ITC']['sourceMeasure'])
        self.assertEqual(payload['meta']['sourceGroups'][1]['amount'], 1545627000)
        self.assertTrue(all(n['contributorsAvailable'] is False for n in entities.values()))
        self.assertFalse(any(n['parentId'] in ['xb-entity:UNODC', 'xb-entity:ITC'] for n in payload['nodes']))

    def test_gross_details_reconcile_with_eliminations_without_synthetic_funds(self):
        for year in [2023, 2024]:
            payload = self.export(year)
            for node in payload['nodes']:
                if 'expenseReconciliation' not in node:
                    continue
                reconciliation = node['expenseReconciliation']
                ids = {node['id']}
                for _ in range(4):
                    ids.update(n['id'] for n in payload['nodes'] if n['parentId'] in ids)
                details = [n for n in payload['nodes'] if n['id'] in ids and n['tier']=='detail' and not n.get('detailGrouping')]
                self.assertEqual(sum(n['amount'] for n in details), reconciliation['detailTotal'])
                self.assertEqual(reconciliation['detailTotal'] + reconciliation['eliminations'] +
                                 reconciliation['roundingDifference'], node['amount'])
                self.assertLessEqual(abs(reconciliation['roundingDifference']), 2000)
                self.assertLess(reconciliation['eliminations'], 0)
                self.assertTrue(all(n['basis'] == 'directly_printed' for n in details))

    def test_every_report_figure_has_original_document_and_physical_pdf_page(self):
        for year in [2023, 2024]:
            for node in self.export(year)['nodes']:
                if node.get('sourceGroup') != 'separate_entities' or node['tier'] not in ['budget_unit', 'detail']:
                    continue
                for ref in node['supportingSources']:
                    self.assertGreater(ref['pdfPage'], 0)
                    self.assertTrue(ref['url'].startswith('https://'))
                    self.assertTrue(ref['symbol'])
                    self.assertTrue(ref['rowLabel'])
                    self.assertTrue(ref['columnHeader'])
                    self.assertTrue(ref['tableTitle'])

    def test_missing_report_years_are_unavailable_without_arwo_substitution(self):
        # ARWO controls exist for 2019–2022, but must never populate this view.
        for year in range(2017,2023):
            payload = self.export(year)
            self.assertIsNone(payload['meta']['sourceGroups'][1]['amount'])
            self.assertEqual(len(payload['nodes']), 4)
            self.assertEqual(payload['meta']['total'],100)
            self.assertFalse(any(n.get('chartAsAggregate') for n in payload['nodes']))
        for year in [2023,2024]:
            payload=self.export(year)
            self.assertFalse(any('ARWO' in str(n.get('sourceMeasure','')) for n in payload['nodes']))
            for node in payload['nodes']:
                if node.get('chartAsAggregate'):
                    self.assertTrue(all(source.get('pdfPage') for source in node['supportingSources']))

    def test_exported_tree_has_unique_namespaced_ids_and_no_orphans(self):
        for year in range(2017, 2025):
            payload = json.loads((REPO / f'public/data/budget-trust-funds-{year}.json').read_text())
            ids = {n['id'] for n in payload['nodes']}
            self.assertEqual(len(ids), len(payload['nodes']))
            self.assertTrue(all(n['parentId'] is None or n['parentId'] in ids for n in payload['nodes']))
            for node in payload['nodes']:
                if node.get('sourceGroup') == 'separate_entities' and node['tier'] == 'detail':
                    self.assertTrue(node['id'].startswith('xb:'))
