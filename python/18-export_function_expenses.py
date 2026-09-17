"""Export CEB Standard II functions, using the comparable 2018+ classification."""
import json
from pathlib import Path

import pandas as pd
from utils import normalize_entity

SOURCE = Path('data/ceb/clean/expenses_sub_agency.csv')
OUT = Path('public/data/function-expenses.json')
FUNCTIONS = {
    'Development Assistance': 'development',
    'Humanitarian Assistance': 'humanitarian',
    'Peace Operations': 'peace',
    'Global Agenda and Specialised Assistance': 'global',
    'Global Agenda and Specialized Assistance': 'global',
}


def build_export(frame: pd.DataFrame) -> dict:
    frame = frame[frame.calendar_year >= 2018].copy()
    unknown = set(frame.transaction_type) - set(FUNCTIONS)
    if unknown:
        raise ValueError(f'Unrecognized CEB functions: {sorted(unknown)}')
    if frame.amount.isna().any():
        raise ValueError('Missing CEB expense amounts')
    frame['entity'] = frame.agency.map(normalize_entity)
    frame['function'] = frame.transaction_type.map(FUNCTIONS)
    years = []
    for year, rows in frame.groupby('calendar_year', sort=True):
        entities = {}
        for entity, values in rows.groupby('entity', sort=True):
            entities[entity] = {key: float(value) for key, value in values.groupby('function').amount.sum().items()}
        totals = {key: float(value) for key, value in rows.groupby('function').amount.sum().items()}
        years.append({'year': int(year), 'total': float(rows.amount.sum()), 'functions': totals, 'entities': entities})
    return {'meta': {
        'source': 'CEB Financial Statistics — Standard II: UN system function',
        'sourceUrl': 'https://unsceb.org/statistics/expenses-by-function/',
        'downloadUrl': 'https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sub_agency.csv',
        'years': [row['year'] for row in years],
        'classificationStartYear': 2018,
    }, 'data': years}


if __name__ == '__main__':
    result = build_export(pd.read_csv(SOURCE))
    OUT.write_text(json.dumps(result, indent=2) + '\n')
    print(f'Exported {len(result["data"])} years to {OUT}')
