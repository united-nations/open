"""Narrow source-evidenced exceptions recorded by the September 2026 audit.

The immutable release is never edited. Keep printed source inconsistencies;
only superseded controls and independently verified missing detail are repaired.
"""
import json
from pathlib import Path
from urllib.parse import quote


PDF_REVIEWS = json.loads(
    (Path(__file__).resolve().parents[1] / "data/ppb-reviewed-pdf-pages.json")
    .read_text(encoding="utf-8")
)
PDF_PAGE_REVIEWS = {row["citationId"]: row for row in PDF_REVIEWS["corrections"]}


def correct_verified_pdf_pages(citations):
    """Reviewed physical pages in the final A/81/6 (Sect. 1) PDF.

    Table 1.44 begins on p34, but its OA/XB rows continue on p35.
    The resident coordinator regular-budget table 1.145 is on p137;
    p139 instead contains the separate special-purpose trust-fund table.
    Bind these corrections to released DOCX table identities and row labels,
    never to an inferred offset or a similarly named table in another edition.
    """
    prefix = 'ppb2027:A_81_6 (SECT. 1) PRELIMINARY|word/document.xml|'
    reviewed = {
        prefix + 't0054': (35, '(2) Other assessed', {'Executive direction and management', 'Subtotal, 2'}),
        prefix + 't0055': (35, '(3) Extrabudgetary', {'Executive direction and management', 'Subtotal, 3', 'Total (1+2+3)'}),
        prefix + 't0195': (137, 'Evolution of financial resources by object of expenditure', {'Grants and contributions', 'Total'}),
    }
    for citation in citations:
        review = PDF_PAGE_REVIEWS.get(citation.get("citationId"))
        if (
            review
            and citation.get("rowLabel") == review["rowLabel"]
            and (citation.get("pdfUrl") or "").split("#", 1)[0] == review["pdfUrl"]
            and " › ".join(str(item) for item in citation.get("headerPath", [])) == review["columnHeader"]
        ):
            citation.update(
                pdfPage=review["correctPage"], pdfPages=[review["correctPage"]],
                pdfPageScope="row", pageStatus="located",
                pageLocatedBy="reviewed_final_pdf_row",
            )
            continue
        match = reviewed.get(citation.get('tableId'))
        if not match:
            continue
        page, title, rows = match
        if citation.get('tableTitle') != title or citation.get('rowLabel') not in rows:
            continue
        citation.update(pdfPage=page, pdfPages=[page], pdfPageScope='row',
                        pageStatus='located', pageLocatedBy='reviewed_final_pdf_row')


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


def reviewed_reference(financial, citation_source, identity, year, measure, row_label, page):
    matches = [row for row in financial['observations'] if row['observationId'] == identity]
    if len(matches) != 1:
        raise ValueError(f'Expected one reviewed budget observation for {identity}, found {len(matches)}')
    observation = matches[0]
    lens = observation['lens']
    if (lens['dataYear'], lens['measure'], lens['fundingSource'], lens['currency']) != (
        year, measure, 'regular_budget', 'USD'
    ):
        raise ValueError(f'Unexpected budget lens for {identity}')
    citation = next(row for row in financial['citations'] if row['citationId'] == observation['citationId'])
    if citation['rowLabel'] != row_label:
        raise ValueError(f'Unexpected budget row label for {identity}')
    source = citation_source({
        **citation, 'pdfPage': page, 'pdfPageScope': 'row', 'pageStatus': 'located',
        'pageLocatedBy': 'reviewed_final_pdf_row',
    })
    amount = int(observation['money']['amountExact'])
    return amount, {
        **source, 'label': 'Regular budget', 'operand': {'amount': amount, 'currency': 'USD'},
    }


