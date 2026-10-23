"""Calculated SDG remainders preserve source allocations and entity controls."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
spec = importlib.util.spec_from_file_location('sdg_export', ROOT / 'python/07-export_expenses_json.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SdgReconciliationTests(unittest.TestCase):
    def test_explicit_amount_is_not_double_counted_and_missing_entities_are_retained(self):
        goals = pd.DataFrame([
            dict(year=2024, entity='A', sdg='1', amount=60),
            dict(year=2024, entity='A', sdg='x00', amount=40),
            dict(year=2024, entity='B', sdg='2', amount=25),
        ])
        controls = pd.DataFrame([
            dict(year=2024, entity='A', amount=100),
            dict(year=2024, entity='B', amount=50),
            dict(year=2024, entity='C', amount=30),
            dict(year=2025, entity='A', amount=500),
        ])
        output = module.build_sdg_expenses(goals, controls)
        self.assertEqual(list(output), [2024])
        result = output[2024]
        self.assertEqual(result['non_sdg']['entities'], {'A': 40})
        self.assertEqual(result['sdg_not_specified']['entities'], {'A': 0, 'B': 25, 'C': 30})
        self.assertNotIn('unallocated', result)
        self.assertEqual(sum(row['total'] for row in result.values()), 180)

    def test_signed_corrections_and_reported_x00_are_preserved(self):
        goals = pd.DataFrame([
            dict(year=2023, entity='A', sdg='1', amount=120),
            dict(year=2023, entity='A', sdg='x00', amount=5),
        ])
        controls = pd.DataFrame([dict(year=2023, entity='A', amount=100)])
        result = module.build_sdg_expenses(goals, controls)[2023]
        self.assertEqual(result['1']['total'], 120)
        self.assertEqual(result['non_sdg']['total'], 5)
        self.assertEqual(result['sdg_not_specified']['total'], -25)
        self.assertEqual(sum(row['total'] for row in result.values()), 100)

    def test_unmatched_entities_and_unknown_goals_fail_instead_of_losing_money(self):
        goals = pd.DataFrame([dict(year=2024, entity='Missing', sdg='1', amount=60)])
        controls = pd.DataFrame([dict(year=2024, entity='A', amount=100)])
        with self.assertRaises(ValueError):
            module.build_sdg_expenses(goals, controls)
        goals.loc[0, 'sdg'] = 'unknown'
        with self.assertRaises(ValueError):
            module.build_sdg_expenses(goals, controls)

    def test_all_exported_years_reconcile_per_entity_and_keep_sdg_assignments(self):
        source = module.load_sdg_expenses()
        controls = module.load_ceb_expense_controls()
        output = module.build_sdg_expenses(source, controls)
        self.assertEqual(sorted(output), list(range(2018, 2025)))
        for year, result in output.items():
            with self.subTest(year=year):
                exported = json.loads((ROOT / f'public/data/sdg-expenses-{year}.json').read_text())
                self.assertEqual(result, exported)
                totals = controls[controls.year == year].groupby('entity').amount.sum().to_dict()
                for entity, control in totals.items():
                    total = sum(row['entities'].get(entity, 0) for row in result.values())
                    self.assertAlmostEqual(total, control, places=4)
                for goal in range(1, 18):
                    frame = source[(source.year == year) & (source.sdg.astype(str) == str(goal))]
                    self.assertEqual(result[str(goal)]['entities'], frame.groupby('entity').amount.sum().to_dict())
        explicit = output[2024]['non_sdg']['entities']
        unspecified = output[2024]['sdg_not_specified']['entities']
        self.assertEqual(sum(amount != 0 for amount in explicit.values()), 19)
        for entity, reported in explicit.items():
            if reported != 0:
                self.assertAlmostEqual(unspecified[entity], 0, delta=10)
        self.assertEqual(explicit['UN Tourism'], 0)
        self.assertAlmostEqual(unspecified['UN Tourism'], 33355633.33, places=2)



if __name__ == '__main__':
    unittest.main()
