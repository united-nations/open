"""Contract tests for shared domain taxonomies under data/."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


PYTHON_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = PYTHON_DIR.parent
sys.path.insert(0, str(PYTHON_DIR))

from domain_taxonomies import (  # noqa: E402
    load_organization_taxonomies,
    load_sdgs,
    load_secretariat_taxonomies,
)


class DomainTaxonomyTests(unittest.TestCase):
    def test_all_taxonomies_validate(self) -> None:
        self.assertEqual(len(load_sdgs()["goals"]), 17)
        self.assertTrue(load_organization_taxonomies()["system_groupings"])
        self.assertEqual(len(load_secretariat_taxonomies()["budget_parts"]), 14)

    def test_entity_trend_groups_are_classified(self) -> None:
        trend_path = REPO_ROOT / "public/data/entity-trends.json"
        if not trend_path.exists():
            self.skipTest("entity-trends.json is not present")

        import json

        trend_groups = set(
            json.loads(trend_path.read_text(encoding="utf-8"))["meta"][
                "systemGroups"
            ]
        )
        taxonomy_groups = {
            row["key"]
            for row in load_organization_taxonomies()["system_groupings"]
        }
        self.assertEqual(trend_groups - taxonomy_groups, set())

    def test_budget_exporter_uses_the_shared_taxonomy(self) -> None:
        exporter_path = PYTHON_DIR / "12-export_budget_json.py"
        spec = importlib.util.spec_from_file_location(
            "export_budget_json", exporter_path
        )
        assert spec and spec.loader
        exporter = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(exporter)

        taxonomy = load_secretariat_taxonomies()
        self.assertEqual(
            exporter.PART_DESCRIPTIONS,
            {part["code"]: part["label"] for part in taxonomy["budget_parts"]},
        )
        self.assertEqual(
            exporter.MISSION_NAMES,
            taxonomy["peacekeeping_mission_names"],
        )

    def test_taxonomies_do_not_contain_presentation_colors(self) -> None:
        def keys(value: object) -> set[str]:
            if isinstance(value, dict):
                return set(value) | set().union(*(keys(v) for v in value.values()))
            if isinstance(value, list):
                return set().union(*(keys(v) for v in value))
            return set()

        for taxonomy in (
            load_sdgs(),
            load_organization_taxonomies(),
            load_secretariat_taxonomies(),
        ):
            self.assertTrue(
                {"color", "bgColor", "textColor", "hexColor"}.isdisjoint(
                    keys(taxonomy)
                )
            )


if __name__ == "__main__":
    unittest.main()
