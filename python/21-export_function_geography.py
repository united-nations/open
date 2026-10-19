"""Export the reported CEB function × geographic-level cross-dimension.

E06 alone supplies independent totals. 2020 is the first year with complete
function attribution in the geographic source; earlier partial years are not
filled from separate function totals or allocated proportionally.
"""
import hashlib
import json
import math
from pathlib import Path

import pandas as pd
from ceb_data import CEB_FUNCTIONS, select_geographic_totals

SOURCE = Path('data/ceb/clean/expenses_by_country_region_sub_agency.csv')
OUT = Path('public/data')
LEVELS = ('global', 'regional', 'country')


def build_export(frame: pd.DataFrame) -> dict[int, dict]:
    rows = select_geographic_totals(frame)
    rows = rows[rows.calendar_year >= 2020].copy()
    if not rows.amount.map(math.isfinite).all():
        raise ValueError('Non-finite geographic expenditure')
    if rows['function'].isna().any():
        raise ValueError('Missing function attribution in geographic source')
    unknown = set(rows['function']) - set(CEB_FUNCTIONS)
    if unknown:
        raise ValueError(f'Unknown geographic functions: {sorted(unknown)}')
    rows['function_key'] = rows['function'].map(CEB_FUNCTIONS)
    rows['level'] = rows.location_type.map({'COU': 'country', 'REG': 'regional', 'SUB': 'regional'})
    if rows.level.isna().any():
        raise ValueError('Unknown geographic level')
    rows.loc[rows['country/territory'].str.startswith('Global', na=False), 'level'] = 'global'
    result = {}
    for year, yearly in rows.groupby('calendar_year', sort=True):
        functions = []
        for key, members in yearly.groupby('function_key', sort=True):
            cells = []
            for level in LEVELS:
                amounts = members.loc[members.level == level, 'amount']
                cells.append({'level': level, 'amount': float(amounts.sum()),
                              'negativeAdjustments': float(amounts[amounts < 0].sum())})
            functions.append({'key': key, 'total': float(members.amount.sum()), 'geography': cells})
        result[int(year)] = {
            'meta': {'year': int(year), 'source': 'CEB Financial Statistics',
                     'sourceUrl': 'https://unsceb.org/statistics/financial-statistics/',
                     'downloadUrl': 'https://unsceb.org/assets/data/FS/expenses_by_country_region_sub_agency.csv',
                     'measure': 'expenditure', 'currency': 'USD', 'firstCompleteYear': 2020,
                     'inputFile': str(SOURCE),
                     'expenseType': 'E06', 'sourceRows': len(yearly)},
            'total': float(yearly.amount.sum()), 'functions': functions,
        }
    return result


if __name__ == '__main__':
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    result = build_export(pd.read_csv(SOURCE))
    for year, data in result.items():
        data['meta']['sourceSha256'] = digest
        (OUT / f'function-geography-{year}.json').write_text(json.dumps(data, indent=2) + '\n')
    print(f'Exported function/geography cross-dimension for {list(result)}')
