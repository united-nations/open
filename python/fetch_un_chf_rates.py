"""Snapshot UN Treasury operational rates and derive time-weighted area rates.

These annual rates are portal calculations, not published UN annual averages.
The source convention is CHF per USD; average its reciprocal over calendar days.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import requests

URL = "https://treasury.un.org/operationalrates/xsqlHistory.php"

class RatesParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell, self.text = [], [], False, ""
    def handle_starttag(self, tag, attrs):
        if tag == "tr": self.row = []
        if tag == "td": self.cell, self.text = True, ""
    def handle_data(self, data):
        if self.cell: self.text += data
    def handle_endtag(self, tag):
        if tag == "td": self.row.append(self.text.strip()); self.cell = False
        if tag == "tr" and self.row: self.rows.append(self.row)

def annual_usd_per_chf(rows, year):
    start, end = date(year, 1, 1), date(year + 1, 1, 1)
    values = sorted((date.fromisoformat(r["effectiveDate"]), Decimal(r["chfPerUsd"])) for r in rows)
    if not values or values[0][0] > start or values[-1][0] < end:
        raise ValueError(f"Incomplete operational-rate coverage for {year}")
    total = Decimal(0)
    for day_offset in range((end - start).days):
        day = start + timedelta(days=day_offset)
        applicable = [rate for effective, rate in values if effective <= day]
        if not applicable or applicable[-1] <= 0: raise ValueError(f"Missing/invalid rate on {day}")
        total += 1 / applicable[-1]
    return str(total / (end - start).days)

def main():
    params = {"INdtmFROM": "", "INstrRATECODE": "CHF"}
    response = requests.post(URL, data=params, timeout=60)
    response.raise_for_status()
    parser = RatesParser(); parser.feed(response.text)
    rows = [{"effectiveDate": datetime.strptime(r[2], "%d %b %Y").date().isoformat(), "chfPerUsd": str(Decimal(r[1]))}
            for r in parser.rows if r[0] == "CHF"]
    if len({r['effectiveDate'] for r in rows}) != len(rows): raise ValueError("Duplicate rate dates")
    payload = {"source": "United Nations Treasury — Operational Rates of Exchange",
        "url": "https://treasury.un.org/operationalrates/OperationalRates.php",
        "historyRequest": {"url": URL, "method": "POST", "parameters": params},
        "retrievedAt": datetime.now(timezone.utc).isoformat(), "responseSha256": sha256(response.content).hexdigest(),
        "sourceUnits": "CHF per USD", "method": "Calendar-day-weighted mean of USD per CHF (reciprocal of each effective UN operational rate). Visualization only; not a UN-published annual average.",
        "rates": rows,
        "annualUsdPerChf": {str(year): annual_usd_per_chf(rows, year) for year in range(2019, 2026)}}
    Path("data/un-chf-operational-rates.json").write_text(json.dumps(payload, indent=2) + "\n")
    print(payload['annualUsdPerChf'])

if __name__ == '__main__': main()
