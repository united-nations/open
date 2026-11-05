"""Schedule 8.1 must retain annual named columns, signed amounts and scope."""

import json
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from trust_fund_mptf import extract_mptf, entity_crosswalk, merge_positions


class TrustFundMptfTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / "data/trust-fund-schedules/source-manifest.json").read_text())
        cls.bundles = {source["calendar_year"]: extract_mptf(source) for source in cls.manifest}

    def test_all_source_expense_totals_and_columns(self):
        controls = {2017: (4, 351465390), 2018: (4, 482326447), 2019: (4, 584791664),
                    2020: (5, 578584742), 2021: (5, 533653391), 2022: (5, 908038775),
                    2023: (5, 270299994), 2024: (6, 163733038)}
        for year, (count, amount) in controls.items():
            facts, checks, tables = self.bundles[year]
            rows = [r for r in facts if r["period_year"] == year and r["line_item"] == "Total expenses"]
            self.assertEqual(len(rows), count, year)
            self.assertEqual(sum(r["amount_usd"] for r in rows), amount, year)
            self.assertEqual(len(tables), 4)
            self.assertTrue(all(r["difference_usd"] == 0 for r in checks
                                if r["period_year"] == year and r["line_item"] == "Total expenses"))

    def test_rotated_2024_matrix_and_negative_funds(self):
        rows = {r["fund_id"]: r for r in self.bundles[2024][0]
                if r["period_year"] == 2024 and r["line_item"] == "Total expenses"}
        self.assertEqual(rows["mptf:peacebuilding-fund"]["amount_usd"], 142432342)
        self.assertEqual(rows["mptf:spotlight-initiative-2-0-fund"]["amount_usd"], 180883)
        self.assertEqual(rows["mptf:haiti-cholera-response-fund"]["amount_usd"], -65084)
        self.assertEqual(rows["mptf:covid-19-response-and-recovery-fund"]["amount_usd"], -403933)
        self.assertEqual(rows["mptf:digital-cooperation-fund"]["amount_usd"], 2464365)
        self.assertEqual({r["page"] for r in rows.values()}, {431})
        self.assertEqual(rows["mptf:peacebuilding-fund"]["source_column"], "UN Peacebuilding Fund")

    def test_comparatives_reorder_funds_without_inventing_history(self):
        rows = self.bundles[2023][0]
        current = {r["fund_id"] for r in rows if r["period_year"] == 2023}
        comparative = {r["fund_id"] for r in rows if r["period_year"] == 2022}
        self.assertIn("mptf:digital-cooperation-fund", current)
        self.assertNotIn("mptf:migration-fund", current)
        self.assertIn("mptf:migration-fund", comparative)
        self.assertNotIn("mptf:digital-cooperation-fund", comparative)
        checks = self.bundles[2023][1]
        differences = [r for r in checks if r["difference_usd"]]
        self.assertEqual({r["period_year"] for r in differences}, {2022})
        self.assertEqual({r["difference_usd"] for r in differences}, {237546})

    def test_blanks_stay_unknown_and_dashes_stay_zero(self):
        rows = self.bundles[2019][0]
        blank = next(r for r in rows if r["period_year"] == 2019
                     and r["fund_id"] == "mptf:peacebuilding-fund" and r["line_item"] == "Other liabilities")
        self.assertIsNone(blank["amount_usd"])
        self.assertEqual(blank["reported_text"], "")
        zero = next(r for r in rows if r["period_year"] == 2019
                    and r["fund_id"] == "mptf:migration-fund" and r["line_item"] == "Investment revenue")
        self.assertEqual(zero["amount_usd"], 0)
        self.assertTrue(zero["reported_as_dash"])

    def test_attribution_uses_arwo_evidence_without_copying_amounts(self):
        mapping = entity_crosswalk()
        self.assertEqual(mapping["mptf:common-humanitarian-fund"]["entity_code"], "OCHA")
        self.assertEqual(mapping["mptf:digital-cooperation-fund"]["entity_code"], "ODET")
        self.assertEqual(mapping["mptf:peacebuilding-fund"]["entity_code"], "MPTF-PBF")
        self.assertTrue(all(row["evidence"] for row in mapping.values()))
        self.assertTrue(all("AMOUNT" not in evidence for row in mapping.values() for evidence in row["evidence"]))

    def test_unitemized_positions_do_not_turn_into_zero_balances(self):
        def position(key, value):
            return {"fundCount": 1, "metrics": [{"key": key, "label": key, "amount": value,
                                               "fundsCovered": 1, "supportingSources": []}]}
        combined = merge_positions([position("cash", 50), position("netAssets", 10)], 2024)
        self.assertEqual(combined["fundCount"], 2)
        self.assertTrue(all(row["amount"] is None for row in combined["metrics"]))
        self.assertEqual(combined["metrics"][0]["fundsCovered"], 1)

    def test_exports_include_each_source_account_once_and_preserve_coded_funds(self):
        coded = pd.read_csv(ROOT / "data/trust-fund-schedules/stage2/statement-facts.csv")
        for year in self.bundles:
            payload = json.loads((ROOT / f"public/data/budget-trust-funds-{year}.json").read_text())
            mptf = [n for n in payload["nodes"] if n.get("fundAccountType") == "mptf"]
            expected = [r for r in self.bundles[year][0]
                        if r["period_year"] == year and r["line_item"] == "Total expenses"]
            self.assertEqual(len(mptf), len(expected))
            self.assertEqual(len({n["id"] for n in mptf}), len(expected))
            self.assertTrue(all(n["code"] is None and n["scheduleGroup"]["code"] == "8" for n in mptf))
            self.assertTrue(all(n["contributorsAvailable"] is False for n in mptf))
            for row in expected:
                node = next(n for n in mptf if n["id"].endswith(":fund:" + row["fund_id"]))
                self.assertEqual(node["amount"], row["amount_usd"])
                self.assertEqual(node["supportingSources"][0]["pdfPage"], row["page"])
                self.assertEqual(node["supportingSources"][0]["columnHeader"], row["source_column"])
            known = coded.loc[coded.calendar_year.eq(year) & coded.period_year.eq(year)
                              & coded.statement_type.eq("financial_performance") & coded.line_item.eq("Total expenses")]
            volume = next(group for group in payload["meta"]["sourceGroups"] if group["id"] == "volume_i")
            self.assertEqual(volume["amount"], int(known.amount_usd.sum()) + sum(n["amount"] for n in mptf))
            for row in known.itertuples():
                node = next(n for n in payload["nodes"] if n["tier"] == "detail" and n["code"] == row.fund_code)
                self.assertEqual(node["amount"], row.amount_usd)
            self.assertTrue(all(n["label"] != "Spotlight Initiative 2.0 Fund" for n in mptf) if year < 2024 else True)
