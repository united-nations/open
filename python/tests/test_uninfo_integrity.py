"""UNINFO source identities and unclassified resources must survive export."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('uninfo_export', ROOT / 'python/10-export_uninfo_json.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

METRICS = {'required': 'Total Required Resources', 'available': 'Total Available Resources',
           'spent': 'Total Expenditure'}


def node(node_id, code='1', parent=None, spent=10, **extra):
    return {'id': node_id, 'code': code, 'parentId': parent, 'name': f'Node {node_id}',
            'metrics': [{'metricName': METRICS['spent'], 'total': spent}], **extra}


def walk(nodes, parent=None):
    for item in nodes:
        yield item, parent
        yield from walk(item.get('children', []), item['id'])


def source_metrics(item):
    values = {metric['metricName']: metric['total'] for metric in item.get('metrics', [])}
    return {key: round(values.get(label, 0), 2) for key, label in METRICS.items()}


class UninfoIntegrityTests(unittest.TestCase):
    def test_repeated_display_codes_under_distinct_parents_keep_every_identity(self):
        data = {'sp': [node(1), node(2, code='2')],
                'oc': [node(3, parent=1), node(4, parent=2)],
                'ou': [node(5, parent=3), node(6, parent=4)]}
        actual = {item['id']: parent for item, parent in walk(exporter.build_framework_tree(data))}
        self.assertEqual(actual, {1: None, 2: None, 3: 1, 4: 2, 5: 3, 6: 4})

    def test_multiple_descriptions_of_same_id_count_once_and_keep_latest_metadata(self):
        old = node(2, parent=1, endDate='2024-12-31')
        latest = {**old, 'name': 'Updated description', 'endDate': '2026-12-31'}
        tree = exporter.build_framework_tree({'sp': [node(1)], 'oc': [old, latest, old]})
        children = tree[0]['children']
        self.assertEqual(len(children), 1)
        self.assertEqual(children[0]['name'], 'Updated description')
        self.assertEqual(children[0]['spent'], 10)

    def test_conflicting_identity_or_finances_and_unreachable_nodes_fail(self):
        original = node(3, parent=1)
        for conflict in [node(3, parent=2), node(3, parent=1, code='2'),
                         node(3, parent=1, spent=20)]:
            with self.subTest(conflict=conflict), self.assertRaises(ValueError):
                exporter.build_framework_tree({'sp': [node(1), node(2)],
                                               'oc': [original, conflict]})
        for framework in [{'oc': [original]}, {'sp': [node(1)], 'ou': [node(4, parent=99)]},
                          {'sp': [node(1)], 'oc': [node(1, parent=1)]}]:
            with self.subTest(framework=framework), self.assertRaises(ValueError):
                exporter.build_framework_tree(framework)

    def test_country_and_global_unclassified_groups_keep_independent_scopes(self):
        data = {'workspaces': {'Lebanon': 128, 'Norway': 129}, 'projects': {}, 'frameworks': {},
                'countries_sdgs': {
                    'Lebanon': {'workspace_id': 128, 'has_year_data': True,
                                'sdgs': [node(1, spent=10), node(None, spent=-2)]},
                    'Norway': {'workspace_id': 129, 'has_year_data': False,
                               'sdgs': [node(None, spent=0)]}},
                'global_sdgs': [node(1, spent=200), node(None, spent=5)]}
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            with patch.multiple(exporter, OUT=root, RAW=root, COUNTRIES_DIR=root / 'countries'):
                index = exporter.export_per_country(data)
                countries = {iso: json.loads((root / 'countries' / f'{iso}.json').read_text())
                             for iso in index}
                self.assertEqual(countries['LBN']['totals']['spent'], 8)
                self.assertEqual(countries['LBN']['sdgs']['1']['spent'], 10)
                self.assertEqual(countries['LBN']['sdgs']['unclassified']['spent'], -2)
                # An explicitly reported zero group is retained, even with no projects.
                self.assertEqual(countries['NOR']['sdgs']['unclassified']['spent'], 0)
                goals = exporter.export_sdgs(data, index)
                self.assertEqual(goals['unclassified']['totals']['spent'], 5)
                self.assertEqual(set(goals['unclassified']['countries']), {'LBN'})
                self.assertIsNone(goals['unclassified']['year'])
                data['global_sdgs'] = [node(1, spent=200)]
                self.assertNotIn('unclassified', exporter.export_sdgs(data, index))

    def test_invalid_or_repeated_sdg_groups_fail_instead_of_losing_observations(self):
        for rows in [[node(1), node(1)], [node(None), node(None)], [node(18)]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                exporter.build_sdg_metrics(rows)
        self.assertNotIn('unclassified', exporter.build_sdg_metrics([node(1)]))

    def test_all_current_framework_identities_and_reported_parents_survive(self):
        raw = json.loads((ROOT / 'data/uninfo/raw/frameworks_by_country.json').read_text())
        index = json.loads((ROOT / 'public/data/uninfo-countries-index.json').read_text())
        for iso, entry in index.items():
            source = raw.get(entry['name'], {})
            expected = {item['id']: item for rows in source.values() for item in rows}
            country = json.loads((ROOT / f'public/data/uninfo-countries/{iso}.json').read_text())
            actual = list(walk(country.get('framework', [])))
            with self.subTest(country=iso):
                self.assertEqual(len(actual), len(expected))
                self.assertEqual({item['id'] for item, _ in actual}, set(expected))
                for item, parent in actual:
                    self.assertEqual(parent, expected[item['id']].get('parentId'))
                    self.assertEqual({key: item[key] for key in METRICS}, source_metrics(expected[item['id']]))

    def test_all_current_country_totals_include_every_source_sdg_group(self):
        raw = json.loads((ROOT / 'data/uninfo/raw/countries_sdgs.json').read_text())
        index = json.loads((ROOT / 'public/data/uninfo-countries-index.json').read_text())
        for iso, entry in index.items():
            rows = raw[entry['name']]['sdgs']
            expected = {key: round(sum(source_metrics(row)[key] for row in rows), 2) for key in METRICS}
            country = json.loads((ROOT / f'public/data/uninfo-countries/{iso}.json').read_text())
            with self.subTest(country=iso):
                self.assertEqual(entry['totals'], expected)
                self.assertEqual(country['totals'], expected)
                self.assertEqual('unclassified' in country['sdgs'], any(row.get('id') is None for row in rows))
                for row in rows:
                    key = str(row['id']) if row.get('id') is not None else 'unclassified'
                    self.assertEqual(country['sdgs'][key], source_metrics(row))

    def test_global_unclassified_amounts_are_reported_not_inferred_from_countries(self):
        source = json.loads((ROOT / 'data/uninfo/raw/global_sdgs.json').read_text())
        actual = json.loads((ROOT / 'public/data/uninfo-sdgs.json').read_text())
        expected = {str(row['id']) if row.get('id') is not None else 'unclassified': source_metrics(row)
                    for row in source}
        self.assertEqual({key: value['totals'] for key, value in actual.items()}, expected)
        index = json.loads((ROOT / 'public/data/uninfo-countries-index.json').read_text())
        for group in actual.values():
            for iso, metrics in group['countries'].items():
                self.assertEqual(index[iso]['year'], 2024)
                self.assertEqual(index[iso]['geographic_scope'], 'country')


if __name__ == '__main__':
    unittest.main()
