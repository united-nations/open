"""Descriptions must retain their annual fund identity and physical source pages."""

import json
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from trust_fund_descriptions import add_citation_links, description_blocks, descriptions_from_pages, extract_descriptions


class TrustFundDescriptionsTests(unittest.TestCase):
    def test_reviewed_citations_preserve_list_text_and_combined_symbols(self):
        blocks = description_blocks([
            "Sources:",
            "(a) 📄 The letter (A/69/389-S/2014/679).",
            "(b) See Security Council resolution 2177 (2014).",
        ])
        add_citation_links(blocks, "EER")
        first, second = blocks[1]["items"]
        self.assertEqual(first["text"], "📄 The letter (A/69/389-S/2014/679).")
        self.assertEqual(first["links"], [
            {"start": 15, "end": 34, "href": "https://digitallibrary.un.org/record/779651"},
        ])
        self.assertEqual(second["links"][0]["href"], "https://docs.un.org/S/RES/2177(2014)")

    def test_citation_excerpts_match_only_the_reviewed_fund_and_full_number(self):
        text = "Resolution 60/124 applies. Resolution 60/1241 also appears."
        blocks = description_blocks([text])
        add_citation_links(blocks, "OTHER")
        self.assertEqual(blocks, [{"type": "paragraph", "text": text}])
        add_citation_links(blocks, "CER")
        self.assertEqual(blocks[0]["links"], [
            {"start": 0, "end": 17, "href": "https://docs.un.org/A/RES/60/124"},
        ])

    def test_lettered_lists_keep_wrapping_and_subsequent_prose(self):
        blocks = description_blocks([
            "The sub-accounts under this Trust Fund are:",
            "(a) Sub-fund of the United Nations Voluntary Fund",
            "for Indigenous Populations.",
            "(b)",
            "Sub-account of the United Nations Fund for Indigenous Populations.",
            "", "Further information follows the list.",
        ])
        self.assertEqual([block["type"] for block in blocks], ["paragraph", "list", "paragraph"])
        self.assertEqual(blocks[1]["items"], [
            {"label": "a", "text": "Sub-fund of the United Nations Voluntary Fund for Indigenous Populations."},
            {"label": "b", "text": "Sub-account of the United Nations Fund for Indigenous Populations."},
        ])
        inline = "This fund aims to (a) promote cooperation and (b) support activities."
        self.assertEqual(description_blocks([inline]), [{"type": "paragraph", "text": inline}])

    def test_wrapping_page_numbers_and_unmapped_annex_sections(self):
        pages = [
            "Table of contents\nAnnex\nSchedule 2.1\n",
            "ANNEX\nThe following paragraphs describe the authority for each fund.\n"
            "Schedule 2.1\x03\nA fund name ABC\n1.\n"
            "The Secretary-\nGeneral established this fund to support\n17\n",
            "international cooperation and joint activities.\nSchedule 2.10\n"
            "Another fund XYZ\n2. This fund provides support for other activities.\n"
            "Schedule 8.1\nOther pooled funds\n3. Not an individual source fund.\n18\n",
        ]
        result = descriptions_from_pages(pages, {"ABC": "2.1", "XYZ": "2.10"})
        self.assertEqual(result["ABC"]["description"],
                         "The Secretary-General established this fund to support international cooperation and joint activities.")
        self.assertEqual(result["ABC"]["pdf_pages"], [2, 3])
        self.assertNotIn("pooled", result["XYZ"]["description"])
        self.assertNotIn("Another fund", result["ABC"]["description"])

    def test_missing_or_duplicate_schedule_fails_instead_of_borrowing_text(self):
        intro = "ANNEX\nThe following paragraphs describe the authority for each fund.\n"
        with self.assertRaisesRegex(ValueError, "Missing annex description"):
            descriptions_from_pages([intro + "Schedule 1.1\nName\n1. This fund provides support for activities."], {"XYZ": "1.2"})
        with self.assertRaisesRegex(ValueError, "Duplicate annex schedule"):
            descriptions_from_pages([intro + "Schedule 1.1\nSchedule 1.1\n"], {"XYZ": "1.1"})

    def test_every_published_fund_year_has_its_own_annex_description(self):
        funds = pd.read_csv(ROOT / "data/trust-fund-schedules/stage2/fund-years.csv",
                            dtype={"base_schedule_number": str})
        manifest = json.loads((ROOT / "data/trust-fund-schedules/source-manifest.json").read_text())
        count = 0
        for source in manifest:
            year = int(source["calendar_year"])
            annual = funds.loc[funds.calendar_year.eq(year)]
            schedules = dict(zip(annual.fund_code, annual.base_schedule_number))
            result = extract_descriptions(ROOT / source["pdf_path"], schedules)
            self.assertEqual(set(result), set(schedules))
            exported = json.loads((ROOT / f"public/data/budget-trust-funds-{year}.json").read_text())
            nodes = {node["code"]: node for node in exported["nodes"]
                     if node.get("sourceGroup") == "volume_i" and node["tier"] == "detail" and not node.get("fundAccountType")}
            self.assertEqual(set(nodes), set(result))
            for code, annotation in result.items():
                self.assertEqual(nodes[code]["description"], annotation["description"])
                self.assertEqual(nodes[code]["descriptionBlocks"], annotation["description_blocks"])
                flattened = " ".join(
                    block["text"] if block["type"] == "paragraph" else " ".join(
                        f"({item['label']}) {item['text']}" for item in block["items"]
                    ) for block in annotation["description_blocks"]
                )
                self.assertEqual(" ".join(flattened.split()), annotation["description"], (year, code))
                self.assertEqual([ref["pdfPage"] for ref in nodes[code]["descriptionSources"]], annotation["pdf_pages"])
            count += len(result)
            if year == 2024:
                self.assertIn("Bonn Agreement", result["ANC"]["description"])
                self.assertEqual(result["ANC"]["pdf_pages"], [432])
                self.assertGreater(len(result["CLA"]["pdf_pages"]), 1)
                self.assertNotIn("Schedule 2.7", result["CLA"]["description"])
        self.assertEqual(count, len(funds))
