"""Organization aliases and source-supported parent rollups stay consistent."""
import json
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from ceb_data import resolve_reporting_entities, resolve_geographic_reporting_entities
from utils import normalize_entity


class OrganizationIdentityTests(unittest.TestCase):
    def test_adjusted_labels_are_shared_and_idempotent(self):
        aliases = {
            "UN": "UN Secretariat",
            "UN-DPO": "Peacekeeping Operations",
            "DPKO": "Peacekeeping Operations",
            "UNHABITAT": "UN-Habitat",
            "UN-HABITAT": "UN-Habitat",
            "UNWOMEN": "UN Women",
            "UN-Women": "UN Women",
            "UNWTO": "UN Tourism",
        }
        for source, label in aliases.items():
            with self.subTest(source=source):
                self.assertEqual(normalize_entity(source), label)
                self.assertEqual(normalize_entity(label), label)

    def test_ceb_dpo_alias_does_not_rename_the_secretariat_department(self):
        self.assertEqual(normalize_entity("DPO"), "DPO")
        controls = pd.DataFrame({"calendar_year": [2023], "agency": ["UN-DPO"]})
        detail = pd.DataFrame({"calendar_year": [2023], "entity": ["DPO"], "amount": [10.0]})
        result = resolve_reporting_entities(detail, "entity", controls, [])
        self.assertEqual(result.entity.tolist(), ["Peacekeeping Operations"])
        self.assertEqual(result.amount.tolist(), [10.0])

    def test_rollup_uses_same_year_source_and_keeps_standalone_controls(self):
        controls = pd.DataFrame({
            "calendar_year": [2023, 2024, 2024],
            "agency": ["UN", "UN", "Example unit"],
        })
        source = pd.DataFrame({
            "calendar_year": [2023, 2024],
            "agency": ["UN", "UN"],
            "sub_agency": ["Example unit", "Example unit"],
        })
        detail = pd.DataFrame({
            "calendar_year": [2023, 2024],
            "entity": ["Example unit", "Example unit"],
            "amount": [12.5, -3.0],
        })
        result = resolve_reporting_entities(detail, "entity", controls, [(source, "agency", "sub_agency")])
        self.assertEqual(result.entity.tolist(), ["UN Secretariat", "Example unit"])
        self.assertEqual(result.amount.tolist(), [12.5, -3.0])
        with self.assertRaisesRegex(ValueError, "Unresolved CEB reporting entity"):
            resolve_reporting_entities(detail, "entity", controls, [(source[source.calendar_year == 2024], "agency", "sub_agency")])
        ambiguous_controls = pd.DataFrame({"calendar_year": [2023, 2023], "agency": ["UN", "UNDP"]})
        ambiguous_source = pd.DataFrame({
            "calendar_year": [2023, 2023], "agency": ["UN", "UNDP"],
            "sub_agency": ["Example unit", "Example unit"],
        })
        with self.assertRaisesRegex(ValueError, "Unresolved CEB reporting entity"):
            resolve_reporting_entities(detail.iloc[:1], "entity", ambiguous_controls, [(ambiguous_source, "agency", "sub_agency")])

    def test_published_revenue_and_spending_use_adjusted_organization_labels(self):
        for path in (ROOT / "public/data").glob("entity-*.json"):
            if not path.stem.removeprefix("entity-revenue-").isdigit() and not path.stem.removeprefix("entity-spending-").isdigit():
                continue
            data = json.loads(path.read_text())
            names = list(data) if isinstance(data, dict) else [row["entity"] for row in data]
            for name in names:
                with self.subTest(file=path.name, name=name):
                    self.assertEqual(name, normalize_entity(name))

    def test_geography_uses_only_explicit_same_year_parent_relationships(self):
        controls = pd.DataFrame({
            "calendar_year": [2017, 2018, 2020, 2021, 2021],
            "agency": ["UN", "UN", "UN", "UN", "UNRISD"],
            "sub_agency": [None, "UN-UNRISD", "UN-Tech Bank", "UN-UNRISD", None],
        })
        source = pd.DataFrame({
            "calendar_year": [2017, 2018, 2020, 2021],
            "agency": ["UNRISD", "UNRISD", "Tech Bank", "UNRISD"],
            "amount": [2.0, 3.0, -1.0, 4.0],
        })
        result = resolve_geographic_reporting_entities(source, controls)
        self.assertEqual(result.agency.tolist(), ["UNRISD", "UN Secretariat", "UN Secretariat", "UNRISD"])
        self.assertEqual(result.source_agency.tolist(), source.agency.tolist())
        self.assertEqual(result.amount.tolist(), source.amount.tolist())
        ambiguous = pd.DataFrame({"calendar_year": [2018, 2018], "agency": ["UN", "UNDP"],
                                  "sub_agency": ["UNRISD", "UNRISD"]})
        with self.assertRaisesRegex(ValueError, "Ambiguous geographic reporting parent"):
            resolve_geographic_reporting_entities(source[source.calendar_year == 2018], ambiguous)


if __name__ == "__main__":
    unittest.main()
