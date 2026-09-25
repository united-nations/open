"""Narrow source-evidenced exceptions recorded by the September 2026 audit.

The immutable release is never edited. Keep printed source inconsistencies;
only superseded controls and independently verified missing detail are repaired.
"""
from urllib.parse import quote


def correct_ola_year(financial):
    """A/76/6 Sect.8 table 8.32 says 2021 in its 2022 estimate header.

    Table 8.34 (p57) and the adjacent OA/XB headers establish the intended year.
    Bind only this physical table/column; preserve the erroneous printed header.
    """
    citations = {c['citationId']: c for c in financial['citations']}
    for observation in financial['observations']:
        c = citations.get(observation.get('citationId'), {})
        if (c.get('tableId') == 'ppb2022:A_76_6 (SECT. 8)|word/document.xml|t0046'
                and c.get('column') == 8
                and observation['lens'].get('dataYear') == 2021):
            observation['lens']['dataYear'] = 2022
            c['pdfPage'] = 54
            c['pageStatus'] = 'located'
            c['tableTitle'] = 'Table 8.32 — source header says 2021; intended 2022 confirmed by Table 8.34'


def reference(symbol, page, row, year, table):
    return {'symbol': symbol, 'url': f'https://documents.un.org/api/symbol/access?s={quote(symbol, safe="")}&l=en&t=pdf#page={page}',
            'pdfPage': page, 'pdfPageScope': 'row', 'pageStatus': 'located',
            'rowLabel': row, 'columnHeader': f'{year} estimate (before recosting)',
            'tableTitle': table, 'label': 'regular budget'}


def apply_annual_exceptions(payload, metric):
    if metric == 'expenditure':
        return
    year = payload['meta']['year']
    nodes = {n['id']: n for n in payload['nodes']}

    def set_amount(node, amount, sources=None):
        node['amount'] = amount
        node['values'] = {'regular_budget': amount}
        node['metricValues'] = {metric: dict(node['values'])}
        node['metricAmounts'] = {metric: amount}
        if sources:
            node['metricSources'] = {metric: {'regular_budget': sources}}

    if metric == 'proposed' and year == 2025:
        node = nodes['section-24']
        delta = 240210200 - node['amount']
        source = reference('A/79/6 (Sect. 24)/Corr.1', 9, 'Total', 2025, 'Annex III')
        set_amount(node, 240210200, [source])
        node['note'] = 'Corrected explicit section control from corrigendum Annex III. The printed programme-of-work subtotal has a separate source inconsistency.'
        # Part/root are calculated rollups, not independent source controls.
        parent = node['parentId']
        while parent:
            ancestor = nodes[parent]
            set_amount(ancestor, ancestor['amount'] + delta)
            ancestor['note'] = 'Calculated rollup incorporating the corrected section 24 control (Corr.1 Annex III).'
            parent = ancestor['parentId']
    if metric == 'proposed' and year == 2024:
        wrapper = nodes['section-33~section-special-purpose-allocations']
        parent = nodes[wrapper['id'] + '~information-and-communications-technology']
        identity = parent['id'] + '~conferencing-infrastructure-and-equipment'
        source = reference('A/78/6 (Sect. 33)', 4, 'Conferencing infrastructure and equipment', 2024, 'Table 33.1')
        node = {'id': identity, 'parentId': parent['id'], 'tier': 'detail', 'kind': 'allocation',
                'code': None, 'label': 'Conferencing infrastructure and equipment', 'basis': 'printed',
                'completeness': 'complete', 'note': 'New proposed allocation; no historical expenditure is inferred.'}
        set_amount(node, 3500000, [source])
        if identity not in nodes:
            payload['nodes'].append(node)
            set_amount(parent, parent['amount'] + 3500000)
            set_amount(wrapper, wrapper['amount'] + 3500000)
        parent['note'] = 'Includes the new conferencing allocation printed in Table 33.1.'
    # Recompute reconciliation for the selected metric rather than inheriting
    # expenditure-only metadata or marking missing projected detail complete.
    children = {}
    for node in payload['nodes']:
        children.setdefault(node['parentId'], []).append(node)
    for node in payload['nodes']:
        items = children.get(node['id'], [])
        if not items:
            node['completeness'] = 'complete' if node['values'] else 'not_published'
            continue
        published = [n for n in items if 'regular_budget' in n['values']]
        total = sum(n['values'].get('regular_budget', 0) for n in items)
        difference = total - node['values'].get('regular_budget', 0)
        complete = len(published) == len(items) and difference == 0
        source_inconsistent = year == 2025 and metric == 'proposed' and node['id'].startswith('section-24~office-') and node['id'].endswith('~programme-of-work')
        outcome = 'exact' if complete else 'printed_source_discrepancy' if source_inconsistent else 'unreconciled_difference'
        node['breakdowns'] = {'regular_budget': {'childAmount': total, 'difference': difference,
                              'outcome': outcome, 'completeness': 'complete' if complete else 'incomplete'}}
        node['completeness'] = 'complete' if complete else 'incomplete'
        if source_inconsistent:
            node['note'] = 'Corr.1 retains a printed subtotal of $198,776,300; its corrected children sum to $197,915,100. This is a source inconsistency.'
    root = next(n for n in payload['nodes'] if n['parentId'] is None)
    payload['meta']['total'] = root['amount']
    payload['meta']['metrics'][metric]['total'] = root['amount']
