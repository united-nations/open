"""Source-specific donor series; no merger of incompatible revenue measures."""
from collections import defaultdict
from decimal import Decimal
import json
from pathlib import Path

from secretariat_xb_frontend import money, read_csv, reference

LABELS = {'UN-HABITAT:segment:FNDN':'Foundation non-earmarked',
          'UN-HABITAT:segment:FNDE':'Foundation earmarked',
          'UN-HABITAT:segment:TECH':'Technical cooperation',
          'ITC:window:WI':'Window I', 'ITC:window:WII':'Window II'}


def series_from_rows(entity, year, scope, rows):
    donors = defaultdict(list)
    other = defaultdict(list)
    controls = []
    for row in rows:
        if row['row_kind'] == 'contributor': donors[row['counterparty']].append(row)
        elif row['row_kind'] == 'non_donor_category': other[row['counterparty']].append(row)
        elif row['row_kind'] == 'reported_total': controls.append(row)
    def exported(name, records):
        return dict(name=name, amount=sum(money(r['amount_usd']) for r in records),
                    sources=[reference(r) for r in records],
                    grouped=any(r['is_grouped_counterparty']=='True' for r in records),
                    needsReview=any(r['counterparty_quality']=='source_label_requires_review' for r in records),
                    components=[dict(id=r['object_id'], label=LABELS.get(r['object_id'],r['object_id']),
                                     amount=money(r['amount_usd']), sources=[reference(r)]) for r in records])
    named = sorted((exported(n,rs) for n,rs in donors.items()), key=lambda r:(-r['amount'],r['name']))
    non_donor = [exported(n,rs) for n,rs in other.items()]
    total = sum(money(r['amount_usd']) for r in controls) if controls else None
    row_total = sum(r['amount'] for r in [*named,*non_donor])
    warnings = []
    if entity == 'UN-HABITAT':
        warnings.append('Interim contribution status, including transfers in earmarked segments and before separately reported refunds. This is not audited net contribution revenue.')
        if scope == 'entity' and year < 2023:
            warnings.append('Partial historical coverage: Foundation non-earmarked contributions only.')
    else:
        warnings.append('Source-defined XB funding received. It is not relabelled as IPSAS contribution revenue or as cash receipts. Window totals include a separately identified revolving-funds category.')
    if total is not None and total != row_total:
        warnings.append(f'Printed total exceeds extracted contributor and other-category rows by USD {total-row_total:,}. The difference is retained and is not assigned to a contributor.')
    if any(r['needsReview'] for r in named):
        warnings.append('The source label “Strategy and Saudi Arabia” is retained as printed and requires identity review.')
    return dict(entity=entity,year=year,scope=scope,
                scopeLabel=('Foundation and technical cooperation' if entity=='UN-HABITAT' and year>=2023 else 'Foundation non-earmarked' if entity=='UN-HABITAT' else 'ITC Trust Fund') if scope=='entity' else LABELS[scope],
                measure='Interim contributions and transfers' if entity=='UN-HABITAT' else 'XB funding received',
                coverage='Partial entity coverage' if entity=='UN-HABITAT' else 'Reported ITC Trust Fund windows',
                rows=named,otherCategories=non_donor,reportedTotal=total,rowTotal=row_total,
                contributorTotal=sum(r['amount'] for r in named),difference=None if total is None else total-row_total,
                notes=warnings,sources=[reference(r) for r in controls])


def build_contributors(stage2):
    observations = read_csv(stage2/'contributor-observations.csv')
    selected = []
    for row in observations:
        if row['is_cross_year_total']=='True' or row['is_aggregate_column']=='True': continue
        if row['reporting_entity']=='UN-HABITAT':
            # Current-period reports supply 2023/24; latest report supplies the
            # 2020–2022 core-only comparatives, never both source vintages.
            year = int(row['period_year'])
            if row['source_id'] != ('habitat-2023-donors' if year==2023 else 'habitat-2024-donors'): continue
        selected.append(row)
    groups = defaultdict(list)
    for row in selected:
        if row['object_id'] not in LABELS: raise ValueError(f'Unsupported donor scope {row["object_id"]}')
        entity,year = row['reporting_entity'],int(row['period_year'])
        groups[(entity,year,'entity')].append(row)
        groups[(entity,year,row['object_id'])].append(row)
    series = [series_from_rows(entity,year,scope,rs) for (entity,year,scope),rs in sorted(groups.items())]
    return dict(schemaVersion=1,series=series)


