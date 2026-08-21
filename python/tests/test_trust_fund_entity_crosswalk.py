"""Regression tests for the trust-fund entity crosswalk."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import trust_fund_entity_crosswalk as crosswalk


class TrustFundEntityCrosswalkTests(unittest.TestCase):
    def test_name_normalization_is_presentation_only(self) -> None:
        self.assertEqual(
            crosswalk.normalize_fund_name(" Trust Fund: A & B (UNHQ) "),
            "trust fund a and b unhq",
        )

    def test_old_label_must_map_to_one_entity(self) -> None:
        frame = pd.DataFrame(
            {
                "NOTE": ["Same fund", "Same fund"],
                "audited_entity_code": ["A", "B"],
                "PRIORITY_AREA": ["P", "P"],
                "SECTION_ID": ["1", "1"],
                "YEAR": [2022, 2023],
                "normalized_fund_name": ["same fund", "same fund"],
            }
        )
        with self.assertRaisesRegex(ValueError, "multiple entities"):
            crosswalk.validate_old_open(frame)

    def test_duplicate_spelling_variants_are_safe_when_mapping_agrees(self) -> None:
        frame = pd.DataFrame(
            {
                "NOTE": ["Fund  name", "Fund name"],
                "audited_entity_code": ["A", "A"],
                "PRIORITY_AREA": ["P", "P"],
                "SECTION_ID": ["1", "1"],
                "YEAR": [2022, 2023],
                "normalized_fund_name": ["fund name", "fund name"],
            }
        )
        profile = crosswalk.validate_old_open(frame)
        self.assertEqual(profile["entity_ambiguous_labels"], 0)

    def test_ppb_absence_is_explicit_not_a_failed_fund_mapping(self) -> None:
        match = crosswalk.ppb_match("MISSION-X", {})
        self.assertEqual(match["ppb_mapping_status"], "not_in_ppb_dimension")
        self.assertIsNone(match["ppb_entity_id"])


if __name__ == "__main__":
    unittest.main()
