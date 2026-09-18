"""Preserve all CEB geographic levels; map points are illustrative, not boundaries.

Country sidebars retain their existing dataset. This additional export includes
regional/subregional/global records without allocating them to countries.
"""
import importlib.util
import json
from pathlib import Path
import pandas as pd
from utils import normalize_entity

spec = importlib.util.spec_from_file_location('expenses_export', Path(__file__).with_name('07-export_expenses_json.py'))
expenses = importlib.util.module_from_spec(spec)
spec.loader.exec_module(expenses)

# Representative label positions, not official centroids or operational locations.
POINTS = {
    'Africa': (5, 20), 'Asia': (42, 85), 'Europe': (53, 20),
    'Americas': (12, -80), 'Oceania': (-20, 155), 'Antarctica': (-62, 20),
    'Western Asia': (30, 44), 'Northern Africa': (26, 15), 'Eastern Asia': (36, 115),
    'Middle Africa': (-2, 20), 'Eastern Africa': (-1, 38), 'Southern Africa': (-25, 25),
    'Latin America and the Caribbean': (-8, -70), 'Central Asia': (43, 65),
    'Western Africa': (10, -3), 'Eastern Europe': (52, 32), 'Central America': (16, -90),
    'Caribbean': (18, -72), 'Southern Asia': (24, 76), 'Northern America': (48, -105),
    'South-eastern Asia': (9, 110), 'Southern Europe': (41, 16), 'Northern Europe': (61, 15),
    'South America': (-18, -60), 'Micronesia': (9, 155), 'Melanesia': (-9, 158),
    'Western Europe': (49, 5), 'Australia and New Zealand': (-32, 155),
    'Sub-Saharan Africa': (-8, 22), 'Polynesia': (-15, -155),
    'Middle East': (29, 44), 'Middle East and North Africa': (28, 32),
    'Eastern mediterranean region': (32, 35), 'Asia and the Pacific': (18, 132),
    'Asia excluding Japan': (35, 100), 'South Africa': (-30, 25), 'Türkiye': (39, 35),
}
AMBIGUOUS = {'Middle East', 'Middle East and North Africa', 'Eastern mediterranean region',
             'Asia and the Pacific', 'Asia excluding Japan'}

def build_geography(frame):
    frame = frame.copy().fillna({'region': '', 'country/territory': ''})
    frame['entity'] = frame.agency.map(normalize_entity)
    result = {}
    country_info = {}
    for name in frame.loc[frame.location_type == 'COU', 'country/territory'].unique():
        iso = expenses.get_iso3(name)
        country_info[name] = (iso, expenses.COUNTRY_CENTROIDS.get(iso))
    for year, yearly in frame.groupby('calendar_year'):
        records = {}
        for (kind, source_name, parent), rows in yearly.groupby(['location_type', 'country/territory', 'region'], dropna=False):
            name = source_name.strip()
            level = {'COU': 'country', 'SUB': 'subregion', 'REG': 'region'}[kind]
            notes = []
            region = parent or name
            if name.startswith('Global'):
                level, name, region = 'global', 'Global', 'Global and Interregional'
                point, key = (-43, -135), 'global'
                notes.append('Global and interregional spending, including enabling functions. The ocean marker is a display position only.')
            elif level == 'country':
                iso, point = country_info[source_name]
                key = iso if isinstance(iso, str) and len(iso) == 3 and iso.isalpha() else f'country:{name}'
                if iso in {'PSE', 'ESH', 'XKX', 'TWN'}:
                    notes.append('Country/area label follows source reporting; marker placement does not imply a position on territorial status or boundaries.')
            else:
                point = POINTS.get(name)
                key = f'{level}:{name}:{parent}'
                notes.append('Illustrative regional marker; spending is not assigned to this point or distributed among countries.')
                if name in AMBIGUOUS:
                    notes.append('Source-defined area with potentially differing geographic coverage; the marker does not define its boundaries.')
                if name in {'Eastern Europe', 'Türkiye'} and parent == 'Africa':
                    region = 'Europe' if name == 'Eastern Europe' else 'Asia'
                    notes.append(f'Source classification conflict: reported as a subregion of Africa. Plotted by the named location; source level retained pending clarification.')
                if name == 'South Africa':
                    notes.append('Source labels this record as subregional “South Africa”; it is not merged with country-level South Africa.')
                if name == 'Antarctica':
                    notes.append('Marker shifted north for visibility on the map, which omits Antarctica.')
            if point is None:
                point = (-52, -135)
                notes.append('No verified display coordinate available; shown in the ocean reference area, not at an inferred location.')
            row = records.setdefault(key, dict(iso3=key, name=name, region=region, level=level,
                 lat=point[0], long=point[1], entities={}, notes=[], sourceLabels=[]))
            row['notes'] = sorted(set(row['notes'] + notes))
            row['sourceLabels'] = sorted(set(row['sourceLabels'] + [source_name.strip()]))
            for entity, amount in rows.groupby('entity').amount.sum().items():
                row['entities'][entity] = row['entities'].get(entity, 0) + float(amount)
        for row in records.values():
            row['total'] = sum(row['entities'].values())
        result[int(year)] = sorted(records.values(), key=lambda row: -row['total'])
    return result

if __name__ == '__main__':
    frame = pd.read_csv('data/ceb/clean/expenses_by_country_region_sub_agency.csv')
    for year, rows in build_geography(frame).items():
        Path(f'public/data/geographic-expenses-{year}.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
        print(year, len(rows), sum(row['total'] for row in rows))
