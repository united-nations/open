"""Trend groups include the same signed attribution balances as the treemap."""
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
spec = importlib.util.spec_from_file_location("contributor_export", ROOT / "python/05-export_contributor_json.py")
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class ContributorTrendsTests(unittest.TestCase):
    def test_other_entries_and_signed_balances_are_included(self):
        rows = [
            (2024, "Example", "Government", 70, False),
            (2024, "Other Government", "Government", 30, True),
            (2024, "Foundation", "Foundations", 10, False),
            (2024, "Other Foundations", "Foundations", 20, True),
            (2024, "Unattributed", "Unattributed", -5, True),
            # A classification in one year must not determine every year's group.
            (2025, "Example", "Foundations", 15, False),
        ]
        frame = pd.DataFrame(rows, columns=["year", "donor_name", "donor_type", "amount", "is_other"])
        frame["rev_cat"] = "Voluntary earmarked"
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(export, "OUT", Path(directory)), patch.object(export, "YEARS", [2024, 2025]):
                export.export_contributor_trends_json(frame)
            data = json.loads((Path(directory) / "contributor-trends.json").read_text())
        totals = {key: values[0]["total"] for key, values in data["aggregates"].items()}
        self.assertEqual(totals, {"gov": 100, "non-gov": 30, "unattributed": -5, "all": 125, "cat:Foundations": 30})
        self.assertEqual(data["aggregates"]["gov"][1]["total"], 0)
        self.assertEqual(data["aggregates"]["non-gov"][1]["total"], 15)
        self.assertIn("Other Government", data["meta"]["governmentContributors"])
        self.assertIn("Other Foundations", data["meta"]["nonGovCategories"]["Foundations"])
        self.assertEqual(data["contributors"]["Unattributed"][0]["total"], -5)

    def test_published_groups_reconcile_to_treemap_in_every_year(self):
        data = json.loads((ROOT / "public/data/contributor-trends.json").read_text())
        for index, year in enumerate(data["meta"]["years"]):
            donors = json.loads((ROOT / f"public/data/donors-{year}.json").read_text())
            expected = dict.fromkeys(["gov", "non-gov", "unattributed"], 0)
            for name, donor in donors.items():
                group = "unattributed" if name == "Unattributed" else "gov" if donor["category"] == "Government" else "non-gov"
                expected[group] += sum(sum(amounts.values()) for amounts in donor["contributions"].values())
            for group, amount in expected.items():
                self.assertAlmostEqual(data["aggregates"][group][index]["total"], amount, delta=0.01, msg=f"{year} {group}")
            self.assertAlmostEqual(sum(expected.values()), data["aggregates"]["all"][index]["total"], delta=0.01)


if __name__ == "__main__":
    unittest.main()
