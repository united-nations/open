"""UN terminology is consistent without dropping source qualifiers or amounts."""
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
from utils import TAIWAN_NAME, TAIWAN_NAME_ALIASES, clean_donor_name, normalize_country_name


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "python" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


expenses = load_module("terminology_expenses", "07-export_expenses_json.py")
geography = load_module("terminology_geography", "20-export_geographic_expenses.py")
flows = load_module("terminology_flows", "19-export_system_flows.py")


class CountryTerminologyTests(unittest.TestCase):
    def test_known_aliases_and_unrecognized_markers(self):
        for name in [*TAIWAN_NAME_ALIASES, TAIWAN_NAME]:
            with self.subTest(name=name):
                self.assertEqual(clean_donor_name(name), TAIWAN_NAME)
                self.assertEqual(normalize_country_name(name), TAIWAN_NAME)
                self.assertEqual(expenses.get_iso3(name), "TWN")
        self.assertEqual(clean_donor_name("Kosovo**"), "Kosovo")
        for name in ["Falkland Islands (Malvinas)", "Saint Martin (French part)",
                     "University (College) of the West Indies", "Unrecognized contributor*"]:
            self.assertEqual(clean_donor_name(name), name)

    def test_geographic_exports_share_label_and_keep_source_metadata(self):
        source_name = "Taiwan (Province of China)"
        source = pd.DataFrame([{
            "calendar_year": 2024, "agency": "UNDP", "country/territory": source_name,
            "location_type": "COU", "region": "Asia", "amount": 123,
        }])
        country = pd.DataFrame([dict(year=2024, iso3="TWN", country=source_name,
                                     region="Asia", entity="UNDP", amount=123.0)])
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(expenses, "OUT", Path(directory)):
                expenses.export_country_expenses(country)
            row = json.loads((Path(directory) / "country-expenses-2024.json").read_text())[0]
        self.assertEqual(row["name"], TAIWAN_NAME)
        self.assertEqual(row["iso3"], "TWN")
        self.assertEqual(row["total"], 123)
        row = geography.build_geography(source)[2024][0]
        self.assertEqual(row["name"], TAIWAN_NAME)
        self.assertEqual(row["sourceLabels"], [source_name])
        self.assertEqual(row["total"], 123)
        totals = pd.DataFrame([dict(calendar_year=2024, agency="UNDP", amount=123)])
        goals = pd.DataFrame([dict(calendar_year=2024, entity_code="UNDP", amount=123, sdg_goal="1")])
        row = flows.build_export(totals, source, goals)["data"][0]["entities"]["UNDP"]["geography"][0]
        self.assertEqual(row["label"], TAIWAN_NAME)
        self.assertEqual(row["sourceLabel"], source_name)
        self.assertEqual(row["amount"], 123)


if __name__ == "__main__":
    unittest.main()
