"""Independent source/scope regressions for explicitly reported fund positions."""
from pathlib import Path
import sys,json,csv,unittest
REPO=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(REPO/'python'))
from secretariat_xb_fund_positions import fund_positions,extract,extract_itc_reserves
STAGE2=REPO/'data/trust-fund-source-candidates/stage2'

class FundPositionTests(unittest.TestCase):
    def metric(self,year,code,key):
        position=fund_positions('UN-HABITAT',year,STAGE2)['UN-HABITAT:segment:'+code]
        return next(m for m in position['metrics'] if m['key']==key)

    def test_only_five_named_habitat_funding_segments_returned(self):
        for year in [2023,2024]:
            result=fund_positions('UN-HABITAT',year,STAGE2)
            self.assertEqual(set(result),{'UN-HABITAT:segment:'+c for c in ['FNDN','FNDE','TECH','PSC','BEN']})
            self.assertTrue(all(p['asOf']==f'{year}-12-31' for p in result.values()))
            self.assertTrue(all('before intersegment eliminations' in p['scopeNote'] for p in result.values()))

    def test_independent_foundation_current_year_amounts(self):
        expected={'cash':966000,'investments':7923000,'contributionsReceivable':1150000,
                  'totalAssets':10312000,'totalLiabilities':1163000,'netAssets':9149000}
        for key,amount in expected.items():self.assertEqual(self.metric(2024,'FNDN',key)['amount'],amount)

    def test_technical_cooperation_receivables_and_investments_combine_exact_components(self):
        self.assertEqual(self.metric(2024,'TECH','investments')['amount'],169006000)
        self.assertEqual([m['amount'] for m in self.metric(2024,'TECH','investments')['components']],[123747000,45259000])
        self.assertEqual(self.metric(2024,'TECH','contributionsReceivable')['amount'],201499000)
        self.assertEqual(self.metric(2024,'TECH','conditionalLiabilities')['amount'],68413000)
        self.assertEqual(self.metric(2024,'TECH','totalAssets')['amount'],438764000)
        self.assertEqual(self.metric(2024,'TECH','totalLiabilities')['amount'],79675000)
        self.assertEqual(self.metric(2024,'TECH','netAssets')['amount'],359089000)

    def test_signed_benefit_fund_net_position_not_clamped(self):
        self.assertEqual(self.metric(2024,'BEN','netAssets')['amount'],-12479000)
        self.assertEqual(self.metric(2023,'BEN','netAssets')['amount'],-15857000)

    def test_own_report_year_not_comparative_total_used(self):
        metric=self.metric(2023,'TECH','netAssets')
        self.assertEqual(metric['amount'],313640000)
        self.assertTrue(all(r['symbol']=='A/79/5/Add.9' and r['pdfPage']==101 for r in metric['supportingSources']))
        current=self.metric(2024,'TECH','netAssets')
        self.assertTrue(all(r['symbol']=='A/80/5/Add.9' and r['pdfPage']==82 for r in current['supportingSources']))

    def test_components_have_distinct_source_section_and_fund_column(self):
        refs=self.metric(2024,'FNDN','investments')['supportingSources']
        self.assertEqual(len(refs),2)
        self.assertEqual({r['rowLabel'] for r in refs},{'Current assets > Investments','Non-current assets > Investments'})
        self.assertTrue(all(r['columnHeader']=='Foundation non-earmarked — 2024' for r in refs))
        self.assertTrue(all(r['pdfPage']==81 and r['pdfPageScope']=='row' for r in refs))

    def test_no_whole_entity_or_rb_inclusive_substitution(self):
        for entity in ['UNODC','ITC','UNEP']:
            self.assertEqual(fund_positions(entity,2024,STAGE2),{})
        self.assertEqual(fund_positions('UN-HABITAT',2022,STAGE2),{})

    def test_validation_and_limited_reserves_never_become_positions(self):
        folder=STAGE2.parent/'fund-position-research'
        quality=json.loads((folder/'quality-profile.json').read_text())
        self.assertEqual(quality['status'],'passed')
        self.assertEqual(len(quality['checks']),93)
        with (folder/'itc-operating-reserve-facts.csv').open() as handle:
            reserves=list(csv.DictReader(handle))
        current=[r for r in reserves if r['report_year']==r['period_year']]
        values={(int(r['period_year']),r['object_id']):int(r['amount_usd']) for r in current}
        self.assertEqual(values[(2023,'ITC:fund_family:ITF')],18480000)
        self.assertEqual(values[(2024,'ITC:fund_family:ITF')],23748000)
        self.assertEqual(values[(2024,'ITC:fund_family:PSC')],2020000)
        self.assertEqual(values[(2024,'ITC:validation:FAIR')],-199000)
        self.assertFalse(json.loads((folder/'itc-reserve-quality.json').read_text())['publish_as_financial_position'])

if __name__=='__main__':unittest.main()
