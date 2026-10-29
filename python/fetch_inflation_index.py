"""Refresh the observed US CPI proxy used only by monetary time-series charts.

Fetch BLS CUUR0000SA0 (all items, all urban consumers, not seasonally adjusted),
period M13 (published annual average). No monthly/YTD values or forecasts are used.
"""
import hashlib
import json
import math
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/us-cpi.json'
SERIES = 'CUUR0000SA0'
BASE_YEAR = 2025
FIRST_YEAR = 2010
SOURCE = 'https://www.bls.gov/regions/mid-atlantic/data/consumerpriceindexannualandsemiannual_table.htm'


def main():
    annual = {}
    responses = []
    # Annual indices for the current calendar year are not yet complete.
    last_year = date.today().year - 1
    for start in range(FIRST_YEAR, last_year + 1, 10):
        response = requests.get(f'https://api.bls.gov/publicAPI/v2/timeseries/data/{SERIES}',
                                params={'startyear': start, 'endyear': min(start + 9, last_year),
                                        'annualaverage': 'true'}, timeout=60)
        response.raise_for_status()
        data = response.json()
        if data['status'] != 'REQUEST_SUCCEEDED':
            raise ValueError(data.get('message'))
        rows = data['Results']['series']
        if len(rows) != 1 or rows[0]['seriesID'] != SERIES:
            raise ValueError('Unexpected BLS series')
        responses.append({'url': response.url, 'sha256': hashlib.sha256(response.content).hexdigest()})
        for row in rows[0]['data']:
            if row['period'] == 'M13':
                annual[row['year']] = float(row['value'])
    if any(not math.isfinite(value) or value <= 0 for value in annual.values()) or str(BASE_YEAR) not in annual:
        raise ValueError('Missing or invalid CPI base-year index')
    if not set(range(FIRST_YEAR, BASE_YEAR + 1)).issubset(map(int, annual)):
        raise ValueError('Historical CPI coverage lost')
    payload = {
        'baseYear': BASE_YEAR,
        'seriesId': SERIES,
        'source': 'US Bureau of Labor Statistics, CPI-U, all items, US city average, not seasonally adjusted',
        'sourceUrl': SOURCE,
        'retrievedAt': date.today().isoformat(),
        'responses': responses,
        'annual': dict(sorted(annual.items())),
        'notes': {
            '2025': 'The published 2025 annual average excludes October, when CPI survey data were not collected during the lapse in appropriations.'
        },
    }
    OUT.write_text(json.dumps(payload, indent=2) + '\n')
    print(f'{OUT.name}: {min(annual)}–{max(annual)}, fixed base year {BASE_YEAR}')


if __name__ == '__main__':
    main()
