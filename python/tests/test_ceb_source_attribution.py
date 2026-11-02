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
from utils import normalize_entity


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "python" / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


fusion = module("source_fusion", "03-fuse_ceb_revenue.py")
export = module("source_export", "05-export_contributor_json.py")


class SourceAttributionTests(unittest.TestCase):
    def test_un_contributors_use_only_explicit_un_donor_records(self):
        controls = pd.DataFrame([dict(calendar_year=2025, agency="UN", rev_type="R03E", amount=100)])
        gov = pd.DataFrame([
            dict(calendar_year=2025, entity=entity, rev_type="R03E", contrib_type="Government",
                 government_donor="Germany", amount=amount)
            for entity, amount in [("UN", 40), ("UN-OCHA", 25)]
        ])
        nongov = pd.DataFrame([
            dict(calendar_year=2025, entity=entity, rev_type="R03E", contrib_type=category,
                 donor=name, amount=amount)
            for entity, name, category, amount in [
                ("UN", "European Union", "C08A", 30),
                ("UN-UNDRR", "European Union", "C08A", 10),
                ("UN-OCHA", "Department-only Foundation", "C05", 5),
            ]
        ])
        categories = pd.DataFrame([
            dict(calendar_year=2025, entity="UN", rev_type="R03E", contrib_type=code, amount=amount)
            for code, amount in [("C01", 40), ("C08A", 60)]
        ])
        sources = {"revenue.csv": controls,
                   "revenue_government_donors.csv": gov, "revenue_non_gov_donors.csv": nongov,
                   "revenue_contrib_type.csv": categories}
        with patch.object(fusion, "load", side_effect=lambda name: sources[name].copy()), \
                patch.object(pd.DataFrame, "to_csv"):
            frame = fusion.fuse_revenue()
        self.assertEqual(set(frame.entity), {"UN Secretariat"})
        self.assertEqual(frame.amount.sum(), 100)
        self.assertEqual(frame.loc[frame.donor_name == "Germany", "amount"].sum(), 40)
        self.assertEqual(frame.loc[frame.donor_name == "European Union", "amount"].sum(), 30)
        self.assertNotIn("Department-only Foundation", set(frame.donor_name))
        self.assertEqual(frame.loc[frame.donor_name == "Other Other - European Union", "amount"].sum(), 30)

    def test_whole_categories_use_source_names_but_real_breakdowns_keep_balances(self):
        controls = pd.DataFrame([
            dict(calendar_year=2024, agency=entity, rev_type=rev, amount=amount)
            for entity, rev, amount in [
                ("UNDP", "R03E", 100), ("UNDP", "R02A", 50), ("UNDP", "R04A", 25),
                ("UNICEF", "R03E", 100), ("UNICEF", "R04A", -10), ("UNICEF", "R02A", 0),
            ]
        ])
        # These contributors cancel out, but still constitute a breakdown.
        nongov = pd.DataFrame([
            dict(calendar_year=2024, entity="UNDP", rev_type="R03E", contrib_type="C05",
                 donor=name, amount=amount)
            for name, amount in [("Foundation A", 20), ("Foundation B", -20)]
        ])
        categories = pd.DataFrame([
            dict(calendar_year=2024, entity=entity, rev_type=rev, contrib_type=code, amount=amount)
            for entity, rev, code, amount in [
                ("UNDP", "R03E", "C05", 100), ("UNDP", "R02A", "C05", 50),
                ("UNDP", "R04A", "C09", 25), ("UNICEF", "R03E", "C02", 100),
                ("UNICEF", "R04A", "C09", -10), ("UNICEF", "R02A", "C03", 0),
            ]
        ])
        sources = {
            "revenue.csv": controls,
            "revenue_government_donors.csv": pd.DataFrame(columns=[
                "calendar_year", "entity", "rev_type", "contrib_type", "government_donor", "amount"]),
            "revenue_non_gov_donors.csv": nongov, "revenue_contrib_type.csv": categories,
            "revenue_by_financing_instruments_and_government_contributors.csv": pd.DataFrame(
                columns=["calendar_year", "entity", "sub_entity"]),
            "expenses_sub_agency.csv": pd.DataFrame(columns=["calendar_year", "agency", "sub_agency"]),
        }
        with patch.object(fusion, "load", side_effect=lambda name: sources[name].copy()), \
                patch.object(pd.DataFrame, "to_csv"):
            frame = fusion.fuse_revenue()
        self.assertEqual(frame.amount.sum(), 265)
        totals = frame[frame.source_file == "revenue_contrib_type.csv"]
        self.assertEqual(set(totals.donor_name), {"No contributor", "NGOs", "Public Private Partnership"})
        self.assertTrue((totals.record_kind == "reported_aggregate").all())
        self.assertFalse(totals.is_other.any())
        self.assertEqual(totals.loc[totals.donor_name == "No contributor", "amount"].tolist(), [25, -10])
        self.assertEqual(totals.loc[totals.donor_name == "Public Private Partnership", "amount"].iloc[0], 0)
        balances = frame[frame.donor_name == "Other Foundations"]
        self.assertEqual(set(balances.rev_type), {"R02", "R03"})
        self.assertEqual(balances.amount.sum(), 150)
        self.assertTrue((balances.record_kind == "calculated_balance").all())
        frame["rev_cat"] = frame.rev_type.map(rev_category)
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            with patch.object(export, "OUT", out), patch.object(export, "YEARS", [2024]), \
                    patch.object(pd, "read_csv", return_value=controls):
                export.export_donors_json(frame, {})
                export.export_entity_revenue_json(frame)
                export.export_contributor_trends_json(frame)
            donors = json.loads((out / "donors-2024.json").read_text())
            entities = json.loads((out / "entity-revenue-2024.json").read_text())
            trends = json.loads((out / "contributor-trends.json").read_text())
        self.assertNotIn("Other No contributor", donors)
        self.assertEqual(donors["No contributor"]["record_kind"], "reported_aggregate")
        self.assertEqual(donors["No contributor"]["contributions"]["UNICEF"]["Other"], -10)
        self.assertEqual(entities["UNICEF"]["total"], 90)
        self.assertEqual(trends["categoryContributors"]["NGOs"]["NGOs"][0]["total"], 100)

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
                                 government_donor="Miscellaneous", amount=50)])
        nongov = pd.DataFrame([dict(calendar_year=2016, entity="UNDP", rev_type="R09", contrib_type="2",
                                    donor="European Union", amount=30)])
        sources = {"revenue.csv": controls,
                   "revenue_government_donors.csv": gov, "revenue_non_gov_donors.csv": nongov,
                   "revenue_contrib_type.csv": pd.DataFrame(columns=["calendar_year", "entity", "contrib_type", "rev_type", "amount"]),
                   "revenue_by_financing_instruments_and_government_contributors.csv": pd.DataFrame(columns=["calendar_year", "entity", "sub_entity"]),
                   "expenses_sub_agency.csv": pd.DataFrame(columns=["calendar_year", "agency", "sub_agency"])}
        with patch.object(fusion, "load", side_effect=lambda name: sources[name].copy()), patch.object(pd.DataFrame, "to_csv"):
            frame = fusion.fuse_revenue()
        self.assertEqual(frame.loc[frame.financing_resolved, "amount"].sum(), 50)
        self.assertEqual(frame.loc[~frame.financing_resolved, "amount"].sum(), 50)
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
        self.assertEqual(donor["contributions"], {"UNDP": {"Unresolved": 30}})
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
        self.assertEqual(trends["aggregates"]["all"][0]["voluntary_earmarked"], 100)
        self.assertEqual(trends["aggregates"]["all"][0]["unresolved"], 0)
        self.assertEqual(trends["contributors"]["European Union"][0]["unresolved"], 30)
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

    def test_eligible_source_observations_and_provenance_are_preserved(self):
        fused = pd.read_csv(ROOT / "data/ceb/fused/revenue_by_contributor.csv")
        controls = pd.read_csv(ROOT / "data/ceb/clean/revenue.csv")
        reporting = set(zip(controls.calendar_year, controls.agency.map(normalize_entity)))
        control_years = set(controls.calendar_year)
        for filename, donor_column in [("revenue_government_donors.csv", "government_donor"),
                                       ("revenue_non_gov_donors.csv", "donor")]:
            raw = pd.read_csv(ROOT / "data/ceb/raw" / filename)
            raw["source_row"] = raw.index + 2
            source_entities = raw.entity.map(normalize_entity).replace({"DPO": normalize_entity("UN-DPO")})
            eligible = pd.Series([
                (year, entity) in reporting or
                (filename == "revenue_non_gov_donors.csv" and year not in control_years)
                for year, entity in zip(raw.calendar_year, source_entities)
            ], index=raw.index)
            expected = raw[eligible].dropna(subset=["amount"]).reset_index(drop=True)
            actual = fused[fused.source_file == filename].sort_values("source_row").reset_index(drop=True)
            self.assertEqual(len(actual), len(expected), filename)
            pd.testing.assert_series_equal(actual.source_row.astype(int), expected.source_row, check_names=False)
            pd.testing.assert_series_equal(actual.amount, expected.amount, check_names=False, check_exact=False, rtol=1e-12, atol=1e-6)
            for actual_column, source_column in [("source_donor_name", donor_column),
                                                 ("source_contrib_type", "contrib_type"),
                                                 ("source_rev_type", "rev_type")]:
                self.assertEqual(actual[actual_column].fillna("").astype(str).tolist(),
                                 expected[source_column].fillna("").astype(str).tolist())
            un_records = actual[actual.entity == "UN Secretariat"]
            self.assertTrue(raw.loc[un_records.source_row.astype(int) - 2, "entity"].eq("UN").all())


if __name__ == "__main__":
    unittest.main()
