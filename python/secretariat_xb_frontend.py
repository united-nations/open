"""Add separately reported XB spending to the existing trust-fund tree contract.

Entity totals are the chart frontier when gross account rows require eliminations.
The original account rows and explicit reconciliation remain available in sidebars.
Contributor measures are deliberately not merged into the Volume I contributor file.
"""
from __future__ import annotations

import csv
from decimal import Decimal
import json
from pathlib import Path

ENTITIES = {
    'UNEP': 'United Nations Environment Programme',
    'UNODC': 'United Nations Office on Drugs and Crime',
    'UN-HABITAT': 'United Nations Human Settlements Programme',
    'ITC': 'International Trade Centre',
}
GROUPS = [
    {'id': 'volume_i', 'label': 'UN Secretariat trust-fund schedules',
     'description': 'Individual fund accounts accompanying the United Nations Volume I accounts.'},
    {'id': 'separate_entities', 'label': 'Separately reported entities',
     'description': 'UNEP, UNODC, UN-Habitat and ITC. XB expenditure from their separately published reports.'},
]


def read_csv(path: Path) -> list[dict]:
    with path.open() as handle:
        return list(csv.DictReader(handle))


def money(value: str) -> int:
    parsed = Decimal(value)
    if parsed != parsed.to_integral_value():
        raise ValueError(f'Non-integral USD expense: {value}')
    return int(parsed)


def reference(row: dict) -> dict:
    return {
        'symbol': row['document_symbol'], 'url': row['source_url'],
        'pdfPage': int(row['pdf_page']), 'pdfPageScope': 'row',
        'pageStatus': 'extracted_pdf_row', 'rowLabel': row['reported_label'],
        'columnHeader': row.get('source_column_header') or row['source_column'],
        'tableTitle': row['table_title'],
    }


def derived_references(row: dict) -> list[dict]:
    return [dict(symbol=r['document_symbol'], url=r['url'], pdfPage=r['pdf_page'],
        pdfPageScope='row', pageStatus='extracted_pdf_row', rowLabel=r['row'],
        columnHeader=r['column'], tableTitle=r['table_title'])
        for r in json.loads(row['supporting_sources'])]


def unep_reference_sources(stage2: Path, year: int) -> list[dict]:
    manifest=json.loads((stage2.parent/'unep-contributors/source-manifest.json').read_text())
    refs=[dict(symbol=source['document_symbol'],url=source['source_url'],
                 pdfPage=source['pdf_page'],pdfPageScope='section',
                 rowLabel='Annual report funding snapshot (reference only)')
            for source in manifest if source['year']==year]
    if year in [2023,2024]:
        sources=json.loads((stage2.parent/'source-manifest.json').read_text())
        audited=next(source for source in sources if source['source_id']==f'unep-accounts-{year}')
        refs.append(dict(symbol='Audited CBD fund accounts — '+audited['document_symbol'],
                         url=audited['url'],pdfPage=137 if year==2023 else 135,
                         pdfPageScope='table',rowLabel='CBD fund accounts, Annex III (reference only)'))
        ledgers=json.loads((stage2.parent/'unep-contributors/cbd-source-manifest.json').read_text())
        ledger=next(source for source in ledgers if source['year']==year)
        refs.append(dict(symbol=f'CBD contribution-status ledgers {year} (web tables)',
                         url=ledger['source_url'],rowLabel='Partial CBD collection ledgers (reference only)'))
    return refs


