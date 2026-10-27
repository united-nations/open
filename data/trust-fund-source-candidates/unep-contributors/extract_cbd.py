"""Extract historical CBD convention-fund collection ledgers from retained HTML.

Collections in the reporting year on earlier pledges and current-year pledges
are retained as separate source components, then added for the donor display.
Pledges, opening arrears and closing unpaid balances are never added to receipts.
No amount is allocated from fund families to accounts: the source itself names
the legal convention fund, matched to the audited account by its description.
"""
from pathlib import Path
from decimal import Decimal
import csv
import hashlib
import json
import re
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
CODES = {'BY':'BYL','BY+':'BYL','BE':'BEL','BZ':'BZL','VB':'VBL',
         'BG':'BGL','BG+':'BGL','BB':'BBL','BB+':'BBL'}
METRICS = ['opening_arrears','collections_on_prior_pledges','closing_prior_unpaid',
           'current_pledges','collections_on_current_pledges','closing_current_unpaid','closing_total_unpaid']

def parse(value):
    value=value.strip().replace(',','').replace('\xa0','')
    if not value:return None
    if value.startswith('('):value='-'+value[1:-1]
    return int(Decimal(value))


def extract():
    raw_facts=[];flows=[];controls=[];manifest=[]
    for year in [2023,2024]:
        path=ROOT/'raw'/f'cbd-contributions-{year}.html'
        content=path.read_bytes();sha=hashlib.sha256(content).hexdigest()
        soup=BeautifulSoup(content,'html.parser')
        source_url=f'https://www.cbd.int/convention/parties/contributions.shtml?tab=3&yr={year}'
        table_count=0
        for table_index,table in enumerate(soup.find_all('table')):
            rows=table.find_all('tr')
            header=next((r for r in rows if r.get_text(' ',strip=True).startswith('Country ')),None)
            if header is None:continue
            title_el=table.find_previous('h3')
            title=title_el.get_text(' ',strip=True)
            match=re.search(r'\((BY\+?|BE|BZ|VB|BG\+?|BB\+?)\)\s*$',title)
            if not match:raise ValueError(f'Unmapped CBD source fund: {title}')
            fund=match.group(1);code=CODES[fund]
            if f'In USD as at {year}-12-31' not in table.get_text(' ',strip=True):
                raise ValueError('Requested year differs from source table as-of date')
            anchor=title_el.get('id');url=source_url+(f'#{anchor}' if anchor else '')
            source_id=f'cbd-contribution-status-{year}'
            table_count+=1
            donor_components=[];printed=None
            started=False
            for physical_row,row in enumerate(rows,1):
                if row is header:started=True;continue
                if not started:continue
                cells=[c.get_text(' ',strip=True) for c in row.find_all(['td','th'],recursive=False)]
                if not cells or not cells[0]:continue
                is_total=cells[0].startswith('Total ')
                # Totals omit the blank Note cell although named rows include it.
                vals=cells[-7:]
                if len(vals)!=7:raise ValueError('Unexpected CBD numeric column layout')
                amounts=[parse(x) for x in vals]
                base=dict(source_id=source_id,reporting_entity='UNEP',period_year=year,as_of=f'{year}-12-31',
                    object_id=f'UNEP:account:{code}',object_label=title,destination_node_id=f'xb:UNEP:account:{code}',
                    source_fund_code=fund,account_code=code,counterparty_reported=cells[0],counterparty=cells[0],
                    row_kind='printed_total' if is_total else 'contributor',
                    printed_unit_usd=1,rounding_increment_usd=1,coverage='complete_named_rows_for_source_fund',
                    scope_status='convention_fund_collections_not_IPSAS_revenue',
                    document_symbol='CBD Status of Contributions',source_url=url,pdf_page='',
                    table_title=title,source_page_url=url,source_sha256=sha,source_row=physical_row,source_table_index=table_index)
                for metric,value,printed_text in zip(METRICS,amounts,vals):
                    raw_facts.append(dict(base,metric=metric,amount_usd=value,reported_text=printed_text,
                        reported_as_blank=value is None,basis='historical_contribution_status'))
                selected=[(METRICS[i],amounts[i]) for i in [1,4] if amounts[i] is not None]
                if is_total:
                    printed={metric:value for metric,value in selected}
                    continue
                donor_components.append({metric:value for metric,value in selected})
                if selected:
                    flows.append(dict(base,amount_usd=sum(value for _,value in selected),reported_text='',
                        metric='collections_received_during_year',measure='Collections during year — current and prior pledges',
                        basis='sum_of_two_reported_collection_columns',components=json.dumps(dict(selected)),
                        note='Derived by adding collections in the reporting year on prior pledges and on current-year pledges. Blank source cells are retained as missing in the raw ledger.'))
            if printed is None:raise ValueError('No source fund total')
            for metric,expected in printed.items():
                actual=sum(r.get(metric,0) for r in donor_components)
                delta=actual-expected
                if abs(delta)>len(donor_components):
                    raise ValueError(f'Unexplained source fund difference: {year} {fund} {metric} {delta}')
                controls.append(dict(source_id=source_id,source_fund_code=fund,metric=metric,
                    rows_sum_usd=actual,printed_total_usd=expected,difference_usd=delta,
                    status='passed' if delta==0 else 'passed_with_display_rounding_difference',source_url=url))
        if table_count!=9:raise ValueError(f'Expected nine fund ledgers, got {table_count}')
        manifest.append(dict(source_id=f'cbd-contribution-status-{year}',year=year,source_url=source_url,
            publisher='Secretariat of the Convention on Biological Diversity',
            local_path=str(path.relative_to(ROOT.parent.parent.parent)),sha256=sha,retrieved_on='2026-10-27',
            tables=table_count,source_type='historical_HTML_ledger',pdf_pages=None))
    for filename,records in [('cbd-statement-facts.csv',raw_facts),('cbd-contributor-observations.csv',flows)]:
        with (ROOT/filename).open('w') as handle:
            writer=csv.DictWriter(handle,fieldnames=list(records[0]));writer.writeheader();writer.writerows(records)
    (ROOT/'cbd-source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'cbd-quality-profile.json').write_text(json.dumps(dict(status='passed_with_display_rounding_differences',
        observations=len(raw_facts),contributor_collection_rows=len(flows),
        unique_accounts=sorted(set(r['account_code'] for r in flows)),checks=controls,
        limitations=['Historical contribution-status collections, not recognized IPSAS contribution revenue.',
                     'Source summary donor-type tables and detailed fund ledgers differ by a few dollars; detailed ledgers are retained and checked independently.',
                     'Distinct contribution lines from the same donor, including additional core contributions, remain separate source rows; aggregate only within this measure.',
                     'HTML tables have document anchors rather than invented PDF pages.',
                     'Coverage is complete for these nine source ledgers/six accounts; partial across all UNEP accounts.']),indent=2)+'\n')
    return {'facts':len(raw_facts),'collection_rows':len(flows),'checks':len(controls),
            'differences':[x for x in controls if x['difference_usd']]}

if __name__=='__main__':print(json.dumps(extract(),indent=2))
