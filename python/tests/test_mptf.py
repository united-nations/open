"""Financial controls, routing provenance and replay safety for MPTF snapshots."""
import hashlib
import shutil
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from decimal import Decimal

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
spec = importlib.util.spec_from_file_location("mptf_export", ROOT / "python/28-export_mptf.py")
mptf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mptf)


class MptfTests(unittest.TestCase):
    def annual(self, year):
        return json.loads((ROOT / f"public/data/pooled-funds-{year}.json").read_text())

    def test_published_peacebuilding_2024_controls(self):
        # Administrative Agent 2024 report, Table 1, printed p.5. The PDF rounds USD.
        fund = self.annual(2024)["funds"]["PB000"]
        self.assertAlmostEqual(fund["grossDeposits"], 125606054, delta=0.5)
        self.assertAlmostEqual(fund["netTransfers"], 140589251, delta=0.5)
        self.assertAlmostEqual(fund["expenditure"], 182599824, delta=0.5)

    def test_feeder_classification_reconciles_published_2025_deposits(self):
        annual = self.annual(2025)
        feeder = sum(Decimal(str(row["deposit"])) for fund in annual["funds"].values() for row in fund["contributors"] if row["sourceType"] == "MULTILATERAL_FEEDER_FUND")
        self.assertEqual(feeder, Decimal("102814193.13"))
        self.assertAlmostEqual(annual["totals"]["deposits"] / 1e6, 817.8, delta=0.05)
        # The UN's contribution remains distinct from feeder-fund routing.
        un = [r for r in annual["funds"]["PB000"]["contributors"] if r["id"] == "UNITEDNATION_GROUP_0004"]
        self.assertEqual(sum(r["deposit"] for r in un), 6000000)
        self.assertTrue(all(r["sourceType"] != mptf.FEEDER_TYPE for r in un))

    def test_every_year_reconciles_and_preserves_signed_source_rows(self):
        for year in range(2016, 2026):
            annual = self.annual(year)
            for key in ["grossDeposits", "deposits", "routedDeposits", "netTransfers", "expenditure"]:
                value = sum(Decimal(str(fund[key])) for fund in annual["funds"].values() if fund[key] is not None)
                self.assertLess(abs(value - Decimal(str(annual["totals"][key]))), Decimal("0.0001"), (year, key))
        self.assertTrue(any(fund["netTransfers"] is not None and fund["netTransfers"] < 0 for fund in self.annual(2025)["funds"].values()))
        self.assertIn("LBY00", self.annual(2025)["funds"], "Refund-only accounts must remain in registry")
        self.assertEqual(self.annual(2025)["funds"]["-"]["grossDeposits"], 0.01)

    def test_truncation_and_modified_source_controls_fail_closed(self):
        raw = (ROOT / "data/mptf/raw/funds-2025.json").read_bytes()
        value = mptf.decoded(raw)
        value["data"].pop()
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            mptf.decoded(json.dumps(value))
        value = mptf.decoded(raw)
        value["data"][0]["DEPOSIT"] = "99"
        with self.assertRaisesRegex(ValueError, "reconcile"):
            mptf.verify_control(value, "DEPOSIT")

    def test_partial_replay_preserves_full_registry_and_history(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(mptf, "OUT", Path(tmp)), patch.object(sys, "argv", ["28-export_mptf.py", "--years", "2025"]):
            mptf.main()
            index = json.loads((Path(tmp) / "pooled-funds.json").read_text())
            self.assertEqual(index["meta"]["years"], list(range(2016, 2026)))
            for annual in index["annual"]:
                self.assertTrue(set(annual["funds"]) <= set(index["funds"]))
                self.assertTrue((Path(tmp) / f"pooled-funds-{annual['year']}.json").exists())
                sources = json.loads((ROOT / "data/mptf/source-manifest.json").read_text())
                self.assertEqual(annual["snapshotAt"], max(row["retrievedAt"] for row in sources if row["year"] == annual["year"]))

    def test_rejected_refresh_preserves_retained_sources_and_exports(self):
        records = [row for row in json.loads((ROOT / "data/mptf/source-manifest.json").read_text()) if row["year"] == 2025]
        def candidate(item):
            kind, year = item
            raw = (ROOT / f"data/mptf/raw/{kind}-{year}.json").read_bytes()
            if kind == "funds":
                value = mptf.decoded(raw)
                value["data"][0]["DEPOSIT"] = "99"
                raw = json.dumps(value).encode()
            record = dict(next(row for row in records if row["kind"] == kind))
            record.update(sha256=hashlib.sha256(raw).hexdigest(), retrievedAt="2099-01-01T00:00:00+00:00")
            return record, raw
        with tempfile.TemporaryDirectory() as tmp:
            data, out = Path(tmp) / "data", Path(tmp) / "public"
            (data / "raw").mkdir(parents=True)
            out.mkdir()
            for row in records:
                shutil.copy(ROOT / f"data/mptf/raw/{row['kind']}-2025.json", data / f"raw/{row['kind']}-2025.json")
            (data / "source-manifest.json").write_text(json.dumps(records))
            (data / "identity-aliases.json").write_text("{}")
            (out / "pooled-funds.json").write_text("retained browser export")
            before = {path.relative_to(tmp): path.read_bytes() for path in Path(tmp).rglob("*") if path.is_file()}
            with patch.object(mptf, "DATA", data), patch.object(mptf, "OUT", out), patch.object(mptf, "fetch_source", side_effect=candidate), patch.object(sys, "argv", ["28-export_mptf.py", "--fetch", "--years", "2025"]):
                with self.assertRaisesRegex(ValueError, "reconcile"):
                    mptf.main()
            after = {path.relative_to(tmp): path.read_bytes() for path in Path(tmp).rglob("*") if path.is_file()}
            self.assertEqual(after, before)

    def test_internal_links_exist_in_the_same_year_and_ngo_channels_stay_separate(self):
        for year in range(2016, 2026):
            annual = self.annual(year)
            donors = json.loads((ROOT / f"public/data/donors-{year}.json").read_text())
            organizations = set(json.loads((ROOT / f"public/data/entity-revenue-{year}.json").read_text()))
            organizations.update(r["entity"] for r in json.loads((ROOT / f"public/data/entity-spending-{year}.json").read_text()))
            for fund in annual["funds"].values():
                for row in fund["contributors"]:
                    if row["portalName"]:
                        self.assertIn(row["portalName"], donors)
                for row in fund["organizations"]:
                    if row["portalName"]:
                        self.assertIn(row["portalName"], organizations)
                    if "NGO/UNDP" in row["name"]:
                        self.assertIsNone(row["portalName"])

    def test_missing_and_reported_zero_are_distinct(self):
        self.assertIsNone(mptf.amount(None))
        self.assertEqual(mptf.amount(".000"), Decimal(0))
        self.assertIsNone(mptf.total([Decimal(1), None]))
        self.assertEqual(mptf.amount("279588.366"), Decimal("279588.366"))


if __name__ == "__main__":
    unittest.main()
