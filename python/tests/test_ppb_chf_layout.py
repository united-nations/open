"""Source-currency values, area-only conversions, and main-view year policy."""
from decimal import Decimal
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

    def test_every_chf_control_is_original_and_added_once_to_area(self):
        controls = read('data/ppb-chf-source-controls.json')
        rates = read('data/un-chf-operational-rates.json')
        for control in controls:
            year=control['expenditureYear']
            data=read(f'public/data/budget-ppb-expenditure-{year}.json')
            node=next(n for n in data['nodes'] if n['tier']=='budget_unit' and n.get('entity',{}).get('acronym')=='ITC')
            chf=node['chf']
            self.assertEqual(chf['amount'],control['amountChf'])
            self.assertEqual(chf['sourceCell'],control['sourceCell'])
            self.assertEqual(chf['source']['pdfPage'],control['pdfPage'])
            rate=Decimal(annual_usd_per_chf(rates['rates'],year))
            self.assertEqual(str(rate),chf['usdPerChf'])
            expected=(Decimal(chf['amount'])*rate).quantize(Decimal('0.01'))
            self.assertEqual(Decimal(str(chf['usdForLayout'])),expected)
            self.assertEqual(node['values']['extrabudgetary'],float(expected))
            root=next(n for n in data['nodes'] if n['parentId'] is None)
            self.assertEqual(root['chf'],chf)
            self.assertAlmostEqual(data['meta']['total']-data['meta']['publishedUsdTotal'],float(expected),places=4)
            self.assertEqual(data['meta']['publishedChfTotal'],chf['amount'])
            # Budget views continue to use the UN grant in USD; no full ITC
            # regular budget (including WTO's share) is imported from CHF tables.
            for metric,offset in [('approved',1),('proposed',2)]:
                budget=read(f'public/data/budget-ppb-{metric}-{year+offset}.json')
                self.assertTrue(all('chf' not in n for n in budget['nodes']))
                self.assertEqual(budget['meta']['fundingSources'],['regular_budget'])
