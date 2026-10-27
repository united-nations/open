"""Normalize retained public UNODC pledge queries and qualified document subsets.

Run from repository root: uv run python data/trust-fund-source-candidates/unodc-contributors/extract.py
This step is offline. Public report capture and historical query steps are separate.
"""
from __future__ import annotations

from collections import Counter, defaultdict
import csv
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
from pathlib import Path
import re
import sys

import pymupdf

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
sys.path.insert(0, str(REPO / 'python'))
from utils import clean_donor_name

CENT = Decimal('0.01')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_csv(name, rows):
    with (ROOT/name).open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def decode(path):
    payload = json.loads(path.read_text(), parse_float=Decimal)
    data = payload['results'][0]['result']['data']
    if 'error' in payload['results'][0]['result']:
        raise ValueError(payload)
    dataset = data['dsr']['DS'][0]
    assert len(dataset['PH']) == 1
    records = dataset['PH'][0]['DM0']
    previous = []
    schema = None
    result = []
    for row in records:
        schema = row.get('S', schema)
        assert schema is not None
        cells = iter(row.get('C', []))
        raw = []
        decoded = []
        for i, column in enumerate(schema):
            value = previous[i] if row.get('R', 0) & (1 << i) else (
                None if row.get('Ø', 0) & (1 << i) else next(cells))
            raw.append(value)
            dictionary = dataset.get('ValueDicts', {}).get(column.get('DN'))
            decoded.append(dictionary[value] if dictionary is not None and isinstance(value, int) else value)
        previous = raw
        assert next(cells, None) is None
        result.append(decoded)
    return result


def grouped(name):
    return name in {'Other MPTFs', 'Other UN Partners', 'Public Donation', 'UN PUBLIC DONATION', 'Pooled Funding'}


def observation(source_id, year, name, amount, object_id, label, file, row, fund_family='', purpose='', raw=None):
    url = 'https://www.unodc.org/unodc/en/donors/' + ('grants-opendata2024.html' if year == 2024 else 'unodc-partners.html')
    return dict(source_id=source_id, reporting_entity='UNODC', report_year=year,
        period_year=year, object_id=object_id, object_kind='funding_category',
        metric='pledged_contributions', amount_usd=str(amount), currency='USD',
        basis='indicative_calendar_year_pledges', printed_unit_usd=1,
        reported_text=str(raw if raw is not None else amount),
        counterparty_reported=name, counterparty=clean_donor_name(name),
        row_kind='contributor', is_grouped_counterparty=grouped(name),
        counterparty_quality='aggregate_or_anonymous_bucket' if grouped(name) else 'as_reported',
        fund_family=fund_family, funding_purpose=purpose,
        includes_regular_budget=False, is_comparative=False, is_aggregate_column=False,
        is_cross_year_total=False, scope_status='source_defined_voluntary_pledges',
        source_url=url, source_page_url=url,
        document_symbol=f'UNODC Open Data for Partnerships and Funding — {year}',
        pdf_page='', table_title=label, source_row=row,
        source_file=str(file.relative_to(REPO)), source_sha256=digest(file),
        source_note=('2024 static report: rounded whole-dollar donor values. No donor-by-Crime/Drugs cross-tab is provided.' if year == 2024 else
            'Live report, last refresh 21 March 2025. Public source amounts normalized to cents with raw values retained; later documentary controls differ.'))


