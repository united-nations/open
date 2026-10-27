"""Source-attributed XB staging for separately reported Secretariat entities.

This adapter leaves Volume I and frontend exports untouched. It preserves the
source's account/segment/window grain and financial basis rather than deciding
which records are legally trust funds. No money is allocated to invented funds.
"""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
from statistics import median
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import pandas as pd
import pymupdf

from trust_fund_frontend_exports import canonical_counterparty
from utils import clean_donor_name

ROOT = Path('data/trust-fund-source-candidates')
NUM_TOKEN = re.compile(r'^[\d,.()]+$|^[–−-]$')
DASHES = {'-', '–', '−', '—'}
FUND_CODE = re.compile(r'^[A-Z]{3}$')


def pdf_page_url(url: str, page: int) -> str:
    """Match the frontend's physical-PDF-page links, preserving query/zoom."""
    if isinstance(page, bool) or not isinstance(page, int) or page < 1:
        raise ValueError('A physical PDF page must be a positive integer')
    parts = urlsplit(url)
    fragment = [(key, value) for key, value in parse_qsl(parts.fragment)
                if key != 'page']
    fragment.append(('page', str(page)))
    return urlunsplit(parts._replace(fragment=urlencode(fragment)))


def amount(text: str, unit: int = 1000, *, dot_grouping: bool = False) -> tuple[str, bool]:
    """Return exact USD, retaining a printed dash separately from numeric zero."""
    value = text.strip()
    if value in DASHES:
        return '0', True
    value = value.replace(' ', '').replace('\u00a0', '').replace(',', '')
    if dot_grouping:
        value = value.replace('.', '')
    if value.startswith('(') and value.endswith(')'):
        value = '-' + value[1:-1]
    value = value.replace('−', '-')
    parsed = Decimal(value) * unit
    if not parsed.is_finite():
        raise ValueError(f'Non-finite source amount: {text}')
    return format(parsed, 'f'), False


def text(words: list[tuple]) -> str:
    return ' '.join(w[4] for w in sorted(words, key=lambda w: w[0])).strip()


def physical_lines(page: pymupdf.Page) -> list[list[tuple]]:
    lines: list[list[tuple]] = []
    words = [w for w in page.get_text('words') if w[0] > 30 and w[2] < page.rect.width - 12
             and not re.fullmatch(r'\d+/\d+|\d{2}-\d{4,6}', w[4])]
    for word in sorted(words, key=lambda w: w[1]):
        line = next((r for r in reversed(lines[-4:]) if abs(r[0][1] - word[1]) < 2), None)
        if line is None:
            lines.append([word])
        else:
            line.append(word)
    return [sorted(row, key=lambda w: w[0]) for row in sorted(lines, key=lambda r: r[0][1])]


def numeric_groups(row: list[tuple]) -> list[list[tuple]]:
    groups: list[list[tuple]] = []
    for word in row:
        if word[0] < 200 or not NUM_TOKEN.fullmatch(word[4]):
            continue
        if groups and word[0] - groups[-1][-1][2] < 8:
            groups[-1].append(word)
        else:
            groups.append([word])
    return groups


@dataclass
class Table:
    page: int
    title: str
    kind: str
    columns: list[dict[str, Any]]
    start_y: float
    end_y: float | None = None
    label_right: float | None = None
    dot_grouping: bool = False
    unit: int = 1000
    sectioned: bool = False
    block_labels: bool = False
    annex: str | None = None


def field(name: str, obj: str, *, year: int | None = None, kind: str = 'segment', rb: bool = False) -> dict:
    return dict(name=name, object_code=obj, period_year=year, object_kind=kind, regular_budget=rb)


