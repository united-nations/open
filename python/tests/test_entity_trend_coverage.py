"""Organization totals must retain years without government donor detail."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
spec = importlib.util.spec_from_file_location("entity_trends", ROOT / "python/09-process_entity_trends.py")
trends = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trends)


class EntityTrendCoverageTests(unittest.TestCase):
    def test_totals_survive_without_donor_detail_and_preserve_adjustments(self):
        summary = pd.DataFrame([
            dict(calendar_year=2011, agency="UNDP", rev_type="R01", amount=100),
            dict(calendar_year=2011, agency="UNDP", rev_type="R04A", amount=-5),
            dict(calendar_year=2012, agency="UNDP", rev_type="R01", amount=None),
        ])
        detail = summary.copy()
        detail.loc[2, "amount"] = 120
        with patch.object(pd, "read_csv", side_effect=[summary, detail]) as read:
            result = trends.load_revenue()
        self.assertEqual(result, {"UNDP": {2011: 95, 2012: 120}})
        self.assertEqual([call.args[0] for call in read.call_args_list], [
            "data/ceb/clean/revenue.csv", "data/ceb/clean/revenue_sub_agency.csv",
        ])

    def test_published_trends_cover_all_control_years_and_match_annual_exports(self):
        data = json.loads((ROOT / "public/data/entity-trends.json").read_text())
        controls = trends.revenue_controls(
            pd.read_csv(ROOT / "data/ceb/clean/revenue.csv"),
            pd.read_csv(ROOT / "data/ceb/clean/revenue_sub_agency.csv"),
        )
        expected = controls.groupby(["agency", "calendar_year"]).amount.sum()
        actual = {(entity, row["year"]): row["revenue"]
                  for entity, rows in data["entities"].items() for row in rows
                  if row["revenue"] is not None}
        self.assertEqual(set(actual), set(expected.index))
        for key, amount in expected.items():
            self.assertAlmostEqual(actual[key], amount, delta=0.01, msg=str(key))
        for row in data["aggregates"]["all"]:
            year = row["year"]
            self.assertAlmostEqual(row["revenue"], controls.loc[controls.calendar_year == year, "amount"].sum(), delta=0.01)
            annual_path = ROOT / f"public/data/entity-revenue-{year}.json"
            if annual_path.exists():
                annual = json.loads(annual_path.read_text())
                for entity, values in annual.items():
                    self.assertAlmostEqual(actual[entity, year], values["total"], delta=0.01)
        self.assertIsNone(next(row for row in data["entities"]["ITC"] if row["year"] == 2025)["revenue"])


if __name__ == "__main__":
    unittest.main()
