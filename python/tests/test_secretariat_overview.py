"""Regression tests for the Secretariat overview export contract."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

import pandas as pd


MODULE_PATH = Path(__file__).resolve().parents[1] / "11-export_secretariat_json.py"
sys.path.insert(0, str(MODULE_PATH.parent))
SPEC = importlib.util.spec_from_file_location("export_secretariat_json", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SecretariatOverviewTests(unittest.TestCase):
    def test_entity_groups_come_from_validated_source_data(self) -> None:
        classifications = MODULE.SECRETARIAT_ENTITIES["entities"]
        self.assertEqual(classifications["UNHCR"]["group"], "other")
        self.assertEqual(classifications["BINUH"]["group"], "spm")
        self.assertEqual(classifications["MONUSCO"]["group"], "pko")
        self.assertEqual(classifications["DOS"]["group"], "secretariat")

    def test_primary_priority_is_only_a_placement_hint(self) -> None:
        frame = pd.DataFrame(
            [
                {
                    "entity": "DESA",
                    "priority_area": "Priority A",
                    "source_type": "Regular assessed",
                    "amount": 70,
                },
                {
                    "entity": "DESA",
                    "priority_area": "Priority B",
                    "source_type": "Voluntary",
                    "amount": 30,
                },
                {
                    "entity": "STA",
                    "priority_area": "Priority A",
                    "source_type": "Regular assessed",
                    "amount": 40,
                },
                {
                    "entity": "STA",
                    "priority_area": "Priority B",
                    "source_type": "Regular assessed",
                    "amount": 60,
                },
            ]
        )

        result = MODULE.build_overview(2023, frame)
        entities = {entity["code"]: entity for entity in result["entities"]}

        self.assertEqual(result["meta"]["total"], 200)
        self.assertEqual(entities["DESA"]["primary_priority"], "Priority A")
        self.assertFalse(entities["DESA"]["split_across_priorities"])
        self.assertEqual(entities["DESA"]["group"], "secretariat")
        self.assertEqual(entities["STA"]["primary_priority"], "Priority B")
        self.assertTrue(entities["STA"]["split_across_priorities"])
        self.assertEqual(
            sum(cell["amount"] for cell in entities["DESA"]["cells"]),
            entities["DESA"]["total"],
        )


if __name__ == "__main__":
    unittest.main()
