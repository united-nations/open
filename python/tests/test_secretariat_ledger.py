"""Conservation checks against every source occurrence, not sampled totals."""
import sys
import unittest
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from secretariat_ledger import resolve_records, build_overview, exact_total


class LedgerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records, cls.taxonomy, cls.snapshots = resolve_records()

    def test_source_coverage_and_financing(self):
        self.assertEqual(len(self.records), 2456)
        self.assertEqual(len({r["id"] for r in self.records}), 2456)
        self.assertEqual(len({r["code"] for r in self.records}), 161)
        self.assertEqual(Counter(r["arrangement"]["family"] for r in self.records
                                 if r["source_type"] == "Voluntary"),
                         {"trust_funds": 1105, "treaty": 12, "unitemized": 28, "unresolved": 3})

    def test_known_annual_controls_and_historical_exceptions(self):
        totals = ["14300816380", "13875403174", "13758894885", "14776652135",
                  "14791811849", "14527960692", "13682358567.34"]
        for year, expected in zip(range(2019, 2026), totals):
            self.assertEqual(exact_total([r for r in self.records if r["year"] == year]).quantize(Decimal(".01")),
                             Decimal(expected))
        self.assertEqual(sum(r["budgetary_spm"] is None for r in self.records), 5)
        self.assertTrue(all(r["entity_id"] != self.taxonomy["entities"]["ODET"]["entity_id"]
                            for r in self.records if r["original_code"] == "OSET"))
        self.assertTrue(all(r["entity_id"] != r["budget_reporting_identity"]["id"]
                            for r in self.records if r["code"] == "UNSOM" and r["year"] == 2024))

    def test_all_cuts_and_cells_reconstruct_source_exactly(self):
        for year in range(2019, 2026):
            rows = [r for r in self.records if r["year"] == year]
            data = build_overview(year, rows, self.taxonomy, self.snapshots)
            self.assertEqual(Decimal(data["meta"]["amount_exact"]), exact_total(rows))
            indexed = {r["id"]: r for r in rows}
            cells = [c for e in data["entities"] for c in e["cells"]]
            self.assertEqual(Counter(i for c in cells for i in c["record_ids"]), Counter(indexed.keys()))
            for c in cells:
                self.assertEqual(Decimal(c["amount_exact"]), exact_total([indexed[i] for i in c["record_ids"]]))
            for dimension in ("group", "priority_area", "funding_source"):
                grouped = defaultdict(list)
                for row in rows:
                    grouped[row[dimension]].append(row)
                self.assertEqual(sum(map(exact_total, grouped.values())), exact_total(rows))

    def test_hierarchy_disjoint_and_negative_occurrences_survive(self):
        parents, children = defaultdict(list), defaultdict(list)
        for row in self.records:
            parents[row["arrangement"]["family"]].append(row)
            children[row["arrangement"]["id"]].append(row)
        self.assertTrue(any(Decimal(r["amount_exact"]) < 0 for r in self.records))
        for family, rows in parents.items():
            child_rows = [r for child in children.values() for r in child if r["arrangement"]["family"] == family]
            self.assertEqual(Counter(r["id"] for r in rows), Counter(r["id"] for r in child_rows))
            self.assertEqual(exact_total(rows), exact_total(child_rows))

    def test_operational_categories_do_not_infer_finance(self):
        for code in ("UNTSO", "UNMOGIP", "UNSOS", "RSCE", "UNLB"):
            self.assertEqual(self.taxonomy["entities"][code]["group"], "pko")
        for code in ("ECA", "ECE", "ECLAC", "ESCAP", "ESCWA"):
            self.assertEqual(self.taxonomy["entities"][code]["group"], "regional")
        rows = [r for r in self.records if r["code"] == "UNTSO"]
        self.assertTrue(any(r["arrangement"]["family"] == "programme" for r in rows))


if __name__ == "__main__":
    unittest.main()
