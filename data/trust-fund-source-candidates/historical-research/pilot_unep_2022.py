"""Offline historical pilot using the current table_rows/process_table adapters.

No ARWO inputs. Historical numeric columns are explicit, not padded with zero
movement amounts from the newer eight-column layout. Not a frontend exporter.
"""
from pathlib import Path
import sys,json,csv
from decimal import Decimal
from dataclasses import asdict

REPO=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(REPO/'python'))
import pymupdf
import secretariat_xb_sources as xb

ROOT=Path(__file__).resolve().parent
ANNEXES=[(134,134,'I'),(135,139,'II'),(140,144,'III'),(145,145,'IV'),(146,146,'V'),(147,147,'VI')]
METRICS=['opening_accumulated_surplus','opening_reserve','opening_net_assets','revenue','expenses','closing_net_assets']
SEGMENTS=[('Environment Fund','ENV'),('Regular budget','RB'),('Other support to programme of work','POW'),('Conventions and protocols','CONV'),('Multilateral Fund','MLF'),('Programme support','PSC'),('End-of-service and post-retirement benefits','BEN'),('Intersegment eliminations','ELIM'),('All funds','TOTAL'),('All funds comparative','TOTAL')]


def extract():
 source=next(s for s in json.loads((ROOT/'source-manifest.json').read_text()) if s['reporting_entity']=='UNEP' and s['reporting_year']==2022)
 path=REPO/source['local_path']
 import hashlib
 assert hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256']
 doc=pymupdf.open(path)
 specs=[xb.Table(98,'Financial performance by segment','segment_performance',
   [xb.field(n,c,year=2021 if i==9 else 2022,kind='adjustment' if c=='ELIM' else 'entity_total' if c=='TOTAL' else 'segment',rb=c=='RB') for i,(n,c) in enumerate(SEGMENTS)],150,sectioned=True)]
 for first,last,annex in ANNEXES:
  specs.extend(xb.Table(p,f'Annex {annex}: fund accounts','fund_accounts',[dict(name=m) for m in METRICS],0,annex=annex) for p in range(first,last+1))
 facts=[];tables=[];objects=[];repairs=[]
 for spec in specs:
  rows,literal=xb.table_rows(doc[spec.page-1],spec)
  #2022 SVL revenue is offset2.16pt BELOW its numeric baseline. The current
  #parser handles preceding wrapped cells only; recover a unique same-row
  #isolated cell geometrically, retaining its actual source row/y.
  if spec.kind=='fund_accounts':
   for row in rows:
    for col,cell in enumerate(row['cells']):
     if cell:continue
     candidates=[q for q in literal['rows'] if abs(q['y']-row['y'])<=3
                 and q['cells'][col] and sum(bool(c) for c in q['cells'])==1]
     if len(candidates)==1:
      q=candidates[0];row['cells'][col]=q['cells'][col];row['parsed'][col]=xb.amount(q['cells'][col],spec.unit)
      row['cell_y'][col]=q['y'];row['cell_row'][col]=q['physical_row_index']
      repairs.append(dict(pdf_page=spec.page,fund_code=row.get('fund_code'),column=spec.columns[col]['name'],reported_text=q['cells'][col],source_y=q['y'],source_physical_row=q['physical_row_index']))
  if spec.sectioned:spec.raw_rows=literal['rows']
  current,_,obj=xb.process_table(source,spec,rows)
  for row in current:row['source_page_url']=xb.pdf_page_url(row['source_url'],row['pdf_page'])
  facts.extend(current);tables.append(literal);objects.extend(obj)
 checks=[]
 def check(name,difference,tolerance=Decimal(2000),**context):
  difference=Decimal(difference);tolerance=Decimal(tolerance)
  checks.append(dict(check=name,difference_usd=str(difference),tolerance_usd=str(tolerance),status='passed' if abs(difference)<=tolerance else 'failed',**context))
 accounts={r['object_id'] for r in facts if r['object_kind']=='fund_account'}
 def value(obj,metric):
  rows=[r for r in facts if r['object_id']==obj and r['metric']==metric and r['period_year']==2022]
  assert len(rows)==1,(obj,metric,len(rows))
  return Decimal(rows[0]['amount_usd'])
 for obj in accounts:
  check('opening_stock_components',value(obj,'opening_accumulated_surplus')+value(obj,'opening_reserve')-value(obj,'opening_net_assets'),object_id=obj)
  check('net_asset_flow_equation',value(obj,'opening_net_assets')+value(obj,'revenue')-value(obj,'expenses')-value(obj,'closing_net_assets'),object_id=obj)
 annex_summaries=[]
 for first,last,annex in ANNEXES:
  annex_facts=[r for r in facts if r.get('annex')==annex]
  summary=dict(annex=annex,first_pdf_page=first,last_pdf_page=last,accounts=len({r['object_id'] for r in annex_facts if r['object_kind']=='fund_account'}))
  for metric in ['revenue','expenses','closing_net_assets']:
   leaves=sum((Decimal(r['amount_usd']) for r in annex_facts if r['object_kind']=='fund_account' and r['metric']==metric),Decimal(0))
   controls=[r for r in annex_facts if r['object_kind']=='reported_rollup' and r['metric']==metric]
   control=Decimal(controls[-1]['amount_usd'])
   adjustments=sum((Decimal(r['amount_usd']) for r in annex_facts if r['object_kind']=='adjustment' and r['metric']==metric),Decimal(0))
   check('accounts_plus_annex_adjustments_to_net_total',leaves+adjustments-control,annex=annex,metric=metric)
   summary[metric+'_annex_adjustment_usd']=str(adjustments)
   summary[metric+'_reported_net_usd']=str(control)
   summary[metric+'_usd']=str(leaves)
  annex_summaries.append(summary)
 for metric in ['expenses','revenue']:
  segment_sum=sum((Decimal(r['amount_usd']) for r in facts if not r.get('annex') and r['metric']==metric and r['period_year']==2022 and r['object_kind'] in ['segment','adjustment']),Decimal(0))
  check('segments_and_elimination_to_entity',segment_sum-value('UNEP:entity_total:TOTAL',metric),metric=metric)
 # Independent Statement II amount is read from its own physical page, not
 # copied from the segment statement's total column.
 statement_row=next(row for row in xb.physical_lines(doc[71]) if xb.text(row).startswith('Total expenses'))
 statement_amount=Decimal(xb.amount(xb.text(xb.numeric_groups(statement_row)[0]))[0])
 check('entity_to_statement_II_expenses',value('UNEP:entity_total:TOTAL','expenses')-statement_amount,0,pdf_page=72)
 segment_codes=['ENV','POW','CONV','MLF','PSC','BEN']
 for summary,code in zip(annex_summaries,segment_codes):
  check('annex_to_segment_expenses',Decimal(summary['expenses_usd'])-value('UNEP:segment:'+code,'expenses'),annex=summary['annex'])
 gross=sum(Decimal(a['expenses_usd']) for a in annex_summaries)
 elimination=value('UNEP:adjustment:ELIM','expenses')
 net=value('UNEP:entity_total:TOTAL','expenses')-value('UNEP:segment:RB','expenses')
 check('gross_accounts_plus_elimination_to_net_non_RB',gross+elimination-net)
 assert len(accounts)==138, len(accounts)
 assert net==Decimal(626632000),net
 profile=dict(status='passed' if all(c['status']=='passed' for c in checks) else 'failed',source_id=source['source_id'],
    facts=len(facts),fund_accounts=len(accounts),literal_tables=len(tables),layout_repairs=repairs,checks=checks,annexes=annex_summaries,
    entity_expenses_usd=str(statement_amount),regular_budget_expenses_usd=str(value('UNEP:segment:RB','expenses')),
    gross_account_expenses_usd=str(gross),elimination_usd=str(elimination),net_non_RB_expenses_usd=str(net),
    notes=['Six numeric fund columns, not eight: pre-2023 source has no separate surplus/reserve movement columns.',
           'Only current2022 account/segment rows enter2022 controls.2021 entity comparative is retained separately.',
           'AnnexII has a signed IML net-asset elimination of USD51,158,000; it is a stock adjustment, not expense.',
           'This pilot is source research only, not a published frontend dataset.'])
 output=ROOT/'pilot-unep-2022';output.mkdir(exist_ok=True)
 (output/'tables.jsonl').write_text('\n'.join(json.dumps(t,ensure_ascii=False) for t in tables)+'\n')
 with (output/'statement-facts.csv').open('w') as f:
  writer=csv.DictWriter(f,fieldnames=list(facts[0]));writer.writeheader();writer.writerows(facts)
 (output/'quality-profile.json').write_text(json.dumps(profile,indent=2))
 (output/'table-specifications.json').write_text(json.dumps([asdict(s) for s in specs],indent=2))
 print(json.dumps({k:v for k,v in profile.items() if k not in ['checks','annexes']},indent=2))
 if profile['status']!='passed':
  print(json.dumps([c for c in checks if c['status']!='passed'],indent=2))
  raise ValueError('Historical pilot validation failed')
 return profile

if __name__=='__main__':extract()
