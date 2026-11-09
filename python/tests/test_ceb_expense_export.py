"""System expenses retain CEB aggregates and signed organization totals."""
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
spec = importlib.util.spec_from_file_location("ceb_expense_export", ROOT / "python/06-export_ceb_expenses.py")
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)


class CebExpenseExportTests(unittest.TestCase):
    def test_only_ceb_is_read_and_signed_normalized_totals_are_retained(self):
        source = pd.DataFrame([
            (2024, "UN", 100),
            (2024, "UN", -5),
            (2024, "UN-DPO", 40),
            (2024, "UNEP", 20),
            (2024, "UNODC", -3),
            (2025, "UN", 200),
        ], columns=["calendar_year", "agency", "amount"])
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(export.pd, "read_csv", return_value=source) as read_csv, \
                    patch.object(export, "fused", Path(directory)):
                result = export.export_expenses()
            # No Secretariat input may supplement or replace these observations.
            read_csv.assert_called_once_with(export.clean / "expenses_sub_agency.csv")
            written = pd.read_csv(Path(directory) / "expenses.csv")
        expected = pd.DataFrame([
            (2024, "Peacekeeping Operations", 40, "ceb"),
            (2024, "UN Secretariat", 95, "ceb"),
            (2024, "UNEP", 20, "ceb"),
            (2024, "UNODC", -3, "ceb"),
            (2025, "UN Secretariat", 200, "ceb"),
        ], columns=["year", "entity", "amount", "source"])
        pd.testing.assert_frame_equal(result.reset_index(drop=True), expected)
        pd.testing.assert_frame_equal(written, expected)

    def test_validation_rejects_replaced_aggregate_and_additive_assessed_amounts(self):
        ceb = pd.DataFrame([
            (2024, "UN Secretariat", 100),
            (2024, "UNEP", 20),
        ], columns=["year", "entity", "amount"])
        for entity, amount in [("UN Secretariat", 99), ("UNEP", 21)]:
            changed = ceb.copy().assign(source="ceb")
            changed.loc[changed.entity == entity, "amount"] = amount
            with self.subTest(entity=entity), self.assertRaises(AssertionError):
                export.validate(changed, ceb)

    def test_published_manifest_has_no_fusion_metadata(self):
        manifest = json.loads((ROOT / "public/data/manifest.json").read_text())
        self.assertNotIn("fusionYears", manifest["entitySpending"])


if __name__ == "__main__":
    unittest.main()
