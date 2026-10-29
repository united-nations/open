"""Shared CEB source validation and selection of independent expense totals."""
import numpy as np
import pandas as pd
from utils import GEOGRAPHIC_AREA_TYPES, canonical_geographic_area


# CEB Standard II function names shared by the independent and geographic exports.
CEB_FUNCTIONS = {
    'Other (combined Normative and Technical Cooperation)': 'legacy-other',
    'Development Assistance': 'development',
    'Humanitarian Assistance': 'humanitarian',
    'Peace Operations': 'peace',
    'Global Agenda and Specialised Assistance': 'global',
    'Global Agenda and Specialized Assistance': 'global',
}


def normalize_geographic_locations(frame: pd.DataFrame) -> pd.DataFrame:
    """Repair known area names coded COU without changing rows or amounts.

    Preserve the downloaded code independently of the corrected display type.
    Other source classifications (including REG/SUB disagreements) are retained.
    Unknown country labels remain unresolved downstream; no country is guessed.
    """
    frame = frame.copy()
    if 'source_location_type' not in frame:
        frame['source_location_type'] = frame['location_type']
    areas = frame['country/territory'].map(
        lambda name: canonical_geographic_area(name) if isinstance(name, str) else None
    )
    corrected = (frame.location_type == 'COU') & areas.notna()
    frame.loc[corrected, 'location_type'] = areas[corrected].map(GEOGRAPHIC_AREA_TYPES)
    return frame


