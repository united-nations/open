"""Independent controls for source-specific donor measures and UNEP nesting."""
import json
from pathlib import Path
import sys
import unittest
from decimal import Decimal

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from secretariat_xb_contributors import build_contributors, unodc_series
from secretariat_xb_frontend import read_csv
from secretariat_xb_hierarchy import unep_hierarchy

ROOT=Path(__file__).resolve().parents[2]
STAGE2=ROOT/'data/trust-fund-source-candidates/stage2'


class ContributorMeasuresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.series=build_contributors(STAGE2)['series']+unodc_series(STAGE2)

    def series_for(self,entity,year,scope='entity'):
        return next(s for s in self.series if (s['entity'],s['year'],s['scope'])==(entity,year,scope))

    def test_itc_window_components_not_added_to_total_column(self):
        series=self.series_for('ITC',2023)
        self.assertEqual(series['reportedTotal'],117669000)
        self.assertEqual(series['rowTotal'],117669000)
        self.assertEqual(sum(r['amount'] for r in series['otherCategories']),208000)
        self.assertEqual(series['contributorTotal'],117461000)
        self.assertNotIn('Revolving funds',[r['name'] for r in series['rows']])
        self.assertFalse(any(s['entity']=='ITC' and s['year']==2024 for s in self.series))

    def test_habitat_discrepancy_and_grouped_labels_preserved(self):
        series=self.series_for('UN-HABITAT',2023)
        self.assertEqual(series['difference'],68100)
        self.assertTrue(any(r['needsReview'] for r in series['rows']))
        self.assertTrue(any(r['grouped'] for r in series['rows']))
        self.assertFalse(any(r['name']=='Other' for r in series['rows']))
        current=self.series_for('UN-HABITAT',2024)
        self.assertEqual(current['reportedTotal'],188998820)
        self.assertEqual(current['difference'],0)

    def test_historical_core_rows_use_one_vintage_and_partial_label(self):
        series=self.series_for('UN-HABITAT',2022)
        self.assertTrue(any('Partial historical coverage' in n for n in series['notes']))
        self.assertTrue(all(c['id']=='UN-HABITAT:segment:FNDN' for row in series['rows'] for c in row['components']))
        self.assertTrue(all('2501145e.pdf' in src['url'] for row in series['rows'] for src in row['sources']))

    def test_unep_contributors_are_excluded_from_published_bundle(self):
        published=json.loads((ROOT/'public/data/secretariat-xb-contributors.json').read_text())
        self.assertFalse(any(s['entity']=='UNEP' for s in published['series']))
        self.assertEqual({s['entity'] for s in published['series']},{'UN-HABITAT','ITC','UNODC'})

    def test_unodc_pledges_match_control_without_fabricated_2024_pillar_split(self):
        current=self.series_for('UNODC',2024)
        self.assertEqual(current['rowTotal'],519320861)
        self.assertEqual(current['difference'],0)
        self.assertEqual(len(current['rows']),80) # labels, not underlying donor count
        self.assertTrue(any(r['grouped'] for r in current['rows']))
        self.assertTrue(all(c['label'] in ['General Purpose','Special Purpose'] for row in current['rows'] for c in row['components']))
        prior=self.series_for('UNODC',2023)
        self.assertEqual(Decimal(str(prior['rowTotal'])),Decimal('453853084.35'))
        self.assertEqual(Decimal(str(prior['difference'])),Decimal('16382.65'))
        self.assertEqual(prior['measure'],'Pledged contributions')

    def test_all_series_have_unique_counterparties_and_original_sources(self):
        keys=set()
        for s in self.series:
            key=s['entity'],s['year'],s['scope']
            self.assertNotIn(key,keys);keys.add(key)
            self.assertEqual(len({r['name'] for r in s['rows']}),len(s['rows']))
            for r in s['rows']:
                self.assertTrue(r['sources'])
                for source in r['sources']:
                    self.assertTrue(source['url'].startswith('https://'))
                    self.assertTrue(source['rowLabel'])
                    if 'pdfPage' in source:self.assertGreater(source['pdfPage'],0)


class UNEPHierarchyTests(unittest.TestCase):
    def hierarchy(self,year=2024):
        facts=read_csv(STAGE2/'statement-facts.csv')
        accounts=[dict(id='xb:'+r['object_id'],parentId='xb-entity:UNEP',amount=int(Decimal(r['amount_usd'])))
                  for r in facts if r['source_id']==f'unep-accounts-{year}' and r['metric']=='expenses' and r['object_kind']=='fund_account']
        groups=unep_hierarchy(facts,f'unep-accounts-{year}',accounts,'xb-entity:UNEP')
        return accounts,groups

    def test_printed_caribbean_and_biodiversity_subtotals(self):
        accounts,groups=self.hierarchy()
        ids={n['id']:n for n in [*accounts,*groups]}
        caribbean=ids['xb:UNEP:annex:III:group:caribbean_environment_programme']
        self.assertEqual(caribbean['amount'],2021000)
        self.assertEqual(caribbean['source']['pdfPage'],135)
        self.assertEqual({n['id'].split(':')[-1] for n in accounts if n['parentId']==caribbean['id']},{'QCL','CRL'})
        cbd=ids['xb:UNEP:annex:III:group:convention_on_biological_diversity']
        self.assertEqual(cbd['amount'],33666000)
        self.assertEqual(len([n for n in accounts if n['parentId']==cbd['id']]),6)
        self.assertEqual(ids['xb:UNEP:account:FEL']['parentId'],'xb:UNEP:annex:I')

    def test_no_lost_duplicate_or_reallocated_accounts_across_pages(self):
        for year,count,gross in [(2023,132,757902000),(2024,133,921521000)]:
            accounts,groups=self.hierarchy(year)
            self.assertEqual(len(accounts),count)
            self.assertEqual(len({n['id'] for n in accounts}),count)
            # All six annex parents and the PDF's 17 named subgroups exist.
            self.assertEqual(len(groups),23)
            group_ids={g['id'] for g in groups}
            self.assertTrue(all(n['parentId'] in group_ids for n in accounts))
            if year==2024:self.assertEqual(sum(n['amount'] for n in accounts),gross)
            self.assertTrue(all(g['basis']=='directly_printed' for g in groups))
            self.assertTrue(all(abs(g['detailRoundingDifference'])<=3000 for g in groups))
