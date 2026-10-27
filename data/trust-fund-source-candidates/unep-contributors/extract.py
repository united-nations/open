"""Extract rounded, explicitly partial UNEP annual-report contributor tables.

These are top-15 reported contribution snapshots, not audited IPSAS revenue or
complete donor ledgers. The two report categories remain separate series.
Run from the repository root: uv run python data/trust-fund-source-candidates/unep-contributors/extract.py
"""
from pathlib import Path
from decimal import Decimal
import csv
import hashlib
import json
import re
import pymupdf

ROOT = Path(__file__).resolve().parent
SOURCES = [
    {'source_id':'unep-annual-report-contributors-2023', 'year':2023, 'pdf_page':22,
     'file':'unep-annual-report-2023.pdf', 'document_symbol':'UNEP Annual Report 2023',
     'source_url':'https://digitallibrary.un.org/record/4047327/files/1405542-EN.pdf',
     'publisher_url':'https://www.unep.org/annualreport/2023',
     'original_url':'https://wedocs.unep.org/bitstream/handle/20.500.11822/44777/UNEP_Annual_Report_2023.pdf?isAllowed=y&sequence=1'},
    {'source_id':'unep-annual-report-contributors-2024', 'year':2024, 'pdf_page':30,
     'file':'unep-annual-report-2024.pdf', 'document_symbol':'UNEP Annual Report 2024',
     'source_url':'https://brasil.un.org/sites/default/files/2025-02/UNEP-Annual-Report-2024.pdf',
     'publisher_url':'https://www.unep.org/annualreport/2024',
     'original_url':'https://wedocs.unep.org/bitstream/handle/20.500.11822/47082/UNEP-Annual-Report-2024.pdf'},
]

def extract():
    observations = []
    manifest = []
    for source in SOURCES:
        path = ROOT/'raw'/source['file']
        raw = path.read_bytes()
        if not raw.startswith(b'%PDF'):
            raise ValueError(f'Not a PDF: {path}')
        sha = hashlib.sha256(raw).hexdigest()
        doc = pymupdf.open(path)
        page = doc[source['pdf_page']-1]
        lines = [line.strip() for line in page.get_text().splitlines() if line.strip()]
        # PDF reading order prints all Environment Fund rows, then earmarked rows.
        heading = next(i for i,line in enumerate(lines) if line.startswith('Top-15 Environment Fund'))
        i = next(i for i in range(heading, len(lines)) if lines[i] == 'Norway')
        categories = [('Environment Fund','UNEP:family:EnvironmentFund','xb:UNEP:annex:I'),
                      ('Earmarked funds','UNEP:family:EarmarkedFunds','xb-entity:UNEP')]
        for category,object_id,destination in categories:
            series = []
            for ordinal in range(15):
                parts = []
                while i < len(lines) and not re.fullmatch(r'\d+\.\d', lines[i]):
                    parts.append(lines[i]);i += 1
                if not parts or i >= len(lines):
                    raise ValueError(f'Missing named row: {source["year"]} {category} {ordinal}')
                name = ' '.join(parts)
                printed = lines[i];i+=1
                name = re.sub(r'\*+$','',name)
                is_group = name in ['UN Agencies','UN agencies','Foundations/NGOs','Foundation/Non-governmental organizations']
                row = {
                    'source_id':source['source_id'], 'reporting_entity':'UNEP',
                    'period_year':source['year'], 'as_of':f'{source["year"]}-12-31',
                    'object_id':object_id, 'object_label':category, 'destination_node_id':destination,
                    'counterparty_reported':name, 'counterparty':name,
                    'row_kind':'grouped_counterparty' if is_group else 'contributor',
                    'amount_usd':str(int(Decimal(printed)*1000000)), 'reported_text':printed,
                    'printed_unit_usd':1000000, 'rounding_increment_usd':100000,
                    'metric':'reported_contributions_top15', 'measure':'Reported contributions — top 15',
                    'basis':'annual_report_source_defined_contributions',
                    'coverage':'partial_top15', 'scope_status':'fund_family_only_no_account_allocation',
                    'document_symbol':source['document_symbol'], 'source_url':source['source_url'],
                    'pdf_page':source['pdf_page'], 'table_title':f'Top-15 {category} contributors in {source["year"]} (US$ million)',
                    'source_page_url':source['source_url']+f'#page={source["pdf_page"]}',
                    'source_sha256':sha, 'source_row':ordinal+1,
                }
                observations.append(row);series.append(row)
            if len({r['counterparty'] for r in series}) != 15:
                raise ValueError('Duplicate contributor in a source top-15 table')
        manifest.append({**source,'local_path':str(path.relative_to(ROOT.parent.parent.parent)),
                         'sha256':sha,'pdf_pages':len(doc),'retrieved_on':'2026-10-27'})
    with (ROOT/'contributor-observations.csv').open('w') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(observations[0]));writer.writeheader();writer.writerows(observations)
    (ROOT/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    summary=[]
    for year in [2023,2024]:
        for label in ['Environment Fund','Earmarked funds']:
            rows=[r for r in observations if r['period_year']==year and r['object_label']==label]
            summary.append({'period_year':year,'object_label':label,'rows':len(rows),
                            'listed_amount_usd':sum(int(r['amount_usd']) for r in rows),
                            'coverage':'partial_top15','complete_annual_total_usd':None})
    (ROOT/'quality-profile.json').write_text(json.dumps({'status':'passed_partial_source_coverage',
        'checks':['two years × two source-labelled tables × fifteen unique counterparties',
                  'source PDFs and physical pages retained; SHA-256 pinned',
                  'printed decimal million amounts converted exactly to USD',
                  'grouped counterparty categories distinguished from named donors',
                  'no invented Other contributor or annual denominator',
                  'Environment Fund family not allocated to FEL/FPL/RAL'],
        'series':summary},indent=2)+'\n')
    return summary

if __name__ == '__main__':
    print(json.dumps(extract(),indent=2))
