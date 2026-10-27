"""Independent source controls and regressions for the four-entity XB adapter."""
from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
import json
from pathlib import Path
import sys
import tempfile
import unittest

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import secretariat_xb_sources as xb

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / 'data/trust-fund-source-candidates'


class AmountTests(unittest.TestCase):
    def test_pdf_page_links_preserve_query_and_existing_fragment(self):
        self.assertEqual(xb.pdf_page_url('https://example.org/report.pdf?version=1', 2),
                         'https://example.org/report.pdf?version=1#page=2')
        self.assertEqual(xb.pdf_page_url('https://example.org/report.pdf#page=9&zoom=100', 4),
                         'https://example.org/report.pdf#zoom=100&page=4')
        for page in [0, -1, True, 1.5]:
            with self.subTest(page=page), self.assertRaises(ValueError):
                xb.pdf_page_url('https://example.org/report.pdf', page)

    def test_exact_units_parentheses_and_missingness(self):
        self.assertEqual(xb.amount('(14 715)'), ('-14715000', False))
        self.assertEqual(xb.amount('78.9'), ('78900.0', False))
        self.assertEqual(xb.amount('12.233', dot_grouping=True), ('12233000', False))
        self.assertEqual(xb.amount('10,000', unit=1), ('10000', False))
        self.assertEqual(xb.amount('−'), ('0', True))
        with self.assertRaises(Exception):
            xb.amount('')  # A blank is not an observed zero.


class SourceCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Run the full extraction, not a precomputed result, into an isolated output.
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        cls.manifest = json.loads((SOURCES / 'source-manifest.json').read_text())
        for s in cls.manifest:
            s['local_path'] = str(REPO / s['local_path'])
        (cls.root / 'source-manifest.json').write_text(json.dumps(cls.manifest))
        cls.report = xb.extract(cls.root)
        cls.facts = pd.read_csv(cls.root / 'stage2/statement-facts.csv', dtype={'amount_usd': str})
        cls.contributors = pd.read_csv(cls.root / 'stage2/contributor-observations.csv', dtype={'amount_usd': str})

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def fact(self, source_id, object_id, metric):
        matches = self.facts[(self.facts.source_id == source_id) &
                             (self.facts.object_id == object_id) & (self.facts.metric == metric)]
        self.assertEqual(len(matches), 1)
        return matches.iloc[0]

    def test_manifest_rejects_wrong_session_and_url(self):
        for field in ['document_symbol', 'url']:
            bad = deepcopy(self.manifest[0])
            bad[field] = bad[field].replace('79', '2079')
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'Wrong session'):
                xb.inspect_manifest([bad])

    def test_wrapped_ota_cell_does_not_absorb_annex_total(self):
        row = self.fact('unep-accounts-2023', 'UNEP:account:OTA', 'expenses')
        self.assertEqual(Decimal(row.amount_usd), Decimal(27546000))
        opening = self.fact('unep-accounts-2023', 'UNEP:account:OTA', 'opening_accumulated_surplus')
        self.assertEqual(Decimal(opening.amount_usd), Decimal(24054000))
        self.assertLess(opening.source_y, row.source_y)

    def test_footer_does_not_hide_bal_account(self):
        row = self.fact('unep-accounts-2023', 'UNEP:account:BAL', 'expenses')
        self.assertEqual(Decimal(row.amount_usd), Decimal(270000))
        self.assertNotIn('135/140', row.reported_label)

    def test_blank_movement_retains_other_ael_facts(self):
        row = self.fact('unep-accounts-2024', 'UNEP:account:AEL', 'surplus_movements')
        self.assertTrue(pd.isna(row.amount_usd))
        self.assertTrue(row.reported_as_blank)
        expense = self.fact('unep-accounts-2024', 'UNEP:account:AEL', 'expenses')
        self.assertEqual(Decimal(expense.amount_usd), Decimal(5012000))

    def test_independent_entity_expense_controls(self):
        expected = {'unep-accounts-2024': 808064000,
                    'un-habitat-accounts-2024': 172645000,
                    'unodc-accounts-2024': 447618000}
        controls = pd.read_csv(self.root / 'stage2/derived-xb-controls.csv')
        for sid, total in expected.items():
            rows = controls[(controls.source_id == sid) & (controls.period_year == 2024)]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows.iloc[0].amount_usd, total)
        itc = self.fact('itc-financial-report-2024', 'ITC:entity:XB', 'gross_xb_expenditure')
        self.assertEqual(Decimal(itc.amount_usd), Decimal(117300000))
        self.assertEqual(itc.pdf_page, 2)
        self.assertEqual(itc.source_page_url,
            'https://digitallibrary.un.org/record/4090394/files/A_80_5_Vol-III-ch-IV.pdf?version=1#page=2')

    def test_every_pdf_observation_has_a_direct_page_link(self):
        for frame in [self.facts, self.contributors]:
            for row in frame.itertuples():
                self.assertEqual(row.source_page_url, xb.pdf_page_url(row.source_url, row.pdf_page))
        derived = pd.read_csv(self.root / 'stage2/derived-xb-controls.csv')
        for refs in derived.supporting_sources:
            citations = json.loads(refs)
            self.assertEqual(len(citations), 2)
            for ref in citations:
                self.assertEqual(ref['page_url'], xb.pdf_page_url(ref['url'], ref['pdf_page']))

    def test_contributor_name_and_measure_are_preserved(self):
        self.assertEqual(set(self.contributors.metric),
                         {'xb_funding_received', 'reported_contribution_status'})
        rows = self.contributors[self.contributors.counterparty_reported ==
            'United Kingdom of Great Britain and Northern Ireland']
        self.assertEqual(len(rows), 6)
        self.assertEqual(set(rows.basis), {'source_defined_funding_received'})
        japan = self.contributors[self.contributors.counterparty_reported == 'Japanb']
        self.assertTrue((japan.counterparty == 'Japan').all())
        grouped = self.contributors[self.contributors.counterparty_reported.str.startswith('United Nations entities')]
        self.assertFalse(grouped.empty)
        self.assertTrue(grouped.is_grouped_counterparty.all())

    def test_source_residuals_do_not_become_contributors(self):
        warnings = [w for w in self.report['warnings'] if w['type'] == 'source_contributor_total_difference']
        self.assertEqual({Decimal(w['difference_usd']) for w in warnings}, {Decimal(-68100)})
        self.assertEqual(len(warnings), 2)
        self.assertFalse(self.contributors.counterparty.str.contains('residual', case=False).any())

    def test_tampered_expense_fails_validation(self):
        facts = self.facts.where(pd.notna(self.facts), None).to_dict('records')
        rows = self.contributors.where(pd.notna(self.contributors), None).to_dict('records')
        for row in facts:
            if row['source_id'] == 'unep-accounts-2024' and row['object_id'] == 'UNEP:account:FEL' and row['metric'] == 'expenses':
                row['amount_usd'] = str(Decimal(row['amount_usd']) + 1000000)
        with self.assertRaisesRegex(ValueError, 'fund_net_asset_equation'):
            xb.validate(facts, rows, self.manifest)

    def test_existing_arwo_totals_remain_independent(self):
        controls = pd.read_csv(self.root / 'stage2/arwo-controls.csv')
        self.assertEqual(len(controls), 28)
        self.assertEqual(set(controls.period_year), set(range(2019, 2026)))
        self.assertEqual(set(controls.reporting_entity), {'UNEP','UNODC','UN-HABITAT','ITC'})
        self.assertTrue(controls.not_independent_audit_verification.all())


if __name__ == '__main__':
    unittest.main()
