"""Reproduce ITC CHF conversions in ARWO notes without changing financial data.

Run from any directory: uv run python python/reconcile_arwo_chf_rates.py
Reviewed source-rate evidence: docs/research/arwo-chf-conversion.md.
Published contract-average rates are inputs, not derived from operational rates.
"""
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
import csv
import json
import re

ROOT = Path(__file__).resolve().parents[1]
# Budget year, not expenditure year. Independently published UN source controls.
BUDGET_RATES = json.loads((ROOT / "data/un-chf-budget-rates.json").read_text())["ratesByBudgetYear"]
NOTE = re.compile(r"^([\d ]+(?:\.\d+)?) SwF (\d+\.\d+) to \$1\.00$")


def cents(amount):
    return format(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), "f")


def reconcile():
    controls = {
        row["expenditureYear"]: Decimal(row["amountChf"])
        for row in json.loads((ROOT / "data/ppb-chf-source-controls.json").read_text())
    }
    annual = json.loads((ROOT / "data/un-chf-operational-rates.json").read_text())
    results = []
    for path in sorted((ROOT / "data").glob("un-secretariat-expenses*.csv")):
        with path.open(newline="") as source:
            for row in csv.DictReader(source):
                if row["ENTITY"] != "ITC" or row["SOURCE_TYPE"] != "Voluntary":
                    continue
                year = int(row["YEAR"])
                match = NOTE.fullmatch(row["NOTE"])
                if not match:
                    results.append({"expenditureYear": year, "status": "no_rate_in_source_note"})
                    continue
                chf = Decimal(match[1].replace(" ", "")) * 1000
                rate = Decimal(match[2])
                budget_year, = [int(y) for y, value in BUDGET_RATES.items()
                               if Decimal(value['chfPerUsd']) == rate]
                source_rate = BUDGET_RATES[str(budget_year)]
                if controls[year] != chf:
                    raise ValueError(f"ARWO note and reviewed PPB CHF control differ: {year}")
                reported = Decimal(row["AMOUNT"])
                converted = chf / rate
                if abs(reported - converted) < Decimal("0.51"):
                    status = "division_matches_within_source_rounding"
                elif abs(reported - chf * rate) < Decimal("0.51"):
                    status = "multiplication_matches_within_source_rounding"
                else:
                    status = "does_not_match_stated_amount_and_rate"
                results.append({
                    "expenditureYear": year,
                    "matchedBudgetYear": budget_year,
                    "amountChf": str(chf),
                    "chfPerUsd": str(rate),
                    "rateSource": source_rate['symbol'],
                    "rateSourceLocation": source_rate['location'],
                    "rateSourceUrl": source_rate['url'],
                    "usdUsingStatedRate": cents(converted),
                    "sourceUsd": str(reported),
                    "sourceMinusStatedConversionUsd": cents(reported - converted),
                    "portalAnnualAverageUsd": cents(chf * Decimal(annual["annualUsdPerChf"][str(year)])),
                    "status": status,
                })
    return sorted(results, key=lambda row: row["expenditureYear"])


if __name__ == "__main__":
    print(json.dumps(reconcile(), indent=2))