def extract():
    facts = []
    for kind, filename in [('SP','response-005.json'), ('GP','response-007.json')]:
        file = ROOT/'dashboard-capture'/filename
        rows = decode(file)
        assert len(rows) < 500  # The captured published table requests a 500-row window.
        assert len(rows) == (76 if kind == 'SP' else 16)
        label = f'Pledged Contributions - {"Special" if kind == "SP" else "General"} Purpose'
        for ordinal, (name, amount, percentage) in enumerate(rows):
            assert isinstance(name, str) and Decimal(amount) >= 0
            facts.append(observation('unodc-public-pledges-static-2024', 2024, name, Decimal(amount),
                f'UNODC:pledges:{kind}', label, file, ordinal, purpose=kind))
    file = ROOT/'live-2023-response.json'
    rows = decode(file)
    assert len(rows) == 158 and len(rows) < 10000
    for ordinal, (name, year, family, purpose, amount) in enumerate(rows):
        assert year == 2023 and family in ['Crime','Drugs'] and purpose in ['General Purpose','Special Purpose']
        code = 'GP' if purpose == 'General Purpose' else 'SP'
        value = Decimal(amount).quantize(CENT, rounding=ROUND_HALF_UP)
        facts.append(observation('unodc-public-pledges-live-2023', 2023, name, value,
            f'UNODC:pledges:{family}:{code}', 'Public pledge data: donor × fund family × funding purpose × year',
            file, ordinal, family, code, raw=amount))
    assert len({(r['source_id'],r['object_id'],r['counterparty_reported']) for r in facts}) == len(facts)
    assert sum(Decimal(r['amount_usd']) for r in facts if r['period_year']==2024) == Decimal(519320861)
    assert sum(Decimal(r['amount_usd']) for r in facts if r['period_year']==2023) == Decimal('453853084.35')
    assert len({r['counterparty_reported'] for r in facts if r['period_year']==2024}) == 80
    write_csv('contributor-observations.csv', facts)

    controls = []
    pdf = ROOT/'donor-type-controls.pdf'
    for year, total in [(2023,453869467),(2024,519320861)]:
        extracted = sum(Decimal(r['amount_usd']) for r in facts if r['period_year']==year)
        controls.append(dict(period_year=year, measure='calendar_year_pledges_source_defined',
            extracted_total_usd=str(extracted), document_total_usd=total,
            difference_usd=str(extracted-total), source_url=json.loads((ROOT/'urls.json').read_text())['donor-type-controls.pdf'],
            source_page_url=json.loads((ROOT/'urls.json').read_text())['donor-type-controls.pdf']+'#page=3',
            document_symbol='E/CN.7/2025/15 – E/CN.15/2025/18',pdf_page=3,
            table_title='Table 1: Contributions to UNODC, by donor type',
            row_label='Grand total', source_sha256=digest(pdf),
            note='2023 source vintage difference retained; 2024 exact agreement.' if year==2023 else 'Exact agreement with the independently published official document.'))
    write_csv('control-reconciliation.csv', controls)

    # The UNVTF table is a separate donor subset and must not be added to the
    # office-wide pledge tables. Its own rows and printed discrepancies survive.
    file=ROOT/'unvtf-2024.pdf'
    page=pymupdf.open(file)[26]
    text=page.get_text()
    section=text.split('MEMBER STATES\n 2024\n',1)[1].split('Annex ',1)[0]
    subset=[]
    for ordinal,match in enumerate(re.finditer(r'([A-Za-z][A-Za-z .-]+)\n\s*\$\s*([0-9, ]+)',section)):
        name=match.group(1).strip();amount=int(match.group(2).replace(',','').replace(' ',''))
        subset.append(dict(source_id='unodc-unvtf-annual-report-2024',period_year=2024,
            reporting_entity='UNODC',object_id='UNODC:UNVTF:GLOX42',
            counterparty_reported=name, counterparty=clean_donor_name(name),
            metric='contributions_received_source_defined',amount_usd=amount,
            basis='annual_partner_contribution_receipts_deposits',
            row_kind='printed_total' if name=='TOTAL' else 'contributor',
            source_url=json.loads((ROOT/'urls.json').read_text())['unvtf-2024.pdf'],
            source_page_url=json.loads((ROOT/'urls.json').read_text())['unvtf-2024.pdf']+'#page=27',
            pdf_page=27, table_title='Partner Contribution 2024', source_row=ordinal,source_sha256=digest(file),
            note='Subfund subset; source footnote distinguishes deposits from certified pledge amounts due to FX. Do not add to office-wide totals.'))
    assert len(subset)==13
    assert sum(r['amount_usd'] for r in subset if r['row_kind']=='contributor')==1019738
    assert next(r['amount_usd'] for r in subset if r['row_kind']=='printed_total')==1019783
    write_csv('unvtf-2024-contributor-subset.csv',subset)

    registry=[]
    urls=json.loads((ROOT/'urls.json').read_text())
    for filename,url in urls.items():
        file=ROOT/filename
        registry.append(dict(source_id=filename, url=url, local_path=str(file.relative_to(REPO)),
            sha256=digest(file), bytes=file.stat().st_size,
            pdf_pages=len(pymupdf.open(file)) if file.suffix=='.pdf' else None))
    for folder in ['dashboard-capture','dashboard-live-capture']:
        for file in sorted((ROOT/folder).glob('*.json')):
            registry.append(dict(source_id=f'{folder}/{file.name}', local_path=str(file.relative_to(REPO)),
                sha256=digest(file), bytes=file.stat().st_size,
                url='See the retained public capture requests.json for the exact report/API URL.'))
    for filename in ['live-2023-request.json','live-2023-response.json']:
        file=ROOT/filename
        registry.append(dict(source_id=filename,local_path=str(file.relative_to(REPO)),sha256=digest(file),
            bytes=file.stat().st_size,url='See dashboard-live-capture/requests.json and fetch-public-query.py.'))
    (ROOT/'source-registry.json').write_text(json.dumps(registry,indent=2))
    report=dict(status='passed_with_explicit_source_differences',
        contributor_observations=len(facts),observations_by_year=dict(Counter(r['period_year'] for r in facts)),
        total_2024_usd=519320861,total_2023_usd='453853084.35',
        reported_counterparty_labels_2024=80, dashboard_headline_donors_2024=82,reported_counterparty_labels_2023=115,
        named_donor_counts_not_established='Some reported labels are grouped/anonymous; the label counts are not underlying distinct donors.',
        source_differences=[dict(source='2024 dashboard donor count',reason='The headline says 82 donors; complete GP/SP rows contain 80 distinct reported labels. Labels include grouped and anonymous buckets.'),dict(year=2023,difference_usd='-16382.65',reason='Live 2025-refresh pledge data differs from later ACABQ documentary vintage.'),
            dict(source='UNVTF 2024 partner table',difference_usd=-45,reason='Twelve named rows sum to 1,019,738; standalone printed TOTAL is 1,019,783. Summary elsewhere on the same page uses 1,019,738.'),
            dict(source='UNVTF 2024 bases',reason='2024 deposits summary 1,028,327 includes 8,589 private donors; certified voluntary contributions pledged are 1,016,847; 46,943 interest produces the separate 1,063,790 total-funding figure. No forced reconciliation.' )],
        ready_for_separately_labelled_pledge_view=True,
        ready_for_recognized_revenue_or_cash_receipts_view=False,
        complete_donor_by_legal_fund_revenue=False,
        checks=['All 2024 published GP/SP table records decoded; 92 rows, 80 reported labels (headline count 82 differs).',
            'All 2023 public donor/family/purpose records decoded; 158 rows, 115 labels.',
            'No duplicate source/category/counterparty keys.',
            '2024 GP+SP sum matches independent official document exactly.',
            '2023 source difference retained without invented residual contributor.',
            'All observations have retained public response hashes and original source URLs.'])
    (ROOT/'quality-profile.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))


if __name__=='__main__':extract()
