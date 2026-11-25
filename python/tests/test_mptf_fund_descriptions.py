"""Description boundaries and provenance are separate from annual money."""
from pathlib import Path
import sys
import tempfile
import gzip
import hashlib
import json
import unittest
from unittest.mock import patch, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import mptf_fund_descriptions as descriptions
from mptf_fund_descriptions import extract_description


class FundDescriptionTests(unittest.TestCase):
    def test_uses_profile_metadata_and_ignores_donation_and_navigation_copy(self):
        html = b'<html><head><meta name="description" content="This fund supports joint programmes that protect forests and improve livelihoods. Click to donate."></head><body><nav>About us</nav><h1>Forest Fund</h1><p>Other project information</p></body></html>'
        text = extract_description(html)
        self.assertEqual(text, "This fund supports joint programmes that protect forests and improve livelihoods.")

    def test_missing_and_error_pages_do_not_receive_invented_descriptions(self):
        self.assertIsNone(extract_description(b'<h1>Unknown fund</h1>'))
        self.assertIsNone(extract_description(b'<meta name="description" content="The Gateway is the United Nations centre of expertise on pooled funding."><h1>Page not found</h1>'))

    def test_export_retains_full_description_for_expansion(self):
        text = " ".join(f"word{i}" for i in range(90)) + ". Further details remain part of the introduction."
        raw = f'<h1>Forest Fund</h1><meta name="description" content="{text}">'.encode()
        with tempfile.TemporaryDirectory() as tmp, patch.object(descriptions, "DATA", Path(tmp)):
            root = Path(tmp)
            (root / "fund-pages").mkdir()
            (root / "fund-pages/FOR00.html.gz").write_bytes(gzip.compress(raw))
            (root / "fund-description-sources.json").write_text(json.dumps({"FOR00": {"status": "retrieved", "url": "https://mptf.undp.org/fund/for00", "retrievedAt": "2026-11-24", "sha256": hashlib.sha256(raw).hexdigest()}}))
            descriptions.export_descriptions()
            output = json.loads((root / "fund-descriptions.json").read_text())
            self.assertEqual(output["FOR00"]["description"], text)
            self.assertNotIn("…", output["FOR00"]["description"])

    def test_clean_checkout_replays_metadata_without_html_cache(self):
        metadata = {
            "heading": "Forest Fund",
            "description": "This fund supports joint programmes that protect forests and improve livelihoods. Click to donate.",
        }
        with tempfile.TemporaryDirectory() as tmp, patch.object(descriptions, "DATA", Path(tmp)):
            root = Path(tmp)
            (root / "fund-profile-metadata.json").write_text(json.dumps({"FOR00": metadata}))
            (root / "fund-description-sources.json").write_text(json.dumps({"FOR00": {
                "status": "retrieved", "url": "https://mptf.undp.org/fund/for00",
                "retrievedAt": "2026-11-24", "sha256": "original-html-hash",
                "metadataSha256": descriptions.metadata_hash(metadata),
            }}))
            descriptions.export_descriptions()
            output = json.loads((root / "fund-descriptions.json").read_text())
            self.assertEqual(output["FOR00"]["description"], "This fund supports joint programmes that protect forests and improve livelihoods.")
            self.assertFalse((root / "fund-pages").exists())
            # The canonical source retains the CTA for future extraction rules.
            self.assertEqual(json.loads((root / "fund-profile-metadata.json").read_text())["FOR00"], metadata)
            metadata["description"] = "A changed source must not pass the retained evidence hash."
            (root / "fund-profile-metadata.json").write_text(json.dumps({"FOR00": metadata}))
            with self.assertRaisesRegex(ValueError, "metadata changed"):
                descriptions.export_descriptions()
            self.assertEqual(json.loads((root / "fund-descriptions.json").read_text()), output)

    def test_success_status_error_page_does_not_overwrite_retained_profile(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(descriptions, "DATA", Path(tmp)):
            path = Path(tmp) / "fund-pages/PB000.html.gz"
            path.parent.mkdir()
            previous = b"retained certified profile snapshot"
            path.write_bytes(previous)
            response = Mock()
            response.geturl.return_value = "https://mptf.undp.org/fund/pb000"
            response.read.return_value = b'<meta name="description" content="Generic Gateway information and tools for UN pooled funding."><h1>Page not found</h1>'
            with patch.object(descriptions.urllib.request, "urlopen", return_value=response):
                _, record = descriptions.fetch_profile(("PB000", response.geturl.return_value))
            self.assertEqual(record["status"], "no_introduction")
            self.assertEqual(path.read_bytes(), previous)


if __name__ == "__main__":
    unittest.main()