def apply_annual_exceptions(payload, metric, financial, citation_source):
    if metric == 'expenditure':
        return
    year = payload['meta']['year']
    nodes = {n['id']: n for n in payload['nodes']}
    source_discrepancies = {}

    def set_amount(node, amount, sources=None):
        node['amount'] = amount
        node['values'] = {'regular_budget': amount}
        node['metricValues'] = {metric: dict(node['values'])}
        node['metricAmounts'] = {metric: amount}
        if sources:
            node['metricSources'] = {metric: {'regular_budget': sources}}
        else:
            node.pop('metricSources', None)

    if (metric, year) in (('approved', 2020), ('proposed', 2021)):
        measure, column = ('appropriation', 2) if metric == 'approved' else ('requirements', 4)
        amount, source = reviewed_reference(
            financial, citation_source,
            f'ppb2021:A_75_6 (SECT. 3)_ADD.1|word/document.xml|t0009|r0030|c{column:04d}',
            year, measure, 'Provision for the share of special political missions for the Regional Service Centre', 32,
        )
        siblings = [n for n in nodes.values() if n['parentId'] == 'section-3']
        if (any('regular_budget' not in n['values'] for n in siblings)
                or sum(n['amount'] for n in siblings) + amount != nodes['section-3']['amount']):
            raise ValueError(f'{year} Section 3 children do not reconcile with the printed support allocation')
        support = {
            'id': 'section-3~regional-service-centre-share', 'parentId': 'section-3',
            'tier': 'budget_unit', 'kind': 'allocation', 'code': None,
            'label': 'Regional Service Centre share for special political missions',
            'basis': 'printed', 'unitType': 'programme', 'role': 'source_node',
        }
        set_amount(support, amount, [source])
        payload['nodes'].append(support)
        coverage = payload['meta']['metricCoverage']
        coverage['budgetUnits'] += 1
        coverage['byMetric'][metric] += 1

    if metric == 'proposed' and year == 2027:
        controls = (
            ('11', 't0021|r0009', 22, 164100, -164100),
            ('29E', 't0035|r0011', 25, 180700, -181700),
            ('30', 't0018|r0010', 18, 347000, -347000),
        )
        rollups = set()
        for section, cell, page, section_difference, programme_difference in controls:
            amount, source = reviewed_reference(
                financial, citation_source,
                f'ppb2027:A_81_6 (SECT. {section})|word/document.xml|{cell}|c0008',
                year, 'proposed', 'Subtotal, 1', page,
            )
            section_id = f'section-{section}'
            wrapper_id = f'{section_id}~section-wide-allocations'
            section_node, wrapper = nodes[section_id], nodes[wrapper_id]
            if (wrapper['role'] != 'section_scope'
                    or [n['id'] for n in nodes.values() if n['parentId'] == section_id] != [wrapper_id]):
                raise ValueError(f'{section_id} no longer has a single section-wide allocation')
            for node in (section_node, wrapper):
                set_amount(node, amount, [source])
                node['basis'] = 'printed'
                node['note'] = 'Uses the printed regular-budget section total. The source programme-of-work subtotal differs from its itemized amounts.'
            programme_id = f'{wrapper_id}~programme-of-work'
            nodes[programme_id]['note'] = 'The printed programme-of-work subtotal differs from the sum of its itemized amounts.'
            source_discrepancies[wrapper_id] = section_difference
            source_discrepancies[programme_id] = programme_difference
            parent = section_node['parentId']
            while parent:
                rollups.add(parent)
                parent = nodes[parent]['parentId']
        for node in reversed(payload['nodes']):
            if node['id'] in rollups:
                set_amount(node, sum(n['amount'] for n in nodes.values() if n['parentId'] == node['id']))
                # Inherit citations again from the corrected section controls.
                node.pop('metricSources', None)

    if metric == 'proposed' and year == 2025:
        node = nodes['section-24']
        delta = 240210200 - node['amount']
        source = reference('A/79/6 (Sect. 24)/Corr.1', 9, 'Total', 2025, 'Annex III')
        source['operand'] = {'amount': 240210200, 'currency': 'USD'}
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
        source['operand'] = {'amount': 3500000, 'currency': 'USD'}
        node = {'id': identity, 'parentId': parent['id'], 'tier': 'detail', 'kind': 'allocation',
                'code': None, 'label': 'Conferencing infrastructure and equipment', 'basis': 'printed',
                'completeness': 'complete', 'note': 'New proposed allocation; no historical expenditure is inferred.'}
        set_amount(node, 3500000, [source])
        if identity not in nodes:
            payload['nodes'].append(node)
            set_amount(parent, parent['amount'] + 3500000)
            set_amount(wrapper, wrapper['amount'] + 3500000)
        parent['note'] = 'Includes the new conferencing allocation printed in Table 33.1.'

    if (metric, year) in (('approved', 2026), ('proposed', 2027)) and 'section-8' in nodes:
        # Section 8 Annex III p. 91 excludes the two courts from the
        # non-expenditure columns. The projection matched their expenditure
        # residual to the same three offices already included in the section.
        courts_id = 'section-8~extraordinary-chambers-in-the-courts-of-cambodia-and-residua'
        courts = nodes.pop(courts_id)
        section = nodes['section-8']
        section_total = 62281400 if metric == 'approved' else 64471200
        siblings = [n for n in nodes.values() if n['parentId'] == section['id']]
        if (
            len(siblings) != 3
            or any(n['parentId'] == courts_id for n in nodes.values())
            or courts['amount'] != section_total
            or sum(n['amount'] for n in siblings) != section_total
        ):
            raise ValueError(f'Unexpected Section 8 projection in {year}')
        payload['nodes'].remove(courts)
        coverage = payload['meta']['metricCoverage']
        coverage['budgetUnits'] -= 1
        coverage['byMetric'][metric] -= 1
        source = reference('A/81/6 (Sect. 8)', 91, 'Total', year, 'Annex III')
        source['columnHeader'] = f'{year} {metric}'
        source['operand'] = {'amount': section_total, 'currency': 'USD'}
        set_amount(section, section_total, [source])
        section['basis'] = 'printed'
        parts = {section['parentId']}

        # Table 33.1 p. 4 has printed controls for both stages. In the approved
        # column the safety subtotal exceeds its itemized rows by $19,600.
        section_id = 'section-33'
        wrapper_id = section_id + '~section-special-purpose-allocations'
        safety_id = wrapper_id + '~safety-and-security'
        column = 'c0002' if metric == 'approved' else 'c0008'
        for row, label, ids in [
            ('r0036', 'Subtotal', [safety_id]),
            ('r0041', 'Total', [section_id, wrapper_id]),
        ]:
            amount, source = reviewed_reference(
                financial, citation_source,
                f'ppb2027:A_81_6 (SECT. 33)|word/document.xml|t0002|{row}|{column}',
                year, 'appropriation' if metric == 'approved' else 'proposed', label, 4,
            )
            for node_id in ids:
                if metric == 'proposed' and nodes[node_id]['amount'] != amount:
                    raise ValueError(f'{node_id} proposed amount differs from the printed control')
                set_amount(nodes[node_id], amount, [source])
                nodes[node_id]['basis'] = 'printed'
        if metric == 'approved':
            source_discrepancies[safety_id] = 19600
        parts.add(nodes[section_id]['parentId'])

        for part in parts:
            sections = [n for n in nodes.values() if n['parentId'] == part]
            sources = (
                sections[0].get('metricSources', {}).get(metric, {}).get('regular_budget')
                if len(sections) == 1 else None
            )
            set_amount(nodes[part], sum(n['amount'] for n in sections), sources)
        amount, source = reviewed_reference(
            financial, citation_source,
            f'ppb2027:A_81_6 (INTRODUCTION)|word/document.xml|t0023|r0020|{column}',
            year, metric, 'Total', 53,
        )
        if sum(n['amount'] for n in nodes.values() if n['parentId'] == 'whole') != amount:
            raise ValueError(f'Corrected {year} budget parts differ from the printed whole control')
        set_amount(nodes['whole'], amount, [source])
        nodes['whole']['basis'] = 'printed'

        for control in PDF_REVIEWS["aggregateControls"]:
            if (control["metric"], control["year"]) != (metric, year):
                continue
            node = nodes[control["nodeId"]]
            if node["values"].get("regular_budget") != control["amountUsd"]:
                raise ValueError(f'{node["id"]} differs from its reviewed {year} Table 2 control')
            source = {
                "symbol": "A/81/6 (INTRODUCTION)",
                "url": f'{control["pdfUrl"]}#page={control["pdfPage"]}',
                "pdfPage": control["pdfPage"],
                "pdfPageScope": "row",
                "pageStatus": "located",
                "pageLocatedBy": "reviewed_final_pdf_row",
                "sourceCellId": control["sourceCellId"],
                "label": "Regular budget",
                "rowLabel": control["rowLabel"],
                "columnHeader": control["columnHeader"],
                "tableTitle": control["tableTitle"],
                "operand": {"amount": control["amountUsd"], "currency": "USD"},
            }
            set_amount(node, control["amountUsd"], [source])
            node["basis"] = "printed"

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
        if node['id'] in source_discrepancies:
            difference = node['amount'] - total
            if len(published) != len(items) or difference != source_discrepancies[node['id']]:
                raise ValueError(f"Source discrepancy changed for {node['id']}: {difference}")
            outcome = 'printed_source_discrepancy'
        node['breakdowns'] = {'regular_budget': {'childAmount': total, 'difference': difference,
                              'outcome': outcome, 'completeness': 'complete' if complete else 'incomplete'}}
        node['completeness'] = 'complete' if complete else 'incomplete'
        if source_inconsistent:
            node['note'] = 'Corr.1 retains a printed subtotal of $198,776,300; its corrected children sum to $197,915,100. This is a source inconsistency.'
    root = next(n for n in payload['nodes'] if n['parentId'] is None)
    payload['meta']['total'] = root['amount']
    payload['meta']['metrics'][metric]['total'] = root['amount']
