"""Real-source parsing and adversarial refreshes must preserve accepted data."""
from __future__ import annotations

from copy import deepcopy
from datetime import date
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from bs4 import BeautifulSoup
import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
import sync_honour_roll as syncer

FIXTURES = Path(__file__).parent / "fixtures"
SOURCE = (FIXTURES / "honour-roll-2026-11-10.html").read_bytes()
BASELINE = json.loads((FIXTURES / "honour-roll-baseline-2026-08-18.json").read_text())
TODAY = date(2026, 11, 24)


def payment_row(soup, name):
    for row in soup.find_all("tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) == 4 and syncer.exporter.compact(cells[1].get_text()) == name:
            return row
    raise AssertionError(f"Fixture has no payment row for {name}")


def change_cell(name, column, text):
    soup = BeautifulSoup(SOURCE, "html.parser")
    payment_row(soup, name).find_all("td", recursive=False)[column].string = text
    return str(soup).encode()


class HonourRollSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "public/data"
        self.evidence = self.root / "evidence"
        self.diagnostics = self.root / "diagnostics"
        self.data.mkdir(parents=True)
        self.path = self.data / "regular-budget-contributors-2026.json"
        self.path.write_text(json.dumps(BASELINE, indent=2) + "\n")
        (self.data / "manifest.json").write_text(json.dumps({
            "regularBudgetContributors": {"years": [2019, 2025, 2026], "default": 2026},
        }))
        (self.data / "regular-budget-contributors-2025.json").write_text('historical sentinel\n')
        self.evidence.mkdir()
        (self.evidence / "honourroll-2026.html").write_bytes(b"previous accepted evidence")

    def files(self):
        return {str(path.relative_to(self.root)): (path.read_bytes(), path.stat().st_mtime_ns)
                for directory in (self.data, self.evidence)
                for path in directory.rglob("*") if path.is_file()}

    def run_sync(self, content=SOURCE, **kwargs):
        with patch.object(syncer, "fetch_current", return_value=content), patch("sys.stdout", new_callable=io.StringIO):
            return syncer.sync(self.data, self.evidence, today=TODAY,
                               diagnostics_dir=self.diagnostics, **kwargs)

    def assert_rejected(self, content=SOURCE):
        before = self.files()
        with self.assertRaises((ValueError, KeyError, TypeError)):
            self.run_sync(content)
        self.assertEqual(self.files(), before, "Failure changed published bytes, evidence or update timestamps")

    def test_live_source_adds_21_payers_resolves_typo_and_preserves_assessments(self):
        self.assertTrue(self.run_sync())
        result = json.loads(self.path.read_text())
        self.assertEqual(result["meta"]["as_of"], "2026-11-10")
        self.assertEqual(result["meta"]["paid_in_full_count"], 150)
        self.assertEqual(result["meta"]["paid_on_time_count"], 55)
        self.assertEqual(result["meta"]["paid_late_count"], 95)
        self.assertEqual(result["meta"]["not_paid_in_full_count"], 43)
        self.assertEqual(result["meta"]["amount_reconciliation"]["discrepancies"], [])
        for old, new in zip(BASELINE["contributors"], result["contributors"], strict=True):
            self.assertEqual({k: v for k, v in old.items() if k not in ("payment_status", "payment_date")},
                             {k: v for k, v in new.items() if k not in ("payment_status", "payment_date")})
        for key in ("assessment_source_control", "assessment_total", "due_date"):
            self.assertEqual(BASELINE["meta"][key], result["meta"][key])
        source = result["meta"]["sources"]["honour_roll"]
        self.assertEqual(source["sha256"], hashlib.sha256(SOURCE).hexdigest())
        self.assertEqual((self.evidence / "honourroll-2026.html").read_bytes(), SOURCE)
        self.assertIn("retrieved_at", source)

    def test_unchanged_semantics_does_not_touch_data_evidence_or_dates(self):
        self.run_sync()
        before = self.files()
        # Unrelated page markup may change daily; it is not a financial update.
        self.assertFalse(self.run_sync(SOURCE.replace(b"</body>", b"<!-- no financial change --></body>")))
        self.assertEqual(self.files(), before)

    def test_check_only_validates_candidate_without_any_publication(self):
        before = self.files()
        self.assertTrue(self.run_sync(check=True))
        self.assertEqual(self.files(), before)
        self.assertEqual(json.loads((self.diagnostics / "candidate.json").read_text())["meta"]["paid_in_full_count"], 150)

    def test_known_source_discrepancy_may_remain_but_must_not_change(self):
        self.run_sync(change_cell("Malaysia", 2, "10,371,474"))
        self.assertEqual(json.loads(self.path.read_text())["meta"]["amount_reconciliation"]["discrepancies"],
                         BASELINE["meta"]["amount_reconciliation"]["discrepancies"])

    def test_new_or_changed_amount_mismatches_fail_without_writes(self):
        for name, amount in [("Malaysia", "10,371,475"), ("Mozambique", "63,580")]:
            with self.subTest(name=name):
                self.assert_rejected(change_cell(name, 2, amount))

    def test_malformed_rows_amounts_and_dates_never_disappear(self):
        cases = [("Armenia", 0, "X"), ("Armenia", 0, "2"),
                 ("Armenia", 1, "Unrecognized State"), ("Armenia", 1, "United Kingdom"),
                 ("Armenia", 2, ""), ("Armenia", 2, "-222,702"),
                 ("Armenia", 2, "2,22,702"), ("Armenia", 2, "222702.0"),
                 ("Armenia", 3, "9-Jan-25"), ("Armenia", 3, "31-Feb-26"),
                 ("Armenia", 3, "9-Feb-26"), ("Kenya", 3, "8-Feb-26"),
                 ("Lebanon", 3, "25-Nov-26"), ("Mozambique", 3, "17-Aug-26")]
        for name, column, text in cases:
            with self.subTest(name=name, column=column, text=text):
                self.assert_rejected(change_cell(name, column, text))

    def test_missing_extra_and_malformed_rows_fail_even_with_valid_headline_count(self):
        for mutation in ("remove_cell", "extra_cell", "extra_row", "remove_row"):
            with self.subTest(mutation=mutation):
                soup = BeautifulSoup(SOURCE, "html.parser")
                row = payment_row(soup, "Armenia")
                if mutation == "remove_cell":
                    row.find_all("td")[-1].decompose()
                elif mutation == "extra_cell":
                    row.append(soup.new_tag("td"))
                elif mutation == "extra_row":
                    extra = soup.new_tag("tr")
                    cell = soup.new_tag("td")
                    cell.string = "Unrecognized source note"
                    extra.append(cell)
                    row.insert_after(extra)
                else:
                    row.decompose()
                self.assert_rejected(str(soup).encode())

    def test_section_and_headline_counts_are_independently_required(self):
        for old, new in [(b"150 Member States", b"149 Member States"),
                         (b"<strong>55</strong>", b"<strong>54</strong>"),
                         (b"<strong>95</strong>", b"<strong>94</strong>"),
                         (b"II. Subsequent", b"III. Subsequent"),
                         (b"I.    The following", b"Unrecognized heading"),
                         (b"8 February 2026", b"7 February 2026"),
                         (b"10 November 2026", b"25 November 2026")]:
            with self.subTest(old=old):
                self.assertNotEqual(SOURCE.replace(old, new), SOURCE)
                self.assert_rejected(SOURCE.replace(old, new))

    def test_unrecognized_orphan_cells_and_column_headers_fail(self):
        for mutation in ("orphan", "header"):
            soup = BeautifulSoup(SOURCE, "html.parser")
            table = soup.find("table")
            if mutation == "orphan":
                container = soup.new_tag("tbody")
                cell = soup.new_tag("td")
                cell.string = "A payment outside a row"
                container.append(cell)
                table.append(container)
            else:
                for cell in table.find_all("td"):
                    if "Net assessment" in cell.get_text() or "Net Assessment" in cell.get_text():
                        cell.string = "Unexpected accounting column"
            with self.subTest(mutation=mutation):
                self.assert_rejected(str(soup).encode())

    def test_previous_payment_cannot_be_revised(self):
        self.assert_rejected(change_cell("Armenia", 3, "10-Jan-26"))

    def test_previous_payment_cannot_be_removed_even_if_source_reconciles(self):
        soup = BeautifulSoup(SOURCE, "html.parser")
        payment_row(soup, "Armenia").decompose()
        # Keep the modified source internally consistent, including numbering.
        for row in soup.find("table").find_all("tr"):
            cells = row.find_all("td", recursive=False)
            if len(cells) == 4 and cells[1].get_text(strip=True) == "Kenya":
                break
            if len(cells) == 4 and cells[0].get_text().isdigit() and 2 <= int(cells[0].get_text()) <= 55:
                cells[0].string = str(int(cells[0].get_text()) - 1)
        content = str(soup).replace("150 Member States", "149 Member States").replace(
            "<strong>55</strong>", "<strong>54</strong>").encode()
        # This passes the source parser; only the comparison to accepted data catches it.
        self.assertEqual(len(syncer.exporter.parse_honour_roll_html(content, 2026, "source")[1]), 149)
        self.assert_rejected(content)

    def test_source_date_cannot_move_backwards(self):
        baseline = deepcopy(BASELINE)
        baseline["meta"]["as_of"] = "2026-11-11"
        self.path.write_text(json.dumps(baseline))
        self.assert_rejected()

    def test_wrong_year_block_pages_truncation_and_duplicate_tables_fail(self):
        for content in (SOURCE.replace(b"2026", b"2027"), b"<html>Access denied</html>",
                        SOURCE[:10000], SOURCE + SOURCE):
            with self.subTest(size=len(content)):
                self.assert_rejected(content)

    def test_invalid_baselines_and_unapproved_years_fail_before_fetch(self):
        for mutation in ("roster", "rates", "dollars", "counts", "year", "discrepancy"):
            baseline = deepcopy(BASELINE)
            if mutation == "roster":
                baseline["contributors"].pop()
            elif mutation == "rates":
                baseline["contributors"][0]["assessment_rate"] += 1
            elif mutation == "dollars":
                baseline["contributors"][0]["assessment_amount"] += 1
            elif mutation == "counts":
                baseline["meta"]["paid_in_full_count"] += 1
            elif mutation == "year":
                baseline["meta"]["year"] = 2027
            else:
                baseline["meta"]["amount_reconciliation"]["discrepancies"][0]["assessment_document_amount"] += 1
            self.path.write_text(json.dumps(baseline))
            before = self.files()
            with self.subTest(mutation=mutation), patch.object(syncer, "fetch_current") as fetch:
                with self.assertRaises((ValueError, KeyError, TypeError)):
                    syncer.sync(self.data, self.evidence, today=TODAY)
                fetch.assert_not_called()
                self.assertEqual(self.files(), before)
        before = self.files()
        with patch.object(syncer, "fetch_current") as fetch, self.assertRaisesRegex(ValueError, "annual setup"):
            syncer.sync(self.data, self.evidence, today=date(2027, 1, 1))
        fetch.assert_not_called()
        self.assertEqual(self.files(), before)

    def test_http_failure_and_cli_exit_do_not_publish(self):
        before = self.files()
        argv = ["sync_honour_roll.py", "--data-dir", str(self.data),
                "--evidence-dir", str(self.evidence), "--diagnostics-dir", str(self.diagnostics)]
        with patch.object(syncer, "fetch_current", side_effect=requests.Timeout("source timed out")), \
                patch.object(syncer, "datetime") as clock, patch.object(sys, "argv", argv), \
                patch("sys.stderr", new_callable=io.StringIO) as errors:
            clock.now.return_value.date.return_value = TODAY
            self.assertEqual(syncer.main(), 1)
        self.assertIn("FAILED", errors.getvalue())
        self.assertIn("source timed out", (self.diagnostics / "error.txt").read_text())
        self.assertEqual(self.files(), before)

    def test_fetch_failure_and_failed_atomic_replacement_preserve_last_good_json(self):
        before = self.files()
        with patch.object(syncer, "fetch_current", side_effect=requests.ConnectionError("network down")):
            with self.assertRaises(requests.ConnectionError):
                syncer.sync(self.data, self.evidence, today=TODAY)
        self.assertEqual(self.files(), before)
        real_replace = syncer.os.replace

        def fail_public_write(source, destination):
            if destination == self.path:
                raise OSError("disk full")
            return real_replace(source, destination)

        with patch.object(syncer.os, "replace", side_effect=fail_public_write), self.assertRaises(OSError):
            self.run_sync()
        self.assertEqual(self.path.read_bytes(), before[str(self.path.relative_to(self.root))][0])
        self.assertEqual(sorted(path.name for path in self.data.iterdir()),
                         ["manifest.json", "regular-budget-contributors-2025.json", "regular-budget-contributors-2026.json"])

    def test_concurrent_local_edits_are_not_overwritten(self):
        def concurrent_edit():
            self.path.write_bytes(b"a concurrent edit")
            return SOURCE
        with patch.object(syncer, "fetch_current", side_effect=concurrent_edit), self.assertRaisesRegex(ValueError, "changed during sync"):
            syncer.sync(self.data, self.evidence, today=TODAY)
        self.assertEqual(self.path.read_bytes(), b"a concurrent edit")


class HonourRollFetchTests(unittest.TestCase):
    def test_official_html_fixture_keeps_its_archived_bytes(self):
        self.assertEqual(hashlib.sha256(SOURCE).hexdigest(),
                         "78278a49ebb8f8126634b9cbafd691c96c4e287ee1f68cb031e759dc793df5e5")

    def test_source_errors_are_not_replaced_with_cached_or_partial_data(self):
        cases = [({"Content-Type": "application/json"}, "https://www.un.org/en/ga/contributions/honourroll.shtml", [SOURCE], None),
                 ({"Content-Type": "text/html"}, "https://other.example/", [SOURCE], None),
                 ({"Content-Type": "text/html"}, syncer.exporter.HONOUR_ROLL_CURRENT_URL, [b"x" * 2_000_001], None),
                 ({"Content-Type": "text/html"}, syncer.exporter.HONOUR_ROLL_CURRENT_URL, [SOURCE], requests.HTTPError("403"))]
        for headers, url, chunks, error in cases:
            with self.subTest(url=url, error=error), patch.object(syncer.requests, "Session") as session:
                response = session.return_value.__enter__.return_value.get.return_value.__enter__.return_value
                response.headers, response.url = headers, url
                response.iter_content.return_value = chunks
                response.raise_for_status.side_effect = error
                with self.assertRaises((ValueError, requests.HTTPError)):
                    syncer.fetch_current()

    def test_html_response_is_accepted(self):
        with patch.object(syncer.requests, "Session") as session:
            response = session.return_value.__enter__.return_value.get.return_value.__enter__.return_value
            response.headers = {"Content-Type": "text/html; charset=utf-8"}
            response.url = syncer.exporter.HONOUR_ROLL_CURRENT_URL
            response.iter_content.return_value = [SOURCE[:100], SOURCE[100:]]
            self.assertEqual(syncer.fetch_current(), SOURCE)


if __name__ == "__main__":
    unittest.main()
