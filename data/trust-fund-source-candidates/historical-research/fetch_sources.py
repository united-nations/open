"""Fetch official historical audited reports selected from the BOA directory."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote
import requests, re, json, hashlib
from bs4 import BeautifulSoup
import pymupdf
ROOT=Path(__file__).resolve().parent
URL='https://www.un.org/en/united-nations-board-auditors/board-auditors-reports'
DIRECT={('UNEP',2022):'https://digitallibrary.un.org/record/4023202/files/A_78_5_Add.7-EN.pdf',
 ('UNEP',2021):'https://digitallibrary.un.org/record/3986079/files/A_77_5_Add.7-EN.pdf',
 ('UNEP',2020):'https://digitallibrary.un.org/record/3937518/files/A_76_5_Add.7-EN.pdf',
 ('UNEP',2019):'https://digitallibrary.un.org/record/3877557/files/A_75_5_Add.7-EN.pdf',
 ('UN-HABITAT',2022):'https://digitallibrary.un.org/record/4023347/files/A_78_5_Add.9-EN.pdf',
 ('UNODC',2022):'https://digitallibrary.un.org/record/4023527/files/A_78_5_Add.10-EN.pdf',
 ('ITC',2022):'https://digitallibrary.un.org/record/4020023/files/A_78_5_%28Vol._III%29-EN.pdf'}

def fetch(item):
 entity,year=item;session=year-1944
 symbol=f'A/{session}/5 (Vol. III)' if entity=='ITC' else f'A/{session}/5/Add.'+{'UNEP':'7','UN-HABITAT':'9','UNODC':'10'}[entity]
 path=ROOT/'raw'/f'{entity}-{year}.pdf'
 url=DIRECT.get(item) or 'https://documents.un.org/api/symbol/access?s='+quote(symbol,safe='')+'&l=en&t=pdf'
 rec=dict(source_id=f'{entity.lower()}-accounts-{year}',reporting_entity=entity,reporting_year=year,document_symbol=symbol,url=url,source_role='audited_accounts')
 try:
  if path.exists():data=path.read_bytes()
  else:
   resp=requests.get(url,timeout=70);resp.raise_for_status();data=resp.content
   if not data.startswith(b'%PDF'):raise ValueError('Response is not a PDF')
   path.write_bytes(data)
  doc=pymupdf.open(path)
  cover=' '.join(doc[0].get_text().split())
  if str(year) not in cover or str(session) not in cover:raise ValueError('Wrong cover year/session')
  rec.update(local_path=str(path.relative_to(Path.cwd())),sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),pdf_pages=len(doc),cover_text=cover,status='retrieved_cover_verified')
 except Exception as exc:rec.update(status='retrieval_failed',error=str(exc))
 print(entity,year,rec['status'],rec.get('pdf_pages',''),flush=True)
 return rec
if __name__=='__main__':
 (ROOT/'raw').mkdir(exist_ok=True)
 with ThreadPoolExecutor(max_workers=6) as pool:records=list(pool.map(fetch,[(e,y) for e in ['UNEP','UNODC','UN-HABITAT','ITC'] for y in range(2019,2023)]))
 (ROOT/'source-manifest.json').write_text(json.dumps(records,indent=2))
