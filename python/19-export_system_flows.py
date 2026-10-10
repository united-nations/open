"""Export independent CEB spending dimensions without inferring cross-allocations.

Revenue is loaded separately by the frontend. Geography/SDGs describe organization
spending, not the destinations of any particular contributor's funding. Preserve
signed amounts, original geographic codes, and reporting discrepancies.
"""
import json
from pathlib import Path

import pandas as pd
from ceb_data import select_geographic_totals, select_sdg_expenses
from utils import normalize_entity, normalize_country_name

SOURCE = Path('data/ceb/clean')
OUT = Path('public/data/system-flow-spending.json')
KINDS = {'COU': 'country', 'REG': 'region', 'SUB': 'subregion'}


def build_export(totals: pd.DataFrame, geography: pd.DataFrame, goals: pd.DataFrame) -> dict:
    frames = [totals.copy(), select_geographic_totals(geography), select_sdg_expenses(goals)]
    for frame in frames:
        if frame.amount.isna().any():
            raise ValueError('Missing spending amount')
        entity_column = 'entity_code' if 'entity_code' in frame else 'agency'
        frame['entity'] = frame[entity_column].map(normalize_entity)
    totals, geography, goals = frames
    geography['country/territory'] = geography['country/territory'].map(lambda name: normalize_country_name(name) if isinstance(name, str) else name)
    # SDG reporting occasionally uses an alternative code or a sub-agency.
    # Canonicalize DPO through the shared map; infer parentage only from the
    # same year's expense source, and only when no agency with that code exists.
    goals.loc[goals.entity_code == 'DPO', 'entity'] = normalize_entity('UN-DPO')
    if 'sub_agency' in totals:
        for year, rows in totals.groupby('calendar_year'):
            agencies = set(rows.agency)
            parent_candidates = {}
            for _, row in rows.dropna(subset=['sub_agency']).iterrows():
                code = str(row.sub_agency)
                candidates = {code}
                prefix = str(row.agency) + '-'
                if code.startswith(prefix):
                    candidates.add(code[len(prefix):])
                for candidate in candidates:
                    parent_candidates.setdefault(candidate, set()).add(row.entity)
            for code, parents in parent_candidates.items():
                if code not in agencies and len(parents) == 1:
                    goals.loc[(goals.calendar_year == year) & (goals.entity_code == code), 'entity'] = next(iter(parents))
    unknown = set(geography.location_type) - set(KINDS)
    if unknown:
        raise ValueError(f'Unknown geography types: {unknown}')
    years = sorted(set(totals.calendar_year) & set(geography.calendar_year) & set(goals.calendar_year))
    years = [int(year) for year in years if year >= 2018]
    result = []
    anomaly_count = 0
    for year in years:
        t, g, s = [frame[frame.calendar_year == year] for frame in frames]
        entities = {}
        for entity in sorted(set(t.entity) | set(g.entity) | set(s.entity)):
            total_rows = t[t.entity == entity]
            total = float(total_rows.amount.sum()) if not total_rows.empty else None
            geos = []
            geographic_rows = g[g.entity == entity].fillna('')
            for (kind, name, region), rows in geographic_rows.groupby(['location_type', 'country/territory', 'region']):
                # Keep parent regions exactly as reported, including source anomalies.
                label = name.strip()
                anomaly = kind == 'SUB' and label in {'Eastern Europe', 'Türkiye'} and region == 'Africa'
                anomaly_count += int(anomaly)
                source_types = sorted(set(rows.source_location_type))
                notes = []
                if any(source_type != kind for source_type in source_types):
                    notes.append(f'Source location type {", ".join(source_types)} corrected to {kind} using the reviewed geographic-area crosswalk.')
                if anomaly:
                    notes.append('Source reports this location under Africa; geographic classification is inconsistent.')
                geos.append({'key': f'{kind}:{label}:{region}', 'label': label,
                             'region': 'Unresolved geographic classification' if anomaly else region,
                             'sourceRegion': region, 'sourceLabel': name,
                             'sourceLocationTypes': source_types, 'note': ' '.join(notes) or None,
                             'kind': KINDS[kind], 'amount': float(rows.amount.sum())})
            sdgs = []
            goal_rows = s[s.entity == entity].copy()
            goal_rows['goal'] = goal_rows.sdg_goal.astype(str).str.strip().str.lower()
            for key, rows in goal_rows.groupby('goal'):
                if key != 'x00' and key not in {str(n) for n in range(1, 18)}:
                    raise ValueError(f'Unknown SDG classification: {key}')
                sdgs.append({'key': 'unallocated' if key == 'x00' else key,
                             'label': 'Not allocated to a goal' if key == 'x00' else f'SDG {key}',
                             'amount': float(rows.amount.sum())})
            entities[entity] = {
                'total': total, 'geography': geos, 'goals': sdgs,
                'geographyDifference': None if total is None else total - sum(row['amount'] for row in geos),
                'goalsDifference': None if total is None else total - sum(row['amount'] for row in sdgs),
            }
        result.append({'year': year, 'entities': entities})
    return {
        'meta': {
            'source': 'CEB Financial Statistics', 'years': years, 'geographicAnomalyCount': anomaly_count,
            'sourceUrls': {
                'total': 'https://unsceb.org/assets/data/FS/expenses_sub_agency.csv',
                'geography': 'https://unsceb.org/assets/data/FS/expenses_by_country_region_sub_agency.csv',
                'goals': 'https://unsceb.org/assets/data/FS/expenses_sdgs.csv',
            },
            'notes': [
                'Independent reported spending dimensions; not traced allocations of contributor funding.',
                'All available years use the current CEB release; source vintage and hashes are recorded in ceb-source.json. Geography selects E06 total expense records.',
                'SDG DPO is normalized to UN-DPO; separately reported sub-agencies are rolled into the same-year CEB expense-source parent where uniquely identified.',
                'Source labels and original location codes are retained. Known geographic areas reported as COU use the reviewed region/subregion crosswalk; correction notes disclose the change.',
                'X00/x00 is retained as not allocated to a goal; signed reporting differences are not allocated to goals.',
                'Net amounts include negative adjustments. Inter-agency transfers are not eliminated.',
            ],
        }, 'data': result,
    }


if __name__ == '__main__':
    output = build_export(*[pd.read_csv(SOURCE / name) for name in (
        'expenses_sub_agency.csv', 'expenses_by_country_region_sub_agency.csv', 'expenses_sdgs.csv')])
    OUT.write_text(json.dumps(output, separators=(',', ':'), allow_nan=False) + '\n')
    print(f'{OUT}: {len(output["data"])} years')