def normalize_frame(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame.columns = [str(c).strip().lower().replace(' ', '_').replace('usd_amount', 'amount') for c in frame.columns]
    frame['calendar_year'] = pd.to_numeric(frame.calendar_year, errors='raise').astype(int)
    # A blank remains unknown. It is never silently converted to a zero contribution.
    frame['amount'] = pd.to_numeric(frame.amount, errors='raise')
    if np.isinf(frame.amount).any():
        raise ValueError('Non-finite CEB amount')
    if {'location_type', 'country/territory'}.issubset(frame.columns):
        frame = normalize_geographic_locations(frame)
    return frame


def select_geographic_totals(frame: pd.DataFrame) -> pd.DataFrame:
    """E06 is the total; E06A/B/C are overlapping components, not additional money.

    Legacy archived schemas and synthetic fixtures have no expense-type column.
    An explicitly supplied but missing/unknown type fails rather than losing rows.
    """
    if frame.amount.isna().any():
        raise ValueError('Missing geographic expense amount')
    if 'expenses_type' not in frame:
        return normalize_geographic_locations(frame) if {'location_type', 'country/territory'}.issubset(frame.columns) else frame.copy()
    unknown = set(frame.expenses_type) - {'E06', 'E06A', 'E06B', 'E06C'}
    if unknown:
        raise ValueError(f'Unknown or missing CEB expense types: {unknown}')
    totals = frame[frame.expenses_type == 'E06'].copy()
    if set(totals.calendar_year) != set(frame.calendar_year):
        raise ValueError('Geographic expense year has no E06 total records')
    return normalize_geographic_locations(totals) if {'location_type', 'country/territory'}.issubset(totals.columns) else totals


def select_sdg_expenses(frame: pd.DataFrame) -> pd.DataFrame:
    """Budget observations must not be added to reported actual expenditure."""
    if 'type_of_financial_information' not in frame:
        return frame.copy()
    unknown = set(frame.type_of_financial_information) - {'EXP', 'BUD', 'BUG'}
    if unknown:
        raise ValueError(f'Unknown SDG financial information types: {unknown}')
    actuals = frame[frame.type_of_financial_information == 'EXP'].copy()
    if actuals.amount.isna().any():
        raise ValueError('Missing SDG expense amount')
    return actuals


def revenue_controls(summary: pd.DataFrame, detail: pd.DataFrame) -> pd.DataFrame:
    """Keep the published revenue series; use complete detail for blank controls.

    Historical financing classifications differ between CEB's two presentations.
    Do not substitute the entire series just because the detailed file is complete.
    Only groups containing unknown amounts use the independent complete control.
    """
    from utils import normalize_entity
    frames = [summary.copy(), detail.copy()]
    for frame in frames:
        frame['agency'] = frame.agency.map(normalize_entity)
    summary, detail = frames
    keys = ['calendar_year', 'agency', 'rev_type']
    values = summary.groupby(keys).amount.sum(min_count=1)
    complete = detail.groupby(keys).amount.sum(min_count=1)
    missing_keys = summary[summary.amount.isna()].set_index(keys).index.unique()
    if detail.amount.isna().any():
        raise ValueError('Missing independent revenue control amount')
    for key in missing_keys:
        if key not in complete:
            raise ValueError(f'No independent revenue control for missing amount: {key}')
        values.loc[key] = complete.loc[key]
    if values.isna().any():
        raise ValueError('Unresolved missing revenue control')
    return values.rename('amount').reset_index()


def resolve_reporting_entities(frame, entity_column, controls, breakdowns):
    """Resolve sub-entities through published parent rows, only without own controls."""
    from utils import normalize_entity, CEB_SECRETARIAT_REPORTING_UNITS
    frame = frame.copy()
    frame[entity_column] = frame[entity_column].map(normalize_entity)
    for year, rows in frame.groupby('calendar_year'):
        reporting = set(controls.loc[controls.calendar_year == year, 'agency'].map(normalize_entity))
        parents = {}
        for source, agency_column, sub_column in breakdowns:
            for _, row in source[source.calendar_year == year].dropna(subset=[sub_column]).iterrows():
                parent = normalize_entity(row[agency_column])
                child = str(row[sub_column])
                aliases = {child}
                if child.startswith('UN-'):
                    aliases.add(child[3:])
                for alias in aliases:
                    parents.setdefault(normalize_entity(alias), set()).add(parent)
        # Standard I lists UNRISD and the Technology Bank as reporting through UN
        # (March 2024 edition, printed p.7, footnote 6). Standalone controls win.
        for child in CEB_SECRETARIAT_REPORTING_UNITS:
            for alias in (child, 'UN-' + child):
                parents.setdefault(normalize_entity(alias), set()).add(normalize_entity('UN'))
        # CEB uses DPO for the peacekeeping aggregate in some detail files.
        # Elsewhere DPO identifies the Secretariat department, so scope it here.
        parents['DPO'] = {normalize_entity('UN-DPO')}
        for entity in rows[entity_column].unique():
            candidates = parents.get(entity, set()) & reporting
            if entity not in reporting:
                if len(candidates) != 1:
                    raise ValueError(f'Unresolved CEB reporting entity: {year} {entity}')
                frame.loc[(frame.calendar_year == year) & (frame[entity_column] == entity), entity_column] = next(iter(candidates))
    return frame


def resolve_geographic_reporting_entities(frame: pd.DataFrame, controls: pd.DataFrame) -> pd.DataFrame:
    """Use explicit same-year expense-source parents, retaining partial records.

    Geographic coverage starts earlier than expense controls. A source-only
    reporting unit without a published same-year relationship remains separate;
    no historical parent is inferred from the current reporting-unit standard.
    """
    from utils import normalize_entity
    frame = frame.copy()
    if 'source_agency' not in frame:
        frame['source_agency'] = frame.agency
    frame['agency'] = frame.agency.map(normalize_entity)
    for year, rows in frame.groupby('calendar_year'):
        source = controls[controls.calendar_year == year]
        reporting = set(source.agency.map(normalize_entity))
        parents = {}
        if 'sub_agency' in source:
            for _, row in source.dropna(subset=['sub_agency']).iterrows():
                child = str(row.sub_agency)
                aliases = {child}
                prefix = str(row.agency) + '-'
                if child.startswith(prefix):
                    aliases.add(child[len(prefix):])
                for alias in aliases:
                    parents.setdefault(normalize_entity(alias), set()).add(normalize_entity(row.agency))
        for entity in rows.agency.unique():
            if entity in reporting:
                continue
            candidates = parents.get(entity, set()) & reporting
            if len(candidates) > 1:
                raise ValueError(f'Ambiguous geographic reporting parent: {year} {entity}')
            if candidates:
                frame.loc[(frame.calendar_year == year) & (frame.agency == entity), 'agency'] = next(iter(candidates))
    return frame