def extend_spending(payload: dict, year: int, stage2: Path) -> dict:
    """Preserve legacy identities/amounts; add the independently reported source group."""
    quality = json.loads((stage2.parent / 'quality-profile.json').read_text())
    if not quality['status'].startswith('passed'):
        raise ValueError('XB extraction has not passed validation')
    facts = read_csv(stage2 / 'statement-facts.csv')
    derived = read_csv(stage2 / 'derived-xb-controls.csv')
    objects = {r['object_id']: r for r in read_csv(stage2 / 'objects.csv')}
    nodes = payload['nodes']
    for node in nodes:
        node['sourceGroup'] = 'volume_i'
    baseline = payload['meta']['total']
    root = next(n for n in nodes if n['parentId'] is None)
    extra = []
    for entity, name in ENTITIES.items():
        source = next((r for r in derived if r['reporting_entity']==entity
            and int(r['period_year'])==year and r['is_comparative']=='False'), None)
        itc = next((r for r in facts if r['reporting_entity']==entity=='ITC'
            and int(r['period_year'])==year and r['metric']=='gross_xb_expenditure'), None)
        if source:
            amount = money(source['amount_usd'])
            refs = derived_references(source)
            measure = 'Audited expenditure excluding regular-budget expenses'
            source_id = source['source_id']
        elif itc:
            amount = money(itc['amount_usd'])
            refs = [reference(itc)]
            measure = 'Reported gross XB programme delivery'
            source_id = itc['source_id']
        else:
            continue
        entity_id = f'xb-entity:{entity}'
        node = dict(id=entity_id, parentId='xb-source:entities', tier='budget_unit', kind='entity',
            code=entity, label=name, amount=amount, values={'extrabudgetary': amount},
            basis='derived_from_printed_totals' if source else 'directly_printed',
            unitType='entity', role='source_node', entity={'name': name, 'acronym': entity,
            'relationship': 'separate_financial_reporting_entity'}, sourceGroup='separate_entities',
            chartAsAggregate=True, sourceMeasure=measure, contributorsAvailable=False,
            xbEntity=entity, contributorScope='entity',
            supportingSources=refs, source=refs[0],
            detailLabel='Fund accounts' if entity=='UNEP' else 'Funding segments',
            note=f'{measure}. Gross account or segment details, where available, are shown below. The chart preserves the entity total.')
        from secretariat_xb_fund_positions import fund_positions
        positions = fund_positions(entity,year,stage2)
        details = []
        for row in facts:
            if row['source_id']!=source_id or row['metric']!='expenses' or int(row['period_year'])!=year:
                continue
            if entity=='UNEP' and row['object_kind']!='fund_account':
                continue
            if entity=='UN-HABITAT' and (row['object_kind']!='segment' or row['regular_budget']=='True'):
                continue
            if entity not in ['UNEP','UN-HABITAT']:
                continue
            obj = objects[row['object_id']]
            value = money(row['amount_usd'])
            ref = reference(row)
            child = dict(id=f'xb:{row["object_id"]}', parentId=entity_id, tier='detail', kind='allocation',
                code=obj['original_code'], label=obj['name'], amount=value, values={'extrabudgetary':value},
                basis='directly_printed', sourceGroup='separate_entities', source=ref, supportingSources=[ref],
                sourceMeasure='Gross account expenses' if entity=='UNEP' else 'Gross segment expenses',
                contributorsAvailable=False, xbEntity=entity, contributorScope=row['object_id'],
                note='Reported account/segment expenditure before entity-level eliminations. Its inclusion here does not establish legal trust-fund status.')
            position = next((r for r in facts if r['source_id']==source_id and r['object_id']==row['object_id']
                and r['metric']=='closing_net_assets' and int(r['period_year'])==year), None)
            if position and position['amount_usd']:
                child['financialPosition'] = dict(asOf=f'{year}-12-31', fundCount=1, metrics=[dict(
                    key='netAssets', label='Net assets', amount=money(position['amount_usd']), fundsCovered=1,
                    supportingSources=[reference(position)])])
            if row["object_id"] in positions:
                child["financialPosition"] = positions[row["object_id"]]
            details.append(child)
        if details:
            gross = sum(r['amount'] for r in details)
            eliminations = [r for r in facts if r['source_id']==source_id and int(r['period_year'])==year
                and r['metric']=='expenses' and r['object_kind']=='adjustment' and not r['annex']]
            if len(eliminations)!=1:
                raise ValueError(f'Missing expense elimination: {entity} {year}')
            adjustment = money(eliminations[0]['amount_usd'])
            residual = amount-gross-adjustment
            if abs(residual)>2000:
                raise ValueError(f'Unexplained detail difference: {entity} {year}: {residual}')
            node['expenseReconciliation'] = dict(detailTotal=gross, eliminations=adjustment,
                roundingDifference=residual, entityTotal=amount, supportingSources=[reference(eliminations[0]), *refs])
        elif entity=='UNODC' and source_id:
            node['note'] += ' Drug/crime pillar figures include regular-budget resources and are not used as an XB breakdown.'
        elif entity=='ITC':
            node['note'] += ' Window I/II contribution figures are not expenditure breakdowns.'
        if entity=='UNEP' and details:
            from secretariat_xb_hierarchy import unep_hierarchy
            groups = unep_hierarchy(facts, source_id, details, entity_id)
            for group in groups:
                group['xbEntity'] = entity
            details.extend(groups)
            node['detailLabel'] = 'Fund segments'
        if entity=='UNEP':
            node['referenceSources'] = unep_reference_sources(stage2,year)
        extra.extend([node,*details])
    total = sum(n['amount'] for n in extra if n['tier']=='budget_unit')
    if extra:
        # Retain the original Volume I root total and its stock/source evidence.
        # The new structural parent is never used as a displayed financial total.
        umbrella_id = 'trust-fund-reporting-sources'
        root['parentId'] = umbrella_id
        nodes.append(dict(id=umbrella_id, parentId=None, tier='whole', kind='whole',
            label='Trust funds and separately reported XB expenditure',
            amount=baseline+total, values={'extrabudgetary':baseline+total},
            basis='mixed_reporting_sources', contributorsAvailable=False,
            note='Reported expenditure is unconsolidated; the source measures have different accounting boundaries.'))
        for tier,identifier,parent in [('part','xb-source',umbrella_id),('section','xb-source:entities','xb-source')]:
            nodes.append(dict(id=identifier,parentId=parent,tier=tier,kind=tier,code='XB',
                label='Separately reported entities',amount=total,values={'extrabudgetary':total},
                sourceGroup='separate_entities',basis='derived_from_source_totals'))
        nodes.extend(extra)
    meta = payload['meta']
    meta.update(total=baseline+total, sourceKind='mixed_trust_fund_sources',
        title='Trust funds and separately reported XB expenditure',
        scopeLabel='UN Secretariat trust-fund schedules and separately reported entity XB expenditure',
        sourceGroups=[dict(g,amount=baseline if g['id']=='volume_i' else total if extra else None) for g in GROUPS],
        sourceNote='The displayed sum is reported expenditure, not consolidated Secretariat expenditure. Source measures have different accounting boundaries, and cross-source transfers have not been reconciled or eliminated. Years without extracted report data remain unavailable. Contributor measures remain separate.',
        scopeWarning=meta['scopeWarning']+' Separate entity totals use audited non-RB expenditure where available; ITC uses reported gross XB programme delivery. Gross account/segment details must not be added to their parent total.')
    return payload
