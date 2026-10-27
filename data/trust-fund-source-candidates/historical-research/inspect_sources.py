"""Build a page inventory and direct-source historical entity controls offline."""
from pathlib import Path
import re,json,csv,sys
from decimal import Decimal
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
sys.path.insert(0,str(REPO/'python'))
import pymupdf
import secretariat_xb_sources as xb

PAGES={
 'UNEP':{2019:dict(statement=100,segment=125,annexes=[(159,163,'I','POW'),(164,167,'II','CONV')]),2020:dict(statement=80,segment=105,annexes=[(141,141,'I','ENV'),(142,146,'II','POW'),(147,150,'III','CONV'),(151,151,'IV','MLF'),(152,152,'V','PSC'),(153,153,'VI','BEN')]),2021:dict(statement=78,segment=103,annexes=[(139,139,'I','ENV'),(140,144,'II','POW'),(145,148,'III','CONV'),(149,149,'IV','MLF'),(150,150,'V','PSC'),(151,151,'VI','BEN')]),2022:dict(statement=72,segment=98,annexes=[(134,134,'I','ENV'),(135,139,'II','POW'),(140,144,'III','CONV'),(145,145,'IV','MLF'),(146,146,'V','PSC'),(147,147,'VI','BEN')])},
 'UN-HABITAT':{2019:dict(statement=77,segment=103),2020:dict(statement=68,segment=94),2021:dict(statement=92,segment=117),2022:dict(statement=81,segment=107)},
 'UNODC':{2019:dict(statement=66,pillar=85,rb=101),2020:dict(statement=68,pillar=88,rb=104),2021:dict(statement=68,pillar=88,rb=104),2022:dict(statement=64,pillar=86,rb=102)},
 'ITC':{2019:dict(statement=52,gross=40),2020:dict(statement=46,gross=32),2021:dict(statement=45,gross=30),2022:dict(statement=43,gross=29)},
}


def row_numbers(doc,page,prefix):
 hits=[]
 for row in xb.physical_lines(doc[page-1]):
  label=xb.text(row)
  if label.lower().startswith(prefix.lower()):
   groups=xb.numeric_groups(row)
   hits.append((label,[xb.text(g) for g in groups],row[0][1]))
 if len(hits)!=1:raise ValueError((page,prefix,hits))
 return hits[0]


def inspect():
 manifest=json.loads((ROOT/'source-manifest.json').read_text())
 coverage=[];controls=[]
 for source in manifest:
  entity,year=source['reporting_entity'],source['reporting_year']
  doc=pymupdf.open(REPO/source['local_path']);pages=PAGES[entity][year]
  # Verify all sources have extractable text and an IPSAS audit opinion.
  audit=' '.join(doc[i].get_text() for i in range(4,min(12,len(doc))))
  assert 'International Public Sector Accounting Standards' in audit,(entity,year)
  statement_label,statement_values,statement_y=row_numbers(doc,pages['statement'],'Total expenses')
  total=Decimal(xb.amount(statement_values[-2])[0])
  supporting=[dict(url=source['url'],pdf_page=pages['statement'],page_url=xb.pdf_page_url(source['url'],pages['statement']),row=statement_label,column=str(year),reported_text=statement_values[-2],source_y=statement_y)]
  regular=None
  if entity in ['UNEP','UN-HABITAT']:
   label,values,y=row_numbers(doc,pages['segment'],'Total segment expenses' if entity=='UNEP' else 'Total expenses')
   n=10 if entity=='UNEP' else 9
   assert len(values)==n,(entity,year,values)
   regular=Decimal(xb.amount(values[1])[0])
   assert Decimal(xb.amount(values[-2])[0])==total
   supporting.append(dict(url=source['url'],pdf_page=pages['segment'],page_url=xb.pdf_page_url(source['url'],pages['segment']),row=label,column='Regular budget '+str(year),reported_text=values[1],source_y=y))
  elif entity=='UNODC':
   label,values,y=row_numbers(doc,pages['rb'],'Total expenditure (statement II)')
   assert len(values)==2,(entity,year,values)
   regular=Decimal(xb.amount(values[0])[0])
   supporting.append(dict(url=source['url'],pdf_page=pages['rb'],page_url=xb.pdf_page_url(source['url'],pages['rb']),row=label,column=str(year),reported_text=values[0],source_y=y))
  if entity=='ITC':
   text=' '.join(doc[pages['gross']-1].get_text().split())
   match=re.search(r'gross extrabudgetary expenditures? of \$([\d.]+) million',text,re.I)
   assert match,(entity,year)
   amount=Decimal(match.group(1))*1000000
   measure='reported_gross_xb_programme_delivery'
   supporting=[dict(url=source['url'],pdf_page=pages['gross'],page_url=xb.pdf_page_url(source['url'],pages['gross']),row='Gross extrabudgetary expenditure paragraph',column=str(year),reported_text=match.group(0))]
  else:amount=total-regular;measure='audited_expenses_less_regular_budget'
  controls.append(dict(source_id=source['source_id'],reporting_entity=entity,period_year=year,measure=measure,amount_usd=str(amount),statement_total_usd=str(total),regular_budget_usd='' if regular is None else str(regular),document_symbol=source['document_symbol'],source_url=source['url'],supporting_sources=json.dumps(supporting)))
  fund_detail='None: entity-only gross XB delivery' if entity=='ITC' else 'Pillars include RB; pure-XB fund breakdown not established' if entity=='UNODC' else 'Funding segments, not an individual-fund inventory' if entity=='UN-HABITAT' else 'Programme-of-work and conventions accounts only' if year==2019 else 'Six annexes of individual account rows and printed rollups'
  record=dict(source_id=source['source_id'],reporting_entity=entity,reporting_year=year,document_symbol=source['document_symbol'],source_url=source['url'],pdf_pages=len(doc),statement_II_pdf_page=pages['statement'],segment_or_pillar_pdf_page=pages.get('segment',pages.get('pillar','')),regular_budget_control_pdf_page=pages.get('rb',pages.get('segment','')),gross_XB_paragraph_pdf_page=pages.get('gross',''),fund_annexes=json.dumps(pages.get('annexes',[])),fund_detail=fund_detail,financial_basis='Annual IPSAS statements; ITC gross-delivery paragraph separately qualified',source_status='retrieved_inspected_not_published')
  coverage.append(record)
  source['inspected_tables']=pages
  source['current_period_control']=dict(amount_usd=str(amount),measure=measure,supporting_sources=supporting)
  source['fund_detail_status']=fund_detail
 (ROOT/'source-manifest.json').write_text(json.dumps(manifest,indent=2))
 for name,rows in [('coverage.csv',coverage),('entity-controls.csv',controls)]:
  with (ROOT/name).open('w') as f:
   w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 print(json.dumps(controls,indent=2))
 return coverage,controls

if __name__=='__main__':inspect()
