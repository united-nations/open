"""Audited positions for explicitly reported XB funding groups only.

Habitat's five named funding segments have their own position columns. Whole-
entity/comparative totals and eliminations are validation evidence only. UNODC
pillars include RB and ITC's available fund reserve figures are not complete
positions; neither is substituted for a fund balance sheet.
"""
from pathlib import Path
from dataclasses import asdict
from collections import defaultdict
from decimal import Decimal
import csv
import hashlib
import json
import re
import pymupdf

import secretariat_xb_sources as xb

ROOT=Path('data/trust-fund-source-candidates')
OUTPUT_DIR='fund-position-research'
HABITAT_PAGES={2023:(100,101),2024:(81,82)}
HABITAT_GROUPS=[('Foundation non-earmarked','FNDN'),('Foundation earmarked','FNDE'),
    ('Technical cooperation','TECH'),('Programme support','PSC'),
    ('End-of-service and post-retirement benefits','BEN'),('Intersegment eliminations','ELIM'),
    ('All funds','TOTAL'),('All funds comparative','TOTAL')]
HEADINGS={'assets','current assets','non-current assets','liabilities','non-current liabilities','net assets'}


def write_csv(path,rows):
    with path.open('w',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)


def reference(row):
    return dict(symbol=row['document_symbol'],url=row['source_url'],pdfPage=int(row['pdf_page']),
        pdfPageScope='row',pageStatus='extracted_pdf_row',
        rowLabel=(row['section']+' > ' if row.get('section') else '')+row['reported_label'],
        columnHeader=row['source_column_header'],tableTitle=row['table_title'])


