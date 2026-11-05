"""Audit published parts against totals without rebuilding their producer.

These are arithmetic/export-preservation checks. Calculated balances are kept
signed; their presence does not establish independent source agreement.
"""
from collections import defaultdict
import json
from pathlib import Path
import sys
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
from ceb_data import (normalize_frame, revenue_controls, select_geographic_totals,
                      select_sdg_expenses, resolve_geographic_reporting_entities,
                      resolve_reporting_entities)
from utils import normalize_entity

DATA = ROOT / "public/data"
FINANCING = ("Assessed", "Voluntary un-earmarked", "Voluntary earmarked", "Other", "Unresolved")


def read(name):
    return json.loads((DATA / name).read_text())


class CebPartsTotalsTests(unittest.TestCase):
    def equal_money(self, total, parts, context, tolerance=0.02):
        self.assertAlmostEqual(total, sum(parts), delta=tolerance, msg=context)

    def test_every_revenue_entity_donor_category_and_financing_partition(self):
        controls = revenue_controls(normalize_frame(pd.read_csv(ROOT / "data/ceb/raw/revenue.csv")))
        controls = controls.groupby(["calendar_year", "agency"]).amount.sum()
        for path in sorted(DATA.glob("entity-revenue-*.json")):
            year = int(path.stem.rsplit("-", 1)[1])
            entities = read(path.name)
            self.assertEqual(set(entities), set(controls.loc[year].index))
            donor_totals = defaultdict(float)
            for name, donor in read(f"donors-{year}.json").items():
                context = f"{year} {name}"
                self.equal_money(donor["total"], (v for amounts in donor["contributions"].values() for v in amounts.values()), context)
                category_cells = defaultdict(float)
                for rows in donor["categoryContributions"].values():
                    for entity, instruments in rows.items():
                        for instrument, value in instruments.items():
                            category_cells[entity, instrument] += value
                cells = {(entity, instrument): value for entity, amounts in donor["contributions"].items() for instrument, value in amounts.items()}
                self.assertEqual(set(category_cells), set(cells), context)
                for cell, value in cells.items():
                    self.equal_money(value, [category_cells[cell]], f"{context} category {cell}")
                    donor_totals[cell[0]] += value
                self.equal_money(donor["unresolvedTotal"], donor["unresolvedContributions"].values(), context)
            for entity, row in entities.items():
                context = f"{year} {entity}"
                for label, parts in [("raw control", [controls.loc[year, entity]]), ("financing", row["by_type"].values()), ("donors", [d["total"] for d in row["by_donor"]]), ("donor export", [donor_totals[entity]])]:
                    self.equal_money(row["total"], parts, f"{context} {label}")
                for donor in row["by_donor"]:
                    self.equal_money(donor["total"], [donor.get(k, 0) for k in FINANCING], f"{context} {donor['donor']}")

    def test_expenses_and_functions_match_raw_controls_at_entity_level(self):
        raw = normalize_frame(pd.read_csv(ROOT / "data/ceb/raw/expenses_sub_agency.csv"))
        raw["agency"] = raw.agency.map(normalize_entity)
        controls = raw.groupby(["calendar_year", "agency"]).amount.sum()
        functions = read("function-expenses.json")
        for row in functions["data"]:
            year = row["year"]
            spending = {r["entity"]: r["amount"] for r in read(f"entity-spending-{year}.json")}
            self.assertEqual(set(spending), set(controls.loc[year].index))
            self.assertEqual(set(spending), set(row["entities"]))
            self.equal_money(row["total"], row["functions"].values(), str(year))
            self.equal_money(row["total"], spending.values(), str(year))
            for entity, total in spending.items():
                self.equal_money(total, [controls.loc[year, entity]], f"{year} {entity} raw")
                self.equal_money(total, row["entities"][entity].values(), f"{year} {entity} functions")
            for function, total in row["functions"].items():
                self.equal_money(total, [v.get(function, 0) for v in row["entities"].values()], f"{year} {function}")

    def test_every_geography_country_goal_and_function_geography_partition(self):
        for family in ("country-expenses", "geographic-expenses", "sdg-expenses"):
            for path in DATA.glob(f"{family}-*.json"):
                data = read(path.name)
                rows = data.values() if isinstance(data, dict) else data
                for index, row in enumerate(rows):
                    # Country totals and independently rounded entity values
                    # may differ by half a cent per displayed component.
                    self.equal_money(row["total"], row["entities"].values(), f"{path.name} {index}", max(0.02, 0.005 * (len(row["entities"]) + 1)))
        for path in DATA.glob("function-geography-*.json"):
            row = read(path.name)
            self.equal_money(row["total"], [f["total"] for f in row["functions"]], path.name)
            for function in row["functions"]:
                self.equal_money(function["total"], [g["amount"] for g in function["geography"]], f"{path.name} {function['key']}")

    def test_entity_and_contributor_trend_partitions_all_years(self):
        trends = read("entity-trends.json")
        for index, year in enumerate(trends["meta"]["years"]):
            for measure in ("revenue", "expenses"):
                total = trends["aggregates"]["all"][index][measure]
                self.equal_money(total, [rows[index][measure] for rows in trends["entities"].values() if rows[index][measure] is not None], f"{year} {measure} entities")
                self.equal_money(total, [trends["aggregates"][group][index][measure] for group in trends["meta"]["systemGroups"]], f"{year} {measure} groups")
        trends = read("contributor-trends.json")
        for family in ("contributors", "aggregates"):
            for name, rows in trends[family].items():
                for row in rows:
                    self.equal_money(row["total"], [row.get(k, 0) for k in ("assessed", "voluntary_unearmarked", "voluntary_earmarked", "other", "unresolved")], f"{family} {name} {row['year']}")

    def test_published_flow_dimensions_preserve_raw_sources_before_residuals(self):
        def source(name):
            return normalize_frame(pd.read_csv(ROOT / "data/ceb/raw" / name))
        controls = source("expenses_sub_agency.csv")
        geography = resolve_geographic_reporting_entities(select_geographic_totals(source("expenses_by_country_region_sub_agency.csv")), controls)
        goals = resolve_reporting_entities(select_sdg_expenses(source("expenses_sdgs.csv")), "entity_code", controls, [(controls, "agency", "sub_agency")])
        expected = {"geography": geography.groupby(["calendar_year", "agency"]).amount.sum(),
                    "goals": goals.groupby(["calendar_year", "entity_code"]).amount.sum()}
        for row in read("system-flow-spending.json")["data"]:
            year = row["year"]
            for dimension, source_totals in expected.items():
                published = {entity: sum(v["amount"] for v in data[dimension])
                             for entity, data in row["entities"].items() if data[dimension]}
                source_year = source_totals.loc[year].to_dict() if year in source_totals.index.get_level_values(0) else {}
                self.assertEqual(set(published), set(source_year), f"{year} {dimension} coverage")
                for entity, amount in source_year.items():
                    self.equal_money(amount, [published[entity]], f"{year} {entity} {dimension} raw")
                for entity, data in row["entities"].items():
                    difference = data[dimension + "Difference"]
                    if difference is not None:
                        self.equal_money(data["total"], [published.get(entity, 0), difference], f"{year} {entity} {dimension} residual")


if __name__ == "__main__":
    unittest.main()
