"""Extract new ARWO reporting years without replacing the historical CSV.

Uses the latest consolidated Data_Raw sheet, not source tabs or pivot totals.
Writes compatible annual CSVs and a private audit alongside the workbooks.
Run before step 11 once its entity/reference classifications support new years.
"""
from __future__ import annotations

import argparse
from collections import Counter
from decimal import Decimal
import hashlib
import json
from pathlib import Path

import pandas as pd

DEFAULT_WORKBOOK = Path('data/internal/ARWO_2019-2025.xlsx')
DEFAULT_SHEET = 'Data_Raw_19-25'
BASELINE = Path('data/un-secretariat-expenses.csv')
FINANCIAL_FIELDS = ['PRIORITY_AREA', 'ENTITY', 'YEAR', 'FINANCIAL_YEAR', 'AMOUNT', 'SOURCE_TYPE', 'REFERENCE']


def canonical(value: object) -> str:
    if pd.isna(value):
        return ''
    if isinstance(value, (int, float)):
        return format(Decimal(str(value)).normalize(), 'f')
    return str(value).strip()


def records(frame: pd.DataFrame, columns: list[str]) -> Counter:
    return Counter(tuple(canonical(v) for v in row) for row in frame[columns].itertuples(index=False, name=None))


def extract(workbook: Path, sheet: str, output_dir: Path, audit_path: Path) -> dict:
    old = pd.read_csv(BASELINE)
    data = pd.read_excel(workbook, sheet_name=sheet)
    assert list(data.columns) == list(old.columns), 'Unexpected ARWO columns'
    required = [c for c in old.columns if c != 'NOTE']
    assert not data[required].isna().any().any(), 'Missing required source fields'
    assert pd.to_numeric(data['AMOUNT'], errors='coerce').notna().all(), 'Non-numeric amount'
    assert set(data.SOURCE_TYPE) == set(old.SOURCE_TYPE), 'Unexpected funding categories'
    old_years = set(old.YEAR)
    assert not data[~data.YEAR.isin(old_years)].duplicated().any(), 'Duplicate new-year source records'
    historical = data[data.YEAR.isin(old_years)]
    assert records(old, FINANCIAL_FIELDS) == records(historical, FINANCIAL_FIELDS), 'Historical financial rows changed; review before extending'
    output_dir.mkdir(parents=True, exist_ok=True)
    totals = []
    for year, frame in data.groupby('YEAR', sort=True):
        sums = {source: float(sum(Decimal(str(v)) for v in values.AMOUNT))
                for source, values in frame.groupby('SOURCE_TYPE')}
        totals.append({'year': int(year), 'rows': len(frame), 'total': float(sum(Decimal(str(v)) for v in frame.AMOUNT)),
                       'funding_sources': sums, 'negative_rows': int((frame.AMOUNT < 0).sum())})
        if year not in old_years:
            out = frame.copy()
            # Preserve fiscal-year strings and use the CSV's integral identifier format.
            for column in ['YEAR', 'SECTION_ID', 'FINANCIAL_YEAR']:
                out[column] = out[column].map(canonical)
            out['NOTE'] = out['NOTE'].map(lambda value: value.rstrip() if isinstance(value, str) else value)
            out.to_csv(output_dir / f'un-secretariat-expenses-{int(year)}.csv', index=False)
    historical_keys = records(old, list(old.columns))
    workbook_keys = records(historical, list(old.columns))
    report = {
        'workbook': str(workbook), 'sheet': sheet,
        'workbook_sha256': hashlib.sha256(workbook.read_bytes()).hexdigest(),
        'baseline_sha256': hashlib.sha256(BASELINE.read_bytes()).hexdigest(),
        'historical_financial_rows_match': True,
        'historical_rows': len(old),
        'historical_full_rows_different': sum((historical_keys - workbook_keys).values()),
        'csv_only_rows': [dict(zip(old.columns, row)) for row in (historical_keys - workbook_keys).elements()],
        'workbook_only_rows': [dict(zip(old.columns, row)) for row in (workbook_keys - historical_keys).elements()],
        'years': totals,
        'new_entity_codes': sorted(set(data[~data.YEAR.isin(old_years)].ENTITY) - set(old.ENTITY)),
        'policy': 'Keep historical CSV unchanged; append only new years. Preserve negatives and source precision. Do not combine cumulative workbooks or source tabs.',
    }
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workbook', type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument('--sheet', default=DEFAULT_SHEET)
    parser.add_argument('--output-dir', type=Path, default=Path('data'))
    parser.add_argument('--audit', type=Path, default=Path('data/internal/arwo-audit.json'))
    args = parser.parse_args()
    result = extract(args.workbook, args.sheet, args.output_dir, args.audit)
    print(f"Verified {result['historical_rows']} historical financial rows; extracted new annual CSVs.")
    for year in result['years']:
        print(f"{year['year']}: {year['rows']} rows, ${year['total']:,.2f}")
