"""Printed CHF evidence, consistent USD conversions, and main-view year policy."""
from decimal import Decimal, ROUND_HALF_UP
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'python'))
from fetch_un_chf_rates import annual_usd_per_chf

def read(path): return json.loads((ROOT / path).read_text())

class CHFCoverageTest(unittest.TestCase):
    def test_main_ranges_keep_partial_years_separate(self):
        manifest = read('public/data/manifest.json')
        for key, start, stop, earlier in [('budgetPpb',2019,2025,2018), ('budgetPpbApproved',2020,2026,2019), ('budgetPpbProposed',2021,2027,2020)]:
            self.assertEqual(manifest[key]['years'],list(range(start,stop+1)))
            self.assertEqual(manifest[key]['default'],stop)
            self.assertEqual(manifest[key]['earlierPartialYears'],[earlier])

    def test_operational_rate_inverse_and_leap_year_weighting(self):
        rows=[{'effectiveDate':'2019-12-01','chfPerUsd':'1'},
              {'effectiveDate':'2020-07-01','chfPerUsd':'2'},
              {'effectiveDate':'2021-01-01','chfPerUsd':'3'}]
        self.assertAlmostEqual(Decimal(annual_usd_per_chf(rows,2020)),(Decimal(182)+Decimal(184)/2)/366)
        with self.assertRaises(ValueError): annual_usd_per_chf(rows,2021)

    def test_every_chf_control_is_original_and_converted_once_for_all_values(self):
        controls = read('data/ppb-chf-source-controls.json')
        rates = read('data/un-chf-budget-rates.json')
        reviewed = ['0.9740', '0.8960', '0.9235', '0.9272', '0.8758', '0.8220', '0.7737']
        for control in controls:
            year=control['expenditureYear']
            data=read(f'public/data/budget-ppb-expenditure-{year}.json')
            node=next(n for n in data['nodes'] if n['tier']=='budget_unit' and n.get('entity',{}).get('acronym')=='ITC')
            chf=node['chf']
            self.assertEqual(chf['amount'],control['amountChf'])
            self.assertEqual(chf['sourceCell'],control['sourceCell'])
            self.assertEqual(chf['source']['pdfPage'],control['pdfPage'])
            rate=rates['ratesByBudgetYear'][str(year+1)]
            self.assertEqual(rate['chfPerUsd'],reviewed[year-2019])
            self.assertEqual(chf['rateYear'],year+1)
            self.assertEqual(chf['chfPerUsd'],rate['chfPerUsd'])
            self.assertEqual(chf['rateSource']['symbol'],rate['symbol'])
            self.assertEqual(chf['rateSource']['pdfPage'],rate['pdfPage'])
            expected=(Decimal(chf['amount'])/Decimal(rate['chfPerUsd'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            self.assertEqual(Decimal(str(chf['usdEquivalent'])),expected)
            self.assertEqual(node['values']['extrabudgetary'],float(expected))
            self.assertAlmostEqual(node['amount'],node['publishedUsdAmount']+float(expected))
            for ancestor in [n for n in data['nodes'] if n.get('chf')]:
                self.assertEqual(ancestor['chf'],chf)
                self.assertAlmostEqual(ancestor['amount'],ancestor['publishedUsdAmount']+float(expected),places=4)
                self.assertEqual(ancestor['amount'],ancestor['metricAmounts']['expenditure'])
                self.assertEqual(ancestor['values'],ancestor['metricValues']['expenditure'])
            root=next(n for n in data['nodes'] if n['parentId'] is None)
            self.assertEqual(root['chf'],chf)
            self.assertAlmostEqual(data['meta']['total']-data['meta']['publishedUsdTotal'],float(expected),places=4)
            self.assertEqual(data['meta']['publishedChfTotal'],chf['amount'])
            self.assertEqual(read(f'public/data/budget-ppb-{year}.json'),data)
            # Budget views continue to use the UN grant in USD; no full ITC
            # regular budget (including WTO's share) is imported from CHF tables.
            for metric,offset in [('approved',1),('proposed',2)]:
                budget=read(f'public/data/budget-ppb-{metric}-{year+offset}.json')
                self.assertTrue(all('chf' not in n for n in budget['nodes']))
                self.assertEqual(budget['meta']['fundingSources'],['regular_budget'])

    def test_2025_uses_current_operands_in_correct_direction(self):
        data=read('public/data/budget-ppb-expenditure-2025.json')
        root=next(n for n in data['nodes'] if n['parentId'] is None)
        self.assertEqual(root['chf']['usdEquivalent'],141411529.02)
        self.assertEqual(root['values']['extrabudgetary'],8353896029.02)
        self.assertEqual(data['meta']['total'],12226482729.02)