def extract(root=ROOT):
    """Offline reproducible extraction; outputs stay in fund-position-research/."""
    root=Path(root)
    out=root/OUTPUT_DIR;out.mkdir(exist_ok=True)
    sources=json.loads((root/'source-manifest.json').read_text())
    facts=[];tables=[];checks=[]
    for year,pages in HABITAT_PAGES.items():
        source=next(s for s in sources if s['reporting_entity']=='UN-HABITAT' and s['reporting_year']==year and s['source_role']=='audited_accounts')
        path=Path(source['local_path'])
        if not path.is_absolute():path=Path.cwd()/path
        if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:
            raise ValueError(f'Source checksum mismatch: {path}')
        doc=pymupdf.open(path)
        position_text=' '.join(doc[p-1].get_text() for p in pages)
        if 'Regular budget' in position_text or 'Thousands of United States dollars' not in position_text:
            raise ValueError(f'Unreviewed Habitat fund position scope/unit: {year}')
        if any(label not in ' '.join(position_text.split()) for label,_ in HABITAT_GROUPS[:4]):
            raise ValueError(f'Missing reported fund column: {year}')
        for page in pages:
            pdf=doc[page-1]
            if page==pages[0]:
                start=min(w[1] for w in pdf.get_text('words') if w[4]=='Assets')
            else:start=80
            spec=xb.Table(page,'All funds: statement of financial position by segment',
                'funding_segment_position',[dict(name=n,object_code=c,period_year=year-1 if i==7 else year) for i,(n,c) in enumerate(HABITAT_GROUPS)],start_y=start)
            rows,literal=xb.table_rows(pdf,spec)
            tables.append(dict(source_id=source['source_id'],specification=asdict(spec),table=literal))
            for row in rows:
                # These reviewed position layouts have baseline-aligned labels.
                # Restore that exact source row: heading concatenation can turn
                # 'Liabilities for conditional arrangements' into a false label
                # or prepend a skipped 'Provisions' line to 'Other liabilities'.
                baseline=next(q for q in literal['rows'] if q['physical_row_index']==row['physical_row_index'])
                label=baseline['label'] or row['label']
                preceding=[q['label'] for q in literal['rows'] if q['y']<row['y'] and q['label'].lower() in HEADINGS]
                section=preceding[-1] if preceding else ''
                for col,((amount,dash),printed) in enumerate(zip(row['parsed'],row['cells'])):
                    name,code=HABITAT_GROUPS[col]
                    period=year-1 if col==7 else year
                    facts.append(dict(source_id=source['source_id'],reporting_entity='UN-HABITAT',report_year=year,period_year=period,
                        object_id='UN-HABITAT:'+('segment:' if col<5 else 'adjustment:' if col==5 else 'entity_total:')+code,
                        object_kind='funding_segment' if col<5 else 'adjustment' if col==5 else 'validation_entity_total',
                        scope='explicit_named_funding_segment_before_eliminations' if col<5 else 'validation_only_not_published_as_fund_position',
                        section=section,reported_label=label,metric=re.sub(r'[^a-z0-9]+','_',label.lower()).strip('_'),
                        amount_usd=amount,reported_text=printed,reported_as_dash=dash,printed_unit_usd=1000,
                        basis='IPSAS_accrual',is_comparative=col==7,
                        document_symbol=source['document_symbol'],source_url=source['url'],source_sha256=source['sha256'],
                        pdf_page=page,source_page_url=xb.pdf_page_url(source['url'],page),table_title=spec.title,
                        source_row=row['physical_row_index'],source_y=row['cell_y'][col],source_column_header=f'{name} — {period}'))
        selected=[r for r in facts if r['report_year']==year and r['period_year']==year]
        def val(obj,label):
            matched=[r for r in selected if r['object_id']==obj and r['reported_label'].lower()==label]
            if len(matched)!=1:raise ValueError(f'Ambiguous fund-position control {year} {obj} {label}: {len(matched)}')
            return Decimal(matched[0]['amount_usd'])
        def check(name,difference,**context):
            difference=Decimal(difference)
            if abs(difference)>2000:raise ValueError(f'Fund position control failed {year} {name}: {difference} {context}')
            checks.append(dict(report_year=year,check=name,difference_usd=str(difference),tolerance_usd=2000,passed=True,**context))
        for _,code in HABITAT_GROUPS[:5]:
            obj='UN-HABITAT:segment:'+code
            check('fund_assets_less_liabilities',val(obj,'total assets')-val(obj,'total liabilities')-val(obj,'total net assets'),object_id=obj)
            check('fund_current_plus_noncurrent_assets',val(obj,'total current assets')+val(obj,'total non-current assets')-val(obj,'total assets'),object_id=obj)
            check('fund_current_plus_noncurrent_liabilities',val(obj,'total current liabilities')+val(obj,'total non-current liabilities')-val(obj,'total liabilities'),object_id=obj)
            check('fund_surplus_plus_reserves',val(obj,'accumulated surplus/(deficit)')+val(obj,'reserves')-val(obj,'total net assets'),object_id=obj)
        grouped=defaultdict(list)
        for row in selected:grouped[(row['section'],row['reported_label'])].append(row)
        for (section,label),rs in grouped.items():
            total=[r for r in rs if r['object_kind']=='validation_entity_total']
            components=[r for r in rs if r['object_kind'] in ['funding_segment','adjustment']]
            if len(total)!=1 or len(components)!=6:raise ValueError(f'Incomplete fund-column row {year} {label}')
            check('fund_columns_plus_elimination_to_reported_total',sum(Decimal(r['amount_usd']) for r in components)-Decimal(total[0]['amount_usd']),section=section,label=label)
    write_csv(out/'habitat-position-facts.csv',facts)
    (out/'habitat-position-tables.jsonl').write_text('\n'.join(json.dumps(t,ensure_ascii=False) for t in tables)+'\n')
    quality=dict(status='passed',observations=len(facts),fund_groups_per_year=5,checks=checks,
        publication_scope='Only explicit Habitat funding-segment columns; validation entity totals never returned',
        unavailable={'UNODC':'Drug/crime pillar positions include RB; no explicit GP/SP or pure-XB fund position schedule verified.',
                     'ITC':'Note14 reports fund operating reserves only, not complete fund positions; retained separately as limited research facts.',
                     'UNEP':'Existing source-specific account/group closing net assets remain in the main extraction; not replaced by whole-entity statements.'})
    (out/'quality-profile.json').write_text(json.dumps(quality,indent=2))
    return facts,quality


