"""Compare reported SDG spending with independent CEB revenue/expense controls.

Run from the repository root: uv run python python/sdg_reconciliation.py
Outputs CSV in nominal USD. Positive gaps mean control > SDG spending;
percentages divide the signed gap by that year's corresponding control.
Budgetary expenditure includes BUD and historical BUG. Non-SDG (x00) is
included in reported spending; calculated Not specified is excluded.
Decimal arithmetic on raw CSV amounts avoids floating-point rounding in
the diagnostic. Entity resolution uses the same source-parent rules as charts.
"""
import csv
from decimal import Decimal
from pathlib import Path
import sys

import pandas as pd

from ceb_data import revenue_controls, resolve_reporting_entities, select_sdg_expenses
from utils import normalize_entity


def read_source(filename, allow_missing=False):
    frame = pd.read_csv(Path('data/ceb/raw') / filename, dtype={'amount': str})
    frame.columns = [column.strip().lower().replace(' ', '_') for column in frame]
    if not allow_missing and frame.amount.isna().any():
        raise ValueError(f'Missing amount in {filename}')
    frame['amount'] = frame.amount.map(lambda value: None if pd.isna(value) else Decimal(value))
    return frame


def build_reconciliation():
    expenses = read_source('expenses_sub_agency.csv')
    expenses['agency'] = expenses.agency.map(normalize_entity)
    revenue_source = read_source('revenue.csv', allow_missing=True)
    revenue = revenue_controls(revenue_source)
    goals = select_sdg_expenses(read_source('expenses_sdgs.csv'))
    goals = resolve_reporting_entities(goals, 'entity_code', expenses,
                                      [(expenses, 'agency', 'sub_agency')])
    output = []
    for year, rows in goals.groupby('calendar_year'):
        by_type = rows.groupby('type_of_financial_information').amount.sum().to_dict()
        reported = rows.amount.sum()
        expense_rows = expenses[expenses.calendar_year == year]
        expense = expense_rows.amount.sum()
        income_rows = revenue[revenue.calendar_year == year]
        if expense_rows.empty or income_rows.empty:
            raise ValueError(f'Missing control year: {year}')
        income = income_rows.amount.sum()
        controls = expense_rows.groupby('agency').amount.sum()
        entity_reported = rows.groupby('entity_code').amount.sum()
        if set(entity_reported.index) - set(controls.index):
            raise ValueError(f'Unmatched SDG reporting entities in {year}')
        differences = {entity: amount - entity_reported.get(entity, Decimal(0))
                       for entity, amount in controls.items()}
        zero = Decimal(0)
        shortfalls = sum((v for v in differences.values() if v > 0), zero)
        excesses = sum((-v for v in differences.values() if v < 0), zero)
        assert shortfalls - excesses == expense - reported
        output.append({
            'year': int(year),
            'exp_usd': by_type.get('EXP', zero),
            'bud_usd': by_type.get('BUD', zero),
            'bug_usd': by_type.get('BUG', zero),
            'reported_sdg_and_non_sdg_usd': reported,
            'revenue_usd': income,
            'revenue_missing_amounts': int(revenue_source[revenue_source.calendar_year == year].amount.isna().sum()),
            'revenue_gap_usd': income - reported,
            'revenue_gap_pct': (income - reported) / income * 100,
            'expenditure_usd': expense,
            'expenditure_gap_usd': expense - reported,
            'expenditure_gap_pct': (expense - reported) / expense * 100,
            'entity_shortfalls_usd': shortfalls,
            'entity_excesses_usd': excesses,
            'gross_entity_difference_usd': shortfalls + excesses,
            'non_sdg_usd': rows[rows.sdg_goal.str.lower() == 'x00'].amount.sum(),
        })
    return output


if __name__ == '__main__':
    rows = build_reconciliation()
    writer = csv.DictWriter(sys.stdout, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
