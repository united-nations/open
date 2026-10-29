"""Source categories and unresolved historical financing remain independent."""
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
from revenue_categories import UNRESOLVED_FINANCING_CODES, rev_category


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "python" / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


fusion = module("source_fusion", "03-fuse_ceb_revenue.py")
export = module("source_export", "05-export_contributor_json.py")


class SourceAttributionTests(unittest.TestCase):
    def test_named_contributors_do_not_override_or_fill_source_categories(self):
        names, _ = fusion.load_contrib_mapping()
        for donor, code in [("UN OCHA", "C04D"), ("Bill & Melinda Gates Foundation", "C06"),
                            ("UN Foundation", "C02"), ("European Union", "C08B"),
                            ("World Bank Group", None)]:
            with self.subTest(donor=donor):
                _, actual, category, _ = fusion.get_donor_info(donor, code, names)
                self.assertEqual(actual, code or "Unknown")
                self.assertEqual(category, names[code] if code else "Non-Government")

    def test_unresolved_records_are_inspectable_without_double_counting_controls(self):
        controls = pd.DataFrame([dict(calendar_year=2016, agency="UNDP", rev_type="R03E", amount=100)])
        gov = pd.DataFrame([dict(calendar_year=2016, entity="UNDP", rev_type="R03E", contrib_type="Government",
                                 government_donor="Miscellaneous", amount=70)])
        nongov = pd.DataFrame([dict(calendar_year=2016, entity="UNDP", rev_type="R09", contrib_type="2",
                                    donor="European Union", amount=30)])
        sources = {"revenue.csv": controls, "revenue_sub_agency.csv": controls,
                   "revenue_government_donors.csv": gov, "revenue_non_gov_donors.csv": nongov,
                   "revenue_contrib_type.csv": pd.DataFrame(columns=["calendar_year", "entity", "contrib_type", "rev_type", "amount"]),
                   "revenue_by_financing_instruments_and_government_contributors.csv": pd.DataFrame(columns=["calendar_year", "entity", "sub_entity"]),
                   "expenses_sub_agency.csv": pd.DataFrame(columns=["calendar_year", "agency", "sub_agency"])}
        with patch.object(fusion, "load", side_effect=lambda name: sources[name].copy()), patch.object(pd.DataFrame, "to_csv"):
            frame = fusion.fuse_revenue()
        self.assertEqual(frame.loc[frame.financing_resolved, "amount"].sum(), 100)
        self.assertEqual(frame.loc[~frame.financing_resolved, "amount"].sum(), 30)
        # Preserve the government file's category even for a generic source label.
        self.assertEqual(frame.loc[frame.donor_name == "Miscellaneous", "donor_type"].iloc[0], "Government")
        frame["rev_cat"] = frame.rev_type.map(lambda code: rev_category(code) if code else None)
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            with patch.object(export, "OUT", out), patch.object(export, "YEARS", [2016]), \
                    patch.object(pd, "read_csv", return_value=controls):
                export.export_donors_json(frame, {})
                export.export_entity_revenue_json(frame)
                export.export_contributor_trends_json(frame)
            donors = json.loads((out / "donors-2016.json").read_text())
            entity = json.loads((out / "entity-revenue-2016.json").read_text())["UNDP"]
            trends = json.loads((out / "contributor-trends.json").read_text())
        self.assertEqual(sum(donor["total"] for donor in donors.values()), 100)
        self.assertEqual(donors["Miscellaneous"]["record_kind"], "reported_aggregate")
        self.assertEqual(donors["Miscellaneous"]["category"], "Government")
        donor = donors["European Union"]
        self.assertEqual(donor["contributions"], {})
        self.assertEqual(donor["categories"], ["Non-Government"])
        self.assertEqual(donor["unresolvedTotal"], 30)
        self.assertTrue(donor["financingIncomplete"])
        self.assertEqual(donor["unresolvedFinancingRecords"][0]["sourceCode"], "R09")
        self.assertEqual(donor["unresolvedFinancingRecords"][0]["sourceRow"], 2)
        self.assertEqual(entity["total"], 100)
        self.assertIn("Unattributed", {row["donor"] for row in entity["by_donor"]})
        self.assertEqual(trends["aggregates"]["all"][0]["total"], 100)
        self.assertFalse(trends["aggregates"]["all"][0]["financingIncomplete"])
        self.assertTrue(trends["aggregates"]["all"][0]["attributionIncomplete"])
        self.assertEqual(trends["contributors"]["European Union"][0]["unresolvedTotal"], 30)
        for code in UNRESOLVED_FINANCING_CODES:
            with self.subTest(code=code), self.assertRaises(KeyError):
                rev_category(code)

    def test_published_source_category_breakdowns_reconcile_without_cross_category_bleed(self):
        for path in (ROOT / "public/data").glob("donors-*.json"):
            for name, donor in json.loads(path.read_text()).items():
                aggregate = {}
                for category, entities in donor["categoryContributions"].items():
                    self.assertIn(category, donor["categories"])
                    for entity, instruments in entities.items():
                        for instrument, amount in instruments.items():
                            key = (entity, instrument)
                            aggregate[key] = aggregate.get(key, 0) + amount
                expected = {(entity, instrument): amount for entity, instruments in donor["contributions"].items()
                            for instrument, amount in instruments.items()}
                self.assertEqual(aggregate.keys(), expected.keys(), (path.name, name))
                for key, amount in expected.items():
                    self.assertAlmostEqual(aggregate[key], amount, delta=0.01, msg=f"{path.name} {name} {key}")

    def test_all_known_source_observations_and_provenance_are_preserved(self):
        fused = pd.read_csv(ROOT / "data/ceb/fused/revenue_by_contributor.csv")
        for filename, donor_column in [("revenue_government_donors.csv", "government_donor"),
                                       ("revenue_non_gov_donors.csv", "donor")]:
            raw = pd.read_csv(ROOT / "data/ceb/raw" / filename)
            raw["source_row"] = raw.index + 2
            expected = raw.dropna(subset=["amount"]).reset_index(drop=True)
            actual = fused[fused.source_file == filename].sort_values("source_row").reset_index(drop=True)
            self.assertEqual(len(actual), len(expected), filename)
            pd.testing.assert_series_equal(actual.source_row.astype(int), expected.source_row, check_names=False)
            pd.testing.assert_series_equal(actual.amount, expected.amount, check_names=False, check_exact=False, rtol=1e-12, atol=1e-6)
            for actual_column, source_column in [("source_donor_name", donor_column),
                                                 ("source_contrib_type", "contrib_type"),
                                                 ("source_rev_type", "rev_type")]:
                self.assertEqual(actual[actual_column].fillna("").astype(str).tolist(),
                                 expected[source_column].fillna("").astype(str).tolist())


if __name__ == "__main__":
    unittest.main()
