"""Contents headings must stay annual, source-backed, and independent of entities."""

import json
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from trust_fund_groups import annotate_groups, groups_from_pages


class TrustFundGroupsTests(unittest.TestCase):
    def test_multiline_heading_wrapped_fund_code_and_missing_number(self):
        result = groups_from_pages([[
            "DSA", "UNITED NATIONS OFFICE FOR PARTNERSHIPS", "Schedule", "7.1",
            "A fund ABC", "UNITED NATIONS TRUST FUNDS MANAGED BY MULTI-PARTNER",
            "TRUST FUND", "Schedule", "8.1",
        ]])
        self.assertEqual([r["schedule_group_code"] for r in result], ["7", "8"])
        self.assertEqual(result[0]["schedule_group_name"], "United Nations Office for Partnerships")
        self.assertEqual(result[1]["schedule_group_name"],
                         "United Nations trust funds managed by Multi-Partner Trust Fund")
        with self.assertRaises(ValueError):
            groups_from_pages([["POLITICAL AFFAIRS", "Schedule", "No number"]])
        with self.assertRaises(ValueError):
            groups_from_pages([["POLITICAL AFFAIRS", "Schedule", "1.1",
                                "POLITICAL AFFAIRS", "Schedule", "1.2"]])

    def test_complete_corpus_and_exports_preserve_annual_group_membership(self):
        fund_years = pd.read_csv(ROOT / "data/trust-fund-schedules/stage2/fund-years.csv",
                                 dtype={"base_schedule_number": str})
        manifest = json.loads((ROOT / "data/trust-fund-schedules/source-manifest.json").read_text())
        annual, groups = annotate_groups(fund_years, manifest)
        self.assertEqual(len(annual), len(fund_years))
        self.assertEqual(len(groups), len(manifest) * 8)
        expected_names = [
            "Political affairs", "International justice and law", "Economic and social development",
            "Human rights and humanitarian affairs", "Public information",
            "Common support and miscellaneous", "United Nations Office for Partnerships",
            "United Nations trust funds managed by Multi-Partner Trust Fund",
        ]
        for source in manifest:
            year = int(source["calendar_year"])
            headings = groups.loc[groups.calendar_year.eq(year)]
            self.assertEqual(headings.schedule_group_name.tolist(), expected_names, year)
            exported = json.loads((ROOT / f"public/data/budget-trust-funds-{year}.json").read_text())
            nodes = {n["code"]: n for n in exported["nodes"]
                     if n["tier"] == "detail" and n.get("sourceGroup") == "volume_i" and not n.get("fundAccountType")}
            selected = annual.loc[annual.calendar_year.eq(year)]
            self.assertEqual(set(nodes), set(selected.fund_code))
            for row in selected.itertuples():
                group = nodes[row.fund_code]["scheduleGroup"]
                self.assertEqual(group["code"], row.base_schedule_number.split(".")[0])
                self.assertEqual(group["label"], row.schedule_group_name)
                self.assertEqual(group["source"]["pdfPage"], row.heading_pdf_page)
                self.assertIn("Contents", group["source"]["tableTitle"])
            self.assertFalse(selected.schedule_group_code.eq("8").any())
            sim = nodes["SIM"]["scheduleGroup"]["code"]
            self.assertEqual(sim, "4" if year < 2020 else "2")
        # Unresolved organizational mappings still have an explicit source group.
        latest = annual.loc[annual.calendar_year.eq(2024)].set_index("fund_code")
        self.assertEqual(latest.loc["ANC", "schedule_group_code"], "1")
        self.assertEqual(latest.loc["SWE", "schedule_group_code"], "3")