def specifications(source: dict) -> list[Table]:
    entity, year = source['reporting_entity'], source['reporting_year']
    role = source['source_role']
    if role=='audited_accounts' and year not in [2023,2024]:
        raise ValueError(f'Unreviewed audited layout: {source["source_id"]}')
    tables: list[Table] = []
    if role == 'audited_accounts' and entity == 'UNEP':
        segs = [('Environment Fund', 'ENV'), ('Regular budget', 'RB'), ('Other support to programme of work', 'POW'),
                ('Conventions and protocols', 'CONV'), ('Multilateral Fund', 'MLF'), ('Programme support', 'PSC'),
                ('End-of-service and post-retirement benefits', 'BEN'), ('Intersegment eliminations', 'ELIM'),
                ('All funds', 'TOTAL'), ('All funds comparative', 'TOTAL')]
        tables.append(Table(92 if year == 2023 else 87, 'Financial performance by segment', 'segment_performance',
            [field(n, c, year=year-1 if i == 9 else year, kind='adjustment' if c == 'ELIM' else 'entity_total' if c == 'TOTAL' else 'segment', rb=c == 'RB') for i,(n,c) in enumerate(segs)],
            140 if year == 2024 else 150, sectioned=True))
        annexes = [(130,130,'I'),(131,135,'II'),(136,139,'III'),(140,140,'IV'),(141,141,'V'),(142,142,'VI')] if year==2023 else [(126,126,'I'),(127,133,'II'),(134,139,'III'),(140,140,'IV'),(141,141,'V'),(142,142,'VI')]
        measures = ['opening_accumulated_surplus','opening_reserve','opening_net_assets','surplus_movements','reserve_movements','revenue','expenses','closing_net_assets']
        for first,last,annex in annexes:
            for page in range(first,last+1):
                tables.append(Table(page, f'Annex {annex}: fund accounts', 'fund_accounts', [dict(name=m) for m in measures], 0, annex=annex))
    elif role == 'audited_accounts' and entity == 'UN-HABITAT':
        segs=[('Foundation non-earmarked','FNDN'),('Regular budget','RB'),('Foundation earmarked','FNDE'),('Technical cooperation','TECH'),('Programme support','PSC'),('End-of-service and post-retirement benefits','BEN'),('Intersegment eliminations','ELIM'),('All funds','TOTAL'),('All funds comparative','TOTAL')]
        tables.append(Table(102 if year==2023 else 83,'Financial performance by segment','segment_performance',
            [field(n,c,year=year-1 if i==8 else year,kind='adjustment' if c=='ELIM' else 'entity_total' if c=='TOTAL' else 'segment',rb=c=='RB') for i,(n,c) in enumerate(segs)],140 if year==2024 else 155,sectioned=True))
    elif role == 'audited_accounts' and entity == 'UNODC':
        cols=[field(n,c,year=y,kind='entity_total' if c=='TOTAL' else 'pillar') for y in [year,year-1] for n,c in [('Drug programme','DRUG'),('Crime programme (includes UNICRI)','CRIME'),('All funds','TOTAL')]]
        tables.append(Table(80 if year==2023 else 66,'Financial performance by pillar (includes RB)','pillar_performance',cols,155,sectioned=True))
        tables.append(Table(98 if year==2023 else 82,'Note 18: regular budget expenditure','rb_expenditure',
            [field('Regular budget','RB',year=y,rb=True) for y in [year,year-1]],
            550 if year==2023 else 145,675 if year==2023 else 265,sectioned=True))
    elif role == 'audited_accounts' and entity == 'ITC':
        # Statement II is discovered by its actual heading, never from a contents page.
        return []
    elif role == 'contributor_schedule':
        cols=[field(n,c,year=y,kind='window' if c!='TOTAL' else 'fund_family') for y in [2022,2023] for n,c in [('Window I','WI'),('Window II','WII'),('ITC Trust Fund','ITF')]]
        for page in [51,52,53]:
            tables.append(Table(page,'Appendix IV: voluntary contributions to ITC Trust Fund','contributor_received',cols,0,dot_grouping=True,block_labels=True))
    elif role == 'interim_financial_and_contributor_report':
        years=list(range(2020,year+1))
        cols=[field('Foundation non-earmarked','FNDN',year=y) for y in years]
        if year==2023:cols.append(field('Comparative-column total','FNDN',kind='cross_year_total'))
        for page in ([6] if year==2023 else [7,8]):
            tables.append(Table(page,'Annex II: annual Foundation non-earmarked contributions','contributor_interim',cols,0,unit=1,block_labels=True,annex='II'))
        cols=[field(n,c,year=year) for n,c in [('Foundation earmarked','FNDE'),('Technical cooperation','TECH'),('Earmarked total','EARMARKED')]]
        for page in ([7,8] if year==2023 else [9,10]):
            tables.append(Table(page,'Annex III: earmarked contributions (includes transfers)','contributor_interim',cols,0,label_right=245,block_labels=True,annex='III'))
    return tables


