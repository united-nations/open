"""Reported private aggregates retain their categories through fusion and export."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from utils import PRIVATE_DONOR_LABEL


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "python" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


revenue = load_module("private_revenue", "03-fuse_ceb_revenue.py")
export = load_module("private_export", "05-export_contributor_json.py")


class PrivateDonorTests(unittest.TestCase):
    def test_aliases_categories_and_signed_remainders_survive_export(self):
        controls = pd.DataFrame([dict(calendar_year=2024, agency="UNDP", rev_type="R03E", amount=100)])
        nongov = pd.DataFrame([
            dict(calendar_year=2024, entity="UNDP", rev_type="R03E", donor=name, contrib_type=code, amount=amount)
            for name, code, amount in [
                ("Private Donors", "C06", 20),
                ("Private donor", "C06", 10),
                ("Private Sector", "C06", 5),
                ("Private Donors", "C02", 7),
                ("Private Donors", "C05", -2),
                ("Private Donors", "2", 3),  # Legacy unknown type stays unknown.
            ]
        ])
        categories = pd.DataFrame([
            dict(calendar_year=2024, entity="UNDP", rev_type="R03E", contrib_type=code, amount=amount)
            for code, amount in [("C06", 70), ("C02", 10), ("C05", 5)]
        ])
        sources = {
            "revenue.csv": controls,
            "revenue_sub_agency.csv": controls,
            "revenue_government_donors.csv": pd.DataFrame(columns=["calendar_year", "entity", "rev_type", "government_donor", "amount"]),
            "revenue_non_gov_donors.csv": nongov,
            "revenue_contrib_type.csv": categories,
            "revenue_by_financing_instruments_and_government_contributors.csv": pd.DataFrame(columns=["calendar_year", "entity", "sub_entity"]),
            "expenses_sub_agency.csv": pd.DataFrame(columns=["calendar_year", "agency", "sub_agency"]),
        }
        with patch.object(revenue, "load", side_effect=lambda name: sources[name].copy()), patch.object(pd.DataFrame, "to_csv"):
            fused = revenue.fuse_revenue()
        self.assertAlmostEqual(fused.amount.sum(), 100)
        self.assertEqual(fused.loc[fused.donor_name == "Other Private Sector", "amount"].sum(), 35)
        self.assertEqual(fused.loc[fused.donor_name == "Unattributed", "amount"].sum(), 12)
        fused["rev_cat"] = fused.rev_type.map(export.rev_category)
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            with patch.object(export, "OUT", out), patch.object(export, "YEARS", [2024]):
                export.export_donors_json(fused, {})
                export.export_contributor_trends_json(fused)
            donors = json.loads((out / "donors-2024.json").read_text())
            trends = json.loads((out / "contributor-trends.json").read_text())
        reported = donors[PRIVATE_DONOR_LABEL]
        self.assertEqual(reported["record_kind"], "reported_aggregate")
        self.assertFalse(reported["is_other"])
        self.assertEqual(reported["category"], "Multiple categories")
        self.assertEqual(reported["total"], 43)
        expected = {"Private Sector": 35, "NGOs": 7, "Foundations": -2, "Non-Government": 3}
        self.assertNotIn("Other Private", donors)
        for category, amount in expected.items():
            with self.subTest(category=category):
                self.assertEqual(reported["categoryContributions"][category]["UNDP"]["Voluntary earmarked"], amount)
                self.assertEqual(trends["categoryContributors"][category][PRIVATE_DONOR_LABEL][0]["total"], amount)
        self.assertEqual(donors["Other Private Sector"]["record_kind"], "calculated_balance")
        self.assertTrue(donors["Other Private Sector"]["is_other"])
        self.assertEqual(donors["Other Private Sector"]["total"], 35)
        for category, amount in [("Private Sector", 70), ("NGOs", 10), ("Foundations", 5)]:
            self.assertEqual(trends["aggregates"][f"cat:{category}"][0]["total"], amount)



if __name__ == "__main__":
    unittest.main()
