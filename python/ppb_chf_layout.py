"""Convert ITC's printed CHF XB amounts consistently for USD sums and charts.

Never import the full CHF regular budget: it includes the WTO share, whereas
our USD RB row is only the United Nations grant. Subtotal 2 is the XB control;
the later Total contains RB as well and must not be added.
"""
from decimal import Decimal, ROUND_HALF_UP
import json
from pathlib import Path
import re

RATES = Path('data/un-chf-budget-rates.json')

def add_chf_layout(payload, financial, citation_source):
    if payload['meta']['measure'] != 'expenditure' or payload['meta']['year'] < 2019:
        return
    year = payload['meta']['year']; edition = payload['meta']['edition']
    table = f'ppb{edition}:A_{edition - 1946}_6 (SECT. 13)|word/document.xml|t{10 if edition == 2027 else 9:04d}'
    citations = {c['citationId']: c for c in financial['citations']}
    controls = [o for o in financial['observations']
                if citations[o['citationId']].get('tableId') == table
                and citations[o['citationId']].get('rowLabel') == 'Subtotal, 2'
                and o['lens']['measure'] == 'expenditure' and o['lens']['dataYear'] == year
                and o['lens']['fundingSource'] == 'extrabudgetary']
    if len(controls) != 1: raise ValueError(f'Expected one printed ITC CHF XB subtotal for {year}')
    control = controls[0]
    evidence = next(r for r in json.loads(Path('data/ppb-chf-source-controls.json').read_text())
                    if r['expenditureYear'] == year)
    if evidence['sourceCell'] != control['observationId'] or Decimal(control['money']['amountExact']) != evidence['amountChf']:
        raise ValueError(f'ITC CHF source control changed for {year}; review its printed currency and period')
    rates = json.loads(RATES.read_text())
    rate_year = year + 1
    rate_record = rates['ratesByBudgetYear'][str(rate_year)]
    chf_per_usd = Decimal(rate_record['chfPerUsd'])
    if chf_per_usd <= 0:
        raise ValueError(f'Invalid CHF budget rate for {rate_year}')
    amount = Decimal(control['money']['amountExact'])
    usd = (amount / chf_per_usd).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    source = citation_source(citations[control['citationId']])
    source['label'] = 'Extrabudgetary — printed in CHF'
    source['operand'] = {'amount': int(amount), 'currency': 'CHF'}
    source['pdfPage'] = evidence['pdfPage']
    source['pdfPageScope'] = 'row'
    source['pageStatus'] = 'located'
    source['url'] = re.sub(r'#page=\d+$', '', source['url']) + f"#page={evidence['pdfPage']}"
    rate_source = {'symbol': rate_record['symbol'], 'url': rate_record['url'],
                   'pdfPage': rate_record['pdfPage'], 'pdfPageScope': 'row',
                   'pageStatus': 'located', 'rowLabel': rate_record['location'],
                   'columnHeader': f'{rate_year} budget rate: CHF {chf_per_usd} per USD',
                   'label': f'CHF {amount:,} ÷ {chf_per_usd} = USD {usd:,} (budget-rate equivalent)'}
    chf = {'amount': int(amount), 'usdEquivalent': float(usd), 'chfPerUsd': str(chf_per_usd),
           'rateYear': rate_year, 'rateSource': rate_source,
           'rateMethod': rates['method'], 'year': year,
           'sourceCell': control['observationId'], 'source': source}
    nodes = {n['id']: n for n in payload['nodes']}
    units = [n for n in payload['nodes'] if n['parentId'] == 'section-13' and n['tier'] == 'budget_unit']
    if len(units) != 1: raise ValueError(f'Ambiguous ITC scope for {year}')
    node = units[0]
    while node:
        if node.get('chf'): raise ValueError('CHF layout already applied')
        node['chf'] = dict(chf)
        node['publishedUsdAmount'] = node['amount']
        node['basis'] = 'usd_equivalent_with_chf_budget_rate_conversion'
        if node.get('note'):
            node['note'] = node['note'].replace(
                'Section 13 CHF and every incomplete child remain explicit residue.',
                'Section 13 CHF is included as a budget-rate USD equivalent; incomplete child breakdowns remain explicit.')
        if node['id'].startswith('section-13'):
            node['note'] = ('Includes the UN regular-budget grant in USD and extrabudgetary expenditure converted from CHF at the following year’s UN budget rate. This conversion does not establish complete lower-level allocations.')
        node['values']['extrabudgetary'] = float(Decimal(str(node['values'].get('extrabudgetary', 0))) + usd)
        node['amount'] = float(Decimal(str(node['amount'])) + usd)
        node['metricValues']['expenditure'] = dict(node['values'])
        node['metricAmounts']['expenditure'] = node['amount']
        for key in ['allSourcesAmount', 'fundingBreakdownTotal']:
            if key in node: node[key] = float(Decimal(str(node[key])) + usd)
        refs = node.setdefault('metricSources', {}).setdefault('expenditure', {}).setdefault('extrabudgetary', [])
        refs.append(dict(source))
        if node['id'].startswith('section-13'):
            node['sources'] = {**node.get('sources', {}), 'extrabudgetary': dict(source)}
        for key in ['extrabudgetary', 'total_all_sources', 'selected_funding_sources']:
            record = node.get('breakdowns', {}).get(key)
            if record and record.get('childAmount') is not None:
                record['childAmount'] = float(Decimal(str(record['childAmount'])) + usd)
        # The ITC leaf has no children; its section now has the complete source
        # subtotal. Existing source discrepancies elsewhere remain unchanged.
        if node['id'] == 'section-13':
            node.setdefault('breakdowns', {})['extrabudgetary'] = {
                'childAmount': float(usd), 'difference': 0, 'outcome': 'exact', 'completeness': 'complete'}
        node = nodes.get(node['parentId'])
    payload['meta']['publishedUsdTotal'] = payload['meta']['total']
    payload['meta']['publishedChfTotal'] = int(amount)
    payload['meta']['total'] = nodes['whole']['amount']
    payload['meta']['metrics']['expenditure']['total'] = payload['meta']['total']
    payload['meta']['currencyNote'] = ('Charts, shares and totals use USD equivalents. ITC extrabudgetary expenditure printed in CHF is divided by the following year’s published UN budget rate, following the ARWO rate-year convention. Original CHF amounts and rate citations remain in the details. These are budget-rate equivalents, not PPB-reported USD expenditure.')