def table_rows(page: pymupdf.Page, spec: Table) -> tuple[list[dict], dict]:
    lines=physical_lines(page)
    n=len(spec.columns)
    start=spec.start_y
    if spec.kind=='fund_accounts':
        headers=[w for w in page.get_text('words') if w[4] in ['Expense','Expenses'] and w[0]>200]
        if not headers:raise ValueError(f'No expense header on fund page {spec.page}')
        start=max(w[3] for w in headers)+2
    elif spec.block_labels:
        headers=[w for w in page.get_text('words') if w[4] in ['FUNDERS','Contributor']]
        if headers:start=max(w[3] for w in headers)+2
    end=spec.end_y or (page.rect.height-45)
    eligible=[r for r in lines if start<=r[0][1]<=end]
    candidates=[numeric_groups(r)[-n:] for r in eligible if len(numeric_groups(r))>=n]
    candidates=[g for g in candidates if all(any(re.search(r'\d',w[4]) for w in x) or text(x) in DASHES for x in g)]
    if not candidates:raise ValueError(f'No numeric anchors on page {spec.page}: {spec.title}')
    rights=[median(g[i][-1][2] for g in candidates) for i in range(n)]
    # Amount cells end at right-aligned source anchors; this also preserves split thousands.
    left=rights[0]-(rights[1]-rights[0])+3
    bounds=[left]+[r+2.1 for r in rights]
    label_right=spec.label_right or left-2
    raw=[]
    for physical_index,row in enumerate(eligible):
        cells=[]
        for a,b in zip(bounds,bounds[1:]):cells.append(text([w for w in row if a<=w[0] and w[2]<=b]))
        raw.append(dict(physical_row_index=physical_index,y=round(row[0][1],3),label=text([w for w in row if w[2]<label_right]),cells=cells,
                        words=[dict(text=w[4],bbox=[round(v,3) for v in w[:4]],block=w[5],line=w[6]) for w in row]))
    numeric=[]
    for r in raw:
        if sum(bool(c) for c in r['cells']) < n-(1 if spec.kind=='fund_accounts' else 0):
            continue
        cells=list(r['cells']); cell_y=[r['y']]*n; cell_row=[r['physical_row_index']]*n
        if spec.kind=='fund_accounts' and '' in cells:
            missing=cells.index('')
            earlier=[q for q in raw if q['y']<r['y'] and q['cells'][missing]
                     and sum(bool(c) for c in q['cells'])==1]
            if earlier and r['y']-earlier[-1]['y']<20:
                cells[missing]=earlier[-1]['cells'][missing];cell_y[missing]=earlier[-1]['y'];cell_row[missing]=earlier[-1]['physical_row_index']
        try:
            parsed=[amount(c,spec.unit,dot_grouping=spec.dot_grouping) if c else (None,False) for c in cells]
        except (InvalidOperation,ValueError):continue
        numeric.append(dict(r,cells=cells,parsed=parsed,cell_y=cell_y,cell_row=cell_row))
    # PDF blocks in the donor documents retain wrapped names as complete source rows.
    if spec.block_labels:
        words=page.get_text('words')
        for i,r in enumerate(numeric):
            # Word emits a whole table as one block in some Habitat vintages.
            # Use the halfway points between vertically centred amount rows;
            # these also capture names wrapped across several physical lines.
            low=(numeric[i-1]['y']+r['y'])/2 if i else start
            high=(r['y']+numeric[i+1]['y'])/2 if i+1<len(numeric) else r['y']+12
            labelwords=[w for w in words if w[2]<label_right and w[0]>35 and low<=w[1]<high and not w[4].startswith('HSP/EB.')]
            labelwords=sorted(labelwords,key=lambda w:(round(w[1]/2)*2,w[0]))
            r['label']=' '.join(w[4] for w in labelwords).strip()
    elif spec.kind=='fund_accounts':
        bold_y=[span['bbox'][1] for block in page.get_text('dict')['blocks'] for line in block.get('lines',[])
                for span in line['spans'] if span['flags']&16 and span['bbox'][0]<label_right]
        codes=[(r['y'],r['label'].split()[0]) for r in raw if r['label'] and FUND_CODE.fullmatch(r['label'].split()[0])]
        for r in numeric:
            nearby=[(y,c) for y,c in codes if y<=r['y']+2]
            # A numeric row can belong to a code starting on an earlier wrapped line.
            if nearby:
                y,code=nearby[-1]
                following=[q for q in numeric if y<=q['y']<r['y']-1]
                if not following:
                    next_code=min((yy for yy,_ in codes if yy>y+2),default=end)
                    next_number=min((q['y'] for q in numeric if q['y']>r['y']+2),default=end)
                    labelrows=[q for q in raw if y-1<=q['y']<min(next_code,next_number)-1 and q['label']
                               and (abs(q['y']-y)<2 or not any(abs(q['y']-b)<2 for b in bold_y))]
                    r['label']=' '.join(q['label'] for q in labelrows)
                    r['fund_code']=code
            if not r.get('fund_code'):
                previous=max((q['y'] for q in numeric if q['y']<r['y']-1),default=start-1)
                headings=[q['label'] for q in raw if previous+1<q['y']<=r['y']+1 and q['label']
                          and any(abs(q['y']-b)<2 for b in bold_y)]
                if headings:r['label']=' '.join(headings)
    else:
        # Wrapped financial line labels often put the final phrase on the numeric baseline.
        for r in numeric:
            previous=max((q['y'] for q in numeric if q['y']<r['y']-1),default=start-1)
            pending=[q['label'] for q in raw if previous+1<q['y']<r['y']+1 and q['label']]
            r['label']=' '.join(pending)
    return numeric,dict(page=spec.page,title=spec.title,kind=spec.kind,unit=spec.unit,dot_grouping=spec.dot_grouping,
                        column_bounds=bounds,columns=spec.columns,rows=raw)