def extract_itc_reserves(root=ROOT):
    """Retain fund-specific operating reserves as research, not full positions."""
    root=Path(root);out=root/OUTPUT_DIR;out.mkdir(exist_ok=True)
    manifest=json.loads((root/'source-manifest.json').read_text())
    facts=[];checks=[]
    for year,page_number in [(2023,82),(2024,71)]:
        source=next(s for s in manifest if s['reporting_entity']=='ITC' and s['reporting_year']==year and s['source_role']=='audited_accounts')
        path=Path(source['local_path'])
        if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:
            raise ValueError(f'ITC source checksum mismatch: {path}')
        doc=pymupdf.open(path);pdf=doc[page_number-1]
        text=' '.join(pdf.get_text().split())
        if 'Thousands of United States dollars' not in text or 'Programme support fund' not in text:
            raise ValueError(f'Unverified reserve table: {year}')
        n=3 if year==2023 else 4
        closing={}
        for line in xb.physical_lines(pdf):
            label=xb.text(line)
            match=re.match(r'Closing balance as at 31 December (20\d{2})',label)
            if not match:continue
            period=int(match.group(1))
            if period not in [year-1,year]:continue
            groups=xb.numeric_groups(line)[-n:]
            if len(groups)!=n:raise ValueError(f'ITC reserve numeric columns: {year} {period}')
            values=[Decimal(xb.amount(xb.text(group))[0]) for group in groups]
            closing[period]=values
            if sum(values[:-1])!=values[-1]:raise ValueError(f'ITC reserve row total mismatch {year} {period}')
            checks.append(dict(report_year=year,period_year=period,check='fund_reserves_plus_unallocated_fair_value_to_printed_total',difference_usd=0,passed=True))
            columns=[('Trust fund','ITC:fund_family:ITF'),('Programme support fund','ITC:fund_family:PSC')]
            if year==2024:columns.append(('Fair value reserve (unallocated)','ITC:validation:FAIR'))
            columns.append(('All reserves (validation only)','ITC:validation:TOTAL'))
            for col,(name,obj) in enumerate(columns):
                facts.append(dict(source_id=source['source_id'],reporting_entity='ITC',report_year=year,period_year=period,
                    object_id=obj,object_kind='fund_family_reserve_only' if col<2 else 'validation_only',
                    metric='operating_reserve' if col<2 else 'fair_value_reserve' if name.startswith('Fair') else 'total_reserves',
                    scope='Limited operating reserve component only; not cash, available resources or total net assets',
                    amount_usd=str(values[col]),reported_text=xb.text(groups[col]),printed_unit_usd=1000,
                    is_comparative=period!=year,basis='IPSAS_accrual',section='Note14: operating reserves',
                    reported_label=f'Closing balance as at 31 December {period}',
                    document_symbol=source['document_symbol'],source_url=source['url'],source_sha256=source['sha256'],
                    pdf_page=page_number,source_page_url=xb.pdf_page_url(source['url'],page_number),
                    table_title='Note14: movements in operating reserves',source_column_header=name,
                    source_y=line[0][1]))
        if set(closing)!={year-1,year}:raise ValueError(f'Missing reserve close year {year}')
    write_csv(out/'itc-operating-reserve-facts.csv',facts)
    (out/'itc-reserve-quality.json').write_text(json.dumps(dict(status='passed_limited_metric_only',observations=len(facts),checks=checks,
        publish_as_financial_position=False,
        note='Exact Trust Fund/Programme Support Fund operating reserves are known, but full fund cash/assets/liabilities/netassets are not provided. Fair-value reserve remains unallocated; no invented fund assignment.'),indent=2))
    return facts


def fund_positions(entity,year,stage2):
    """Return financialPosition shapes keyed by explicit fund-group object ID."""
    if entity!='UN-HABITAT' or year not in HABITAT_PAGES:return {}
    folder=Path(stage2).parent/OUTPUT_DIR
    quality=json.loads((folder/'quality-profile.json').read_text())
    if quality['status']!='passed':raise ValueError('Fund-position extraction has not passed')
    with (folder/'habitat-position-facts.csv').open() as handle:
        rows=[r for r in csv.DictReader(handle) if int(r['report_year'])==year and int(r['period_year'])==year and r['object_kind']=='funding_segment']
    definitions=[('cash','Cash and cash equivalents',{'cash and cash equivalents'}),
        ('investments','Investments',{'investments'}),
        ('contributionsReceivable','Voluntary contributions receivable',{'voluntary contributions receivable'}),
        ('otherReceivables','Other receivables',{'other receivables'}),
        ('advanceTransfers','Advance transfers',{'advance transfers'}),
        ('advanceReceipts','Advance receipts and deferred revenue',{'funds received in advance and deferred revenue'}),
        ('conditionalLiabilities','Liabilities for conditional arrangements',{'liabilities for conditional arrangements'}),
        ('totalAssets','Total assets',{'total assets'}),('totalLiabilities','Total liabilities',{'total liabilities'}),
        ('netAssets','Net assets',{'total net assets'})]
    result={}
    for name,code in HABITAT_GROUPS[:5]:
        object_id='UN-HABITAT:segment:'+code
        own=[r for r in rows if r['object_id']==object_id]
        metrics=[]
        for key,label,labels in definitions:
            matched=[r for r in own if r['reported_label'].lower() in labels]
            if not matched:continue
            metrics.append(dict(key=key,label=label,amount=int(sum(Decimal(r['amount_usd']) for r in matched)),fundsCovered=1,
                **({'components':[dict(label=r['section']+' · '+r['reported_label'],amount=int(Decimal(r['amount_usd']))) for r in matched]} if len(matched)>1 else {}),
                supportingSources=[reference(r) for r in matched]))
        if not metrics:raise ValueError(f'Missing explicit fund position: {object_id} {year}')
        result[object_id]=dict(asOf=f'{year}-12-31',fundCount=1,
            scopeNote=f'Reported {name} funding-segment balances before intersegment eliminations. This is a funding group, not an individual fund-account inventory.',metrics=metrics)
    return result


if __name__=='__main__':
    facts,quality=extract()
    reserves=extract_itc_reserves()
    print(f'Extracted {len(facts)} Habitat position observations; {len(quality["checks"])} checks passed. ITC: {len(reserves)} limited reserve observations retained for research only.')