def export_contributors(stage2, output):
    payload = build_contributors(stage2)
    payload['series'].extend(unodc_series(stage2))
    (output/'secretariat-xb-contributors.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False,allow_nan=False))
    return payload


def supplemental_reference(row):
    ref = dict(symbol=row['document_symbol'], url=row['source_url'],
               rowLabel=row.get('counterparty_reported') or row.get('reported_label') or 'Printed total',
               columnHeader=row.get('measure') or row.get('metric') or str(row['period_year']),
               tableTitle=row['table_title'])
    if row.get('pdf_page'):
        ref.update(pdfPage=int(row['pdf_page']),pdfPageScope='row',pageStatus='extracted_pdf_row')
    return ref


def unodc_series(stage2):
    root=stage2.parent/'unodc-contributors'
    quality=json.loads((root/'quality-profile.json').read_text())
    if not quality.get('ready_for_separately_labelled_pledge_view'):
        raise ValueError('UNODC pledge source has not passed validation')
    rows=read_csv(root/'contributor-observations.csv')
    controls=read_csv(root/'control-reconciliation.csv')
    def number(value):
        value=Decimal(str(value))
        return int(value) if value==value.to_integral_value() else float(value)
    def total(records): return number(sum((Decimal(r['amount_usd']) for r in records),Decimal(0)))
    groups = defaultdict(list)
    purpose = {'GP': 'General Purpose', 'SP': 'Special Purpose'}
    for row in rows:
        row['object_label'] = (
            (row['fund_family'] + ' / ' if row['fund_family'] else '')
            + purpose[row['funding_purpose']]
        )
        groups[int(row['period_year'])].append(row)
    result = []
    for year, records in sorted(groups.items()):
        donors = defaultdict(list)
        for row in records:
            donors[row['counterparty']].append(row)
        exported = []
        for name, values in donors.items():
            components = defaultdict(list)
            for row in values:
                components[(row['object_id'], row['object_label'])].append(row)
            exported.append(dict(
                name=name,
                amount=total(values),
                sources=[supplemental_reference(row) for row in values],
                grouped=any(row['is_grouped_counterparty'] == 'True' for row in values),
                components=[dict(
                    id=key[0], label=key[1], amount=total(component_rows),
                    sources=[supplemental_reference(row) for row in component_rows],
                ) for key, component_rows in components.items()],
            ))
        exported.sort(key=lambda row: (-row['amount'], row['name']))
        control = next(row for row in controls if int(row['period_year']) == year)
        document_total = number(control['document_total_usd'])
        row_total = total(records)
        difference = number(Decimal(str(document_total)) - Decimal(str(row_total)))
        notes = [
            'Pledges recorded during the calendar year may be received or spent in other years. '
            'They do not directly reconcile to annual recognized revenue or expenditure.',
            'General Purpose is unearmarked voluntary funding; Special Purpose is earmarked '
            'voluntary funding. The overall total combines both categories.',
        ]
        if year == 2023:
            notes.append(
                'The live report refreshed in March 2025 is USD 16,382.65 below the later '
                'official 2023 documentary control. The source-vintage difference remains unallocated.'
            )
        else:
            notes.append(
                'The static report headline says 82 donors, while GP/SP tables contain 80 '
                'distinct reported labels, including grouped and anonymous counterparties. '
                'Neither is treated as a verified count of named donors.'
            )
        sources = [supplemental_reference(records[0]), dict(
            symbol=control['document_symbol'], url=control['source_url'],
            pdfPage=int(control['pdf_page']), pdfPageScope='row',
            rowLabel=control['row_label'], tableTitle=control['table_title'],
            columnHeader=str(year) + ' pledged contributions',
        )]
        result.append(dict(
            entity='UNODC', year=year, scope='entity', scopeLabel='UNODC office-wide pledges',
            measure='Pledged contributions', coverage='Published GP/SP pledge rows; indicative source',
            rows=exported, otherCategories=[], reportedTotal=document_total, rowTotal=row_total,
            contributorTotal=row_total, difference=difference, notes=notes, sources=sources,
        ))
    return result


if __name__ == '__main__':
    export_contributors(Path('data/trust-fund-source-candidates/stage2'),Path('public/data'))