def metric(label: str) -> str:
    v=label.casefold().strip()
    v=re.sub(r'^(?:segment )?(?:revenue|expenses|expense|expenditure)\s+', '', v)
    if 'total' in v and ('expense' in v or 'expenditure' in v):return 'expenses'
    if 'total' in v and ('revenue' in v or 'income' in v):return 'revenue'
    if 'surplus/' in v or 'surplus /' in v:return 'surplus_deficit'
    return re.sub(r'[^a-z0-9]+','_',v).strip('_')


def normalized_name(value: str) -> str:
    # Superscript footnote b is emitted as part of Japan's name in HSP/EB.2025/2.
    if value=='Japanb':value='Japan'
    return canonical_counterparty(clean_donor_name(value))


def process_table(source: dict, spec: Table, rows: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    facts=[]; contributors=[]; objects=[]
    entity=source['reporting_entity'];year=source['reporting_year'];sid=source['source_id']
    basis='source_defined_funding_received' if spec.kind=='contributor_received' else 'interim_contribution_status' if spec.kind=='contributor_interim' else 'IPSAS_accrual'
    section=''
    donor_groups=('Governments and national development agencies','International organizations including','Academia, training and research','Business support organizations')
    for ordinal,r in enumerate(rows):
        label=r['label']
        if not label:raise ValueError(f'Unlabelled amount row: {sid} p{spec.page} y{r["y"]}')
        if spec.kind=='fund_accounts':
            code=r.get('fund_code')
            kind='fund_account' if code else 'adjustment' if 'elimination' in label.lower() else 'reported_rollup'
            obj=f'{entity}:account:{code}' if code else f'{sid}:annex:{spec.annex}:row:{spec.page}:{ordinal}'
            name=re.sub(r'^'+re.escape(code)+r'\s*','',label) if code else label
            objects.append(dict(object_id=obj,entity=entity,original_code=code or '',object_kind=kind,name=name,parent_id=f'{entity}:annex:{spec.annex}',classification_status='scope_not_decided'))
        for col,((usd,dash),reported) in enumerate(zip(r['parsed'],r['cells'])):
            c=spec.columns[col]
            if spec.kind=='fund_accounts':
                name_metric=c['name'];period=year
            else:
                obj=f'{entity}:{c["object_kind"]}:{c["object_code"]}'
                kind=c['object_kind'];period=c['period_year'] or year;name_metric=metric(label)
                if spec.kind.startswith('contributor'):
                    name_metric='xb_funding_received' if spec.kind=='contributor_received' else 'reported_contribution_status'
                objects.append(dict(object_id=obj,entity=entity,original_code=c['object_code'],object_kind=kind,name=c['name'],parent_id=entity,classification_status='scope_not_decided'))
            base=dict(source_id=sid,reporting_entity=entity,report_year=year,period_year=period,
                object_id=obj,object_kind=kind,metric=name_metric,amount_usd=usd,currency='USD',basis=basis,
                printed_unit_usd=spec.unit,reported_text=reported,reported_as_dash=dash,reported_as_blank=not reported,reported_label=label,
                pdf_page=spec.page,table_title=spec.title,source_row=ordinal,source_y=r['cell_y'][col],source_column=c['name'],
                source_column_index=col,source_column_header=f'{c["name"]} — {period}',
                source_physical_row=r['cell_row'][col],
                document_symbol=source['document_symbol'],source_url=source['url'],source_sha256=source['sha256'],
                table_id=f'{sid}:p{spec.page}:{spec.kind}:{spec.annex or ""}',
                is_aggregate_column=c.get('object_code') in ['TOTAL','EARMARKED','ITF'],
                is_comparative=period!=year,scope_status='unclassified_xb_source',
                includes_regular_budget=kind in ['pillar','entity_total'] or c.get('regular_budget',False))
            if spec.kind.startswith('contributor'):
                is_total=label.casefold().startswith('total')
                is_group=any(label.startswith(g) for g in donor_groups)
                non_donor=label.casefold()=='revolving funds'
                contributors.append(dict(base,counterparty_reported=label,counterparty=normalized_name(label),
                    row_kind='reported_total' if is_total else 'group_subtotal' if is_group else 'non_donor_category' if non_donor else 'contributor',
                    flow_type='unclassified_contribution_or_transfer' if spec.annex=='III' else 'source_defined_funding_received' if spec.kind=='contributor_received' else 'voluntary_contribution_status',
                    is_grouped_counterparty=label.lower().startswith(('united nations entities','other contributors')),
                    counterparty_quality='source_label_requires_review' if label=='Strategy and Saudi Arabia' else 'as_reported',
                    is_cross_year_total=c.get('object_kind')=='cross_year_total'))
            else:
                if spec.sectioned:
                    headings=[q['label'] for q in getattr(spec,'raw_rows',[]) if q['y']<r['y'] and q['label'].casefold() in ['revenue','segment revenue','expenses','expense','segment expense','expenditure']]
                    if headings:section=headings[-1]
                facts.append(dict(base,statement_section=section,regular_budget=c.get('regular_budget',False),annex=spec.annex or ''))
    return facts,contributors,objects


def inspect_manifest(manifest: list[dict]) -> None:
    ids=set()
    for s in manifest:
        if s['source_id'] in ids:raise ValueError('Duplicate source id')
        ids.add(s['source_id']);p=Path(s['local_path'])
        if hashlib.sha256(p.read_bytes()).hexdigest()!=s['sha256']:raise ValueError(f'Source checksum changed: {p}')
        with pymupdf.open(p) as d:
            if len(d)!=s['pdf_pages'] or len(d)<2:raise ValueError(f'Incomplete PDF {p}')
            if s['document_symbol'].startswith('A/'):
                expected=str(s['reporting_year']-1944)
                if s['document_symbol'].split('/')[1]!=expected:raise ValueError(f'Wrong session in {s["document_symbol"]}')
                url_session=re.search(r'/A_(\d+)_',s['url'])
                if url_session and url_session[1]!=expected:raise ValueError(f'Wrong session in source URL: {s["url"]}')
                title=' '.join(d[0].get_text().split())
                if s['document_symbol'].replace(' ','') not in title.replace(' ',''):
                    raise ValueError(f'Document symbol absent from cover: {p}')


def extract(root: Path = ROOT) -> dict:
    manifest=json.loads((root/'source-manifest.json').read_text());inspect_manifest(manifest)
    literal=[];facts=[];contributors=[];objects=[]
    for source in manifest:
        with pymupdf.open(source['local_path']) as doc:
            facts.extend(extract_prose(source,doc))
            specs=specifications(source)
            if source['source_role']=='audited_accounts' and source['reporting_entity']=='ITC':
                for i,p in enumerate(doc):
                    t=' '.join(p.get_text().split())
                    if 'II. Statement of financial performance' in t and 'Total expenses' in t:
                        specs.append(Table(i+1,'Statement II: financial performance','entity_performance',
                            [field('All funds','TOTAL',year=y,kind='entity_total') for y in [source['reporting_year'],source['reporting_year']-1]],0,sectioned=True))
            for spec in specs:
                rows,raw=table_rows(doc[spec.page-1],spec);raw['source_id']=source['source_id'];literal.append(raw)
                spec.raw_rows=raw['rows']
                f,c,o=process_table(source,spec,rows);facts.extend(f);contributors.extend(c);objects.extend(o)
    for row in facts+contributors:
        row['source_page_url']=pdf_page_url(row['source_url'],row['pdf_page'])
    report=validate(facts,contributors,manifest)
    controls=arwo_controls()
    totals=derived_xb(facts)
    report['arwo_control_observations']=len(controls)
    report['derived_non_rb_observations']=len(totals)
    # Publish canonical outputs only after blocking checks pass.
    (root/'stage1').mkdir(exist_ok=True);(root/'stage2').mkdir(exist_ok=True)
    (root/'stage1/tables.jsonl').write_text(''.join(json.dumps(t,ensure_ascii=False)+'\n' for t in literal))
    for name,records in [('statement-facts',facts),('contributor-observations',contributors),
                         ('arwo-controls',controls),('derived-xb-controls',totals)]:
        pd.DataFrame(records).to_csv(root/'stage2'/f'{name}.csv',index=False)
    unique={o['object_id']:o for o in objects}
    for entity in sorted({s['reporting_entity'] for s in manifest}):
        unique[entity]=dict(object_id=entity,entity=entity,original_code=entity,object_kind='entity',name=entity,parent_id='',classification_status='scope_not_decided')
    for obj in list(unique.values()):
        if obj['object_kind']=='window':obj['parent_id']='ITC:fund_family:ITF'
        parent=obj['parent_id']
        if parent and parent not in unique:
            unique[parent]=dict(object_id=parent,entity=obj['entity'],original_code=parent.split(':')[-1],object_kind='source_group',name='Annex '+parent.split(':')[-1],parent_id=obj['entity'],classification_status='scope_not_decided')
    pd.DataFrame(unique.values()).to_csv(root/'stage2/objects.csv',index=False)
    pd.DataFrame([dict(source_id=s['source_id'],reporting_entity=s['reporting_entity'],
        reporting_year=s['reporting_year'],document_symbol=s['document_symbol'],url=s['url'],
        sha256=s['sha256'],extraction_status='selected_tables_extracted' if any(r['source_id']==s['source_id'] for r in facts+contributors) else 'no_supported_table')
        for s in manifest]).to_csv(root/'stage2/source-coverage.csv',index=False)
    (root/'quality-profile.json').write_text(json.dumps(report,indent=2)+'\n')
    review_columns=['source_id','reporting_entity','counterparty_reported','counterparty',
        'counterparty_quality','pdf_page','table_title','source_row','document_symbol','source_url','source_page_url','source_sha256']
    pd.DataFrame([r for r in contributors if r['counterparty_quality']!='as_reported'],columns=review_columns).drop_duplicates(
        ['source_id','pdf_page','source_row']).to_csv(root/'stage2/counterparty-review.csv',index=False)
    return report


def extract_prose(source: dict, doc: pymupdf.Document) -> list[dict]:
    """ITC labels its programme-delivery XB amount in prose, not Statement II."""
    if source['reporting_entity']!='ITC' or source['source_role'] not in ['audited_accounts','financial_report']:
        return []
    result=[]
    for i,page in enumerate(doc):
        reported=' '.join(page.get_text(sort=True).split())
        match=re.search(r'gross extrabudgetary expenditures of \$([0-9.]+) million',reported,re.I)
        if not match:continue
        result.append(dict(source_id=source['source_id'],reporting_entity='ITC',report_year=source['reporting_year'],
            period_year=source['reporting_year'],object_id='ITC:entity:XB',object_kind='entity_aggregate',
            metric='gross_xb_expenditure',amount_usd=amount(match[1],1000000)[0],currency='USD',
            basis='reported_programme_delivery',printed_unit_usd=1000000,reported_text=match[1],
            reported_as_dash=False,reported_as_blank=False,reported_label=match.group(),pdf_page=i+1,
            table_title='Chapter IV: financial overview',table_id=f'{source["source_id"]}:p{i+1}:prose',
            source_row=0,source_y='',source_column='Gross extrabudgetary expenditure',source_column_index=0,
            document_symbol=source['document_symbol'],source_url=source['url'],source_sha256=source['sha256'],
            is_comparative=False,scope_status='unclassified_xb_source',includes_regular_budget=False,
            statement_section='Expenses',regular_budget=False,annex=''))
    return result


def arwo_controls() -> list[dict]:
    """Preserve the existing 2019–2025 XB observations as separate controls."""
    rows=[]
    for path in [Path('data/un-secretariat-expenses.csv')]+[Path(f'data/un-secretariat-expenses-{y}.csv') for y in [2024,2025]]:
        frame=pd.read_csv(path,dtype=str).fillna('');digest=hashlib.sha256(path.read_bytes()).hexdigest()
        for ordinal,r in enumerate(frame.to_dict('records')):
            if r['ENTITY'] not in ['UNEP','UNODC','UN-HABITAT','ITC'] or r['SOURCE_TYPE']!='Voluntary':continue
            rows.append(dict(source_id=path.stem,reporting_entity=r['ENTITY'],period_year=int(r['YEAR']),
                financial_year=r['FINANCIAL_YEAR'],metric='arwo_xb_expenses',amount_usd=format(Decimal(r['AMOUNT']),'f'),
                currency='USD',basis='ARWO_source_defined',source_reference=r['REFERENCE'],source_note=r['NOTE'],
                source_file=str(path),source_row=ordinal+2,source_sha256=digest,
                scope_status='unclassified_xb_source',not_independent_audit_verification=True))
    return rows


def derived_xb(facts: list[dict]) -> list[dict]:
    """Produce explicit non-RB controls without choosing a trust-fund scope."""
    derived=[]
    groups={ (f['source_id'],f['period_year']) for f in facts if f['reporting_entity']!='ITC' }
    for sid,year in sorted(groups):
        group=[f for f in facts if f['source_id']==sid and f['period_year']==year]
        entity=group[0]['reporting_entity']
        totals=[f for f in group if f['object_kind']=='entity_total' and f['metric']=='expenses']
        rb=[f for f in group if f.get('regular_budget') and f['metric']=='expenses']
        if not totals or not rb:continue
        if len(totals)!=1 or len(rb)!=1:raise ValueError(f'Ambiguous non-RB control: {sid} {year}')
        total,budget=totals[0],rb[0]
        derived.append(dict(source_id=sid,reporting_entity=entity,period_year=year,
            metric='audited_expenses_excluding_regular_budget',amount_usd=str(Decimal(total['amount_usd'])-Decimal(budget['amount_usd'])),
            basis='IPSAS_accrual_derived',currency='USD',scope_status='XB_control_not_trust_fund_scope',
            is_comparative=year!=total['report_year'],formula='total expenses - regular-budget expenses',
            supporting_sources=json.dumps([dict(pdf_page=r['pdf_page'],table_title=r['table_title'],row=r['reported_label'],column=r['source_column'],
                reported_text=r['reported_text'],amount_usd=r['amount_usd'],document_symbol=r['document_symbol'],url=r['source_url'],
                page_url=pdf_page_url(r['source_url'],r['pdf_page'])) for r in [total,budget]])))
    return derived


def validate(facts: list[dict], contributors: list[dict], manifest: list[dict]) -> dict:
    checks=[];warnings=[]
    def check(name: str, difference: Decimal, tolerance: Decimal=Decimal(0), **context: Any) -> None:
        ok=abs(difference)<=tolerance
        checks.append(dict(check=name,difference_usd=str(difference),tolerance_usd=str(tolerance),passed=ok,**context))
        if not ok:raise ValueError(f'{name}: {difference}; {context}')
    keys=[(r['source_id'],r['table_id'],r['source_row'],r['source_column_index']) for r in facts+contributors]
    if len(keys)!=len(set(keys)):raise ValueError('Duplicate source fact identities')
    f=pd.DataFrame(facts)
    for (sid,obj),group in f[f.object_kind.eq('fund_account')].groupby(['source_id','object_id']):
        values={r['metric']:Decimal(r['amount_usd']) for r in group.to_dict('records') if r['amount_usd'] is not None}
        required=['opening_net_assets','surplus_movements','reserve_movements','revenue','expenses','closing_net_assets']
        if all(k in values for k in required):
            diff=values['opening_net_assets']+values['surplus_movements']+values['reserve_movements']+values['revenue']-values['expenses']-values['closing_net_assets']
            check('fund_net_asset_equation',diff,Decimal(3000),source_id=sid,object_id=obj)
        else:
            warnings.append(dict(type='source_blank_cell',source_id=sid,object_id=obj,missing=[k for k in required if k not in values],policy='Blank remains null; no balancing value is invented.'))
    # Each entire annex, including page continuations, controls the fund extraction.
    for (sid,annex),group in f[f.object_kind.eq('fund_account')].groupby(['source_id','annex']):
        for metric_name in ['revenue','expenses']:
            actual=sum(Decimal(r['amount_usd']) for r in group.to_dict('records') if r['metric']==metric_name)
            rollups=f[(f.source_id==sid)&(f.annex==annex)&(f.object_kind=='reported_rollup')&(f.metric==metric_name)]
            if rollups.empty:raise ValueError(f'Missing annex control: {sid} {annex}')
            control=Decimal(rollups.iloc[-1].amount_usd)
            check('funds_to_annex',actual-control,Decimal(2000),source_id=sid,annex=annex,metric=metric_name)
    for (sid,year),group in f[f.object_kind.isin(['segment','pillar','adjustment','entity_total'])].groupby(['source_id','period_year']):
        # Only the performance table: the same RB may appear again in Note 18.
        perf=group[group.table_title.str.startswith('Financial performance')]
        for metric_name in ['revenue','expenses','surplus_deficit']:
            metric_rows=perf[perf.metric==metric_name].to_dict('records')
            totals=[r for r in metric_rows if r['object_kind']=='entity_total']
            details=[r for r in metric_rows if r['object_kind']!='entity_total']
            if totals and details:
                check('segments_to_entity',sum(Decimal(r['amount_usd']) for r in details)-Decimal(totals[0]['amount_usd']),Decimal(2000),source_id=sid,period_year=int(year),metric=metric_name)
    c=pd.DataFrame(contributors)
    for (sid,page,row),group in c.groupby(['source_id','pdf_page','source_row']):
        for year,annual in group.groupby('period_year'):
            records=annual.to_dict('records')
            if sid.startswith('itc'):
                v={r['source_column']:Decimal(r['amount_usd']) for r in records}
                check('contribution_row_components',v['Window I']+v['Window II']-v['ITC Trust Fund'],Decimal(1000),source_id=sid,pdf_page=int(page),source_row=int(row),period_year=int(year))
            elif len(records)==3:
                v={r['source_column']:Decimal(r['amount_usd']) for r in records}
                if 'Earmarked total' in v:check('contribution_row_components',v['Foundation earmarked']+v['Technical cooperation']-v['Earmarked total'],Decimal(100),source_id=sid,pdf_page=int(page),source_row=int(row))
    for (sid,year,col),group in c[~c.is_cross_year_total].groupby(['source_id','period_year','source_column']):
        records=group.to_dict('records');totals=[r for r in records if r['row_kind']=='reported_total']
        if len(totals)!=1:raise ValueError(f'Missing/duplicate contributor total: {sid} {year} {col}')
        named=[r for r in records if r['row_kind'] in ['contributor','non_donor_category']]
        difference=sum(Decimal(r['amount_usd']) for r in named)-Decimal(totals[0]['amount_usd'])
        # HSP/EB.2024/2's printed rows sum $68,100 below its printed TC/combined
        # totals. Retain the printed observations and disclose this source residual.
        if sid=='habitat-2023-donors' and col in ['Technical cooperation','Earmarked total'] and difference==Decimal(-68100):
            warnings.append(dict(type='source_contributor_total_difference',source_id=sid,period_year=int(year),column=col,difference_usd=str(difference),policy='Preserve printed rows and total; do not assign the residual to a donor.'))
        else:
            check('contributors_to_printed_total',difference,Decimal(1000) if sid.startswith('itc') else Decimal(100),source_id=sid,period_year=int(year),column=col)
    warnings.extend(dict(type='coverage_gap',entity=e,detail=detail) for e,detail in [
        ('UNEP','Complete named donor-to-coded-fund observations not retrieved.'),
        ('UNODC','The main audited-source extraction has no named donor rows. Separate pledge tables are handled by the supplementary contributor extraction; pillar expenses include RB.'),
        ('ITC','Contributor appendix inspected for 2022/2023 only; no 2024/2025 appendix retrieved.')])
    return dict(status='passed_with_disclosed_source_gaps',source_documents=len(manifest),facts=len(facts),
        contributor_observations=len(contributors),fund_accounts_by_source={str(sid):int(len(g.object_id.unique())) for sid,g in f[f.object_kind=='fund_account'].groupby('source_id')},
        blank_observations=[dict(source_id=r['source_id'],pdf_page=r['pdf_page'],object_id=r['object_id'],column=r['source_column']) for r in facts if r['amount_usd'] is None],
        checks=checks,warnings=warnings,scope_policy='No trust-fund-versus-XB exclusions decided; separate measures and aggregation levels are not additive.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,default=ROOT)
    print(json.dumps(extract(parser.parse_args().root),indent=2))
