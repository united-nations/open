"""Protect HR source grain, population and unknown-value semantics."""
from collections import Counter, defaultdict
import csv
from copy import deepcopy
from hashlib import sha256
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))
spec = importlib.util.spec_from_file_location("ceb_personnel", ROOT / "python/27-export_ceb_personnel.py")
personnel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(personnel)


class PersonnelValidationTests(unittest.TestCase):
    def parse(self, text):
        return personnel.parse_source("organization", text.encode("utf-8-sig"))

    def test_missing_count_is_not_zero_and_negative_fractional_counts_fail(self):
        for count in ("", "NA", "-1", "1.5"):
            with self.subTest(count=count), self.assertRaisesRegex(ValueError, "count"):
                self.parse(f"YEAR,ORG,ENTITY,COUNT\n2025,UN,NA,{count}\n")
        self.assertEqual(self.parse("YEAR,ORG,ENTITY,COUNT\n2025,UN,NA,0\n")[0]["COUNT"], 0)

    def test_duplicate_dimension_key_is_rejected_even_if_counts_differ(self):
        with self.assertRaisesRegex(ValueError, "duplicate dimension key"):
            self.parse("YEAR,ORG,ENTITY,COUNT\n2025,UN,OCHA,7\n2025,UN,OCHA,9\n")

    def test_schema_drift_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "unexpected columns"):
            self.parse("YEAR,ORG,COUNT\n2025,UN,7\n")

    def test_unknown_entity_is_an_additive_leaf_not_a_parent_total(self):
        rows = self.parse("YEAR,ORG,ENTITY,COUNT\n2025,UN,OCHA,7\n2025,UN,NA,3\n2025,UN,UNEP,11\n")
        sources = {name: [] for name in personnel.HEADERS}
        sources["organization"] = rows
        result = personnel.build_year(sources, 2025)
        self.assertEqual(result["total"], 21)
        self.assertEqual(result["organizations"], [{"org": "UN Secretariat", "sourceOrg": "UN", "total": 21,
                                                   "entities": [{"entity": "OCHA", "count": 7}, {"entity": "NA", "count": 3}, {"entity": "UNEP", "count": 11}]}])
        self.assertFalse(result["quality"]["available"]["composition"])
        self.assertEqual(result["quality"]["organizationDifferences"]["composition"]["UN"], {"organization": 21, "detail": None})

    def test_missing_age_and_tenure_are_null_not_zero(self):
        sources = {name: [] for name in personnel.HEADERS}
        sources["others"] = personnel.parse_source("others", b"YEAR,SEX,TENURE,TENURE_BAND,AGE_BAND,AGE,COUNT\n2025,NA,NA,NA,NA,NA,7\n2025,F,0,under 5 years,under 25 years,24,1\n")
        rows = personnel.build_year(sources, 2025)["ageTenure"]
        self.assertEqual((rows[0]["age"], rows[0]["tenure"], rows[0]["sex"]), (None, None, "NA"))
        self.assertEqual(rows[1]["tenure"], 0)


class PersonnelSourceRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sources, cls.contents = personnel.read_sources()

    def test_all_source_years_and_organizations_reconcile_without_financial_rollups(self):
        years = sorted({row["YEAR"] for row in self.sources["organization"]})
        self.assertEqual(years, list(range(2017, 2026)))
        for year in years:
            with self.subTest(year=year):
                result = personnel.build_year(self.sources, year)
                self.assertTrue(result["quality"]["totalsMatch"])
                self.assertTrue(all(not v for v in result["quality"]["organizationDifferences"].values()))
                self.assertEqual(sum(row["total"] for row in result["organizations"]), result["total"])
        result = personnel.build_year(self.sources, 2025)
        self.assertEqual(result["total"], 120635)
        self.assertEqual(result["quality"]["unknownGender"], 7)
        un = next(row for row in result["organizations"] if row["sourceOrg"] == "UN")
        self.assertIn("UNEP", {row["entity"] for row in un["entities"]})
        self.assertNotIn("UNEP", {row["org"] for row in result["organizations"]})
        self.assertNotIn("Peacekeeping Operations", {row["org"] for row in result["organizations"]})

    def test_export_preserves_every_dimension_bound_count_and_source_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, out = Path(tmp) / "hr/raw", Path(tmp) / "out"
            raw.mkdir(parents=True)
            for name, data in self.contents.items():
                (raw / f"{name}.csv").write_bytes(data)
            out.mkdir()
            (out / "personnel-2016.json").write_text('{"year":2016}')
            (out / "other-2016.json").write_text('{"year":2016}')
            manifest = personnel.export(raw, out)
            self.assertFalse((out / "personnel-2016.json").exists())
            self.assertTrue((out / "other-2016.json").exists())
            for record in manifest["files"]:
                name = record["file"].removesuffix(".csv")
                self.assertEqual(record["sha256"], sha256(self.contents[name]).hexdigest())
            documents = [json.loads(path.read_text()) for path in out.glob("personnel-[0-9]*.json")]
            # Reconstruct each complete source observation from the exported
            # schema. Counts must remain bound to their original dimensions:
            # equal sums or count multisets cannot catch swapped observations.
            field_maps = {
                "composition": ("composition", {"ORG": "org", "CATEGORY": "category", "SUBCATEGORY": "subcategory", "GRADE": "grade", "SEX": "sex", "COUNT": "count"}),
                "nationality": ("nationalities", {"REGION": "region", "SUBREGION": "subregion", "COUNTRY": "country", "ORG": "org", "ISO": "iso3", "COUNT": "count"}),
                "duty_station": ("dutyStations", {"REGION": "region", "SUBREGION": "subregion", "ISO": "iso3", "COUNTRY": "country", "DS": "station", "ORG": "org", "COUNT": "count"}),
                "others": ("ageTenure", {"SEX": "sex", "TENURE": "tenure", "TENURE_BAND": "tenureBand", "AGE_BAND": "ageBand", "AGE": "age", "COUNT": "count"}),
            }
            for name in self.sources:
                with self.subTest(source=name):
                    expected = []
                    for row in self.sources[name]:
                        normalized = dict(row)
                        if "ORG" in row:
                            normalized["ORG"] = personnel.normalize_entity(row["ORG"])
                        for column in ("AGE", "TENURE"):
                            if column in row:
                                normalized[column] = None if row[column] in {"", "NA"} else int(row[column])
                        expected.append(tuple(normalized[column] for column in personnel.HEADERS[name]))
                    actual = []
                    for document in documents:
                        if name == "organization":
                            reconstructed = [{"YEAR": document["year"], "ORG": organization["org"], "ENTITY": entity["entity"], "COUNT": entity["count"]}
                                             for organization in document["organizations"] for entity in organization["entities"]]
                            # The original reporting identifier is retained as
                            # well as its canonical display label.
                            for organization in document["organizations"]:
                                self.assertEqual(organization["org"], personnel.normalize_entity(organization["sourceOrg"]))
                        else:
                            field, mapping = field_maps[name]
                            reconstructed = [{"YEAR": document["year"], **{column: row[key] for column, key in mapping.items()}}
                                             for row in document[field]]
                        actual.extend(tuple(row[column] for column in personnel.HEADERS[name]) for row in reconstructed)
                    self.assertEqual(len(actual), len(expected))
                    self.assertEqual(Counter(actual), Counter(expected))
            self.assertEqual(json.loads((out / "personnel-trends.json").read_text())["years"][-1]["unknown"], 7)

    def test_trend_distributions_bind_source_bands_gender_and_org_coverage(self):
        all_organizations = {personnel.normalize_entity(row["ORG"]) for row in self.sources["organization"]}
        for year in sorted({row["YEAR"] for row in self.sources["organization"]}):
            with self.subTest(year=year):
                trend = personnel.build_trend(personnel.build_year(self.sources, year))
                expected_gender = defaultdict(lambda: {"female": 0, "male": 0, "unknown": 0})
                expected_age, expected_tenure = Counter(), Counter()
                for row in self.sources["composition"]:
                    if row["YEAR"] == year:
                        label = {"F": "female", "M": "male"}.get(row["SEX"], "unknown")
                        expected_gender[personnel.normalize_entity(row["ORG"])][label] += row["COUNT"]
                for row in self.sources["others"]:
                    if row["YEAR"] == year:
                        expected_age[row["AGE_BAND"]] += row["COUNT"]
                        expected_tenure[row["TENURE_BAND"]] += row["COUNT"]
                self.assertEqual(trend["genderByOrganization"], dict(expected_gender))
                self.assertEqual(trend["ageBands"], dict(expected_age))
                self.assertEqual(trend["tenureBands"], dict(expected_tenure))
                self.assertEqual(sum(trend["ageBands"].values()), trend["total"])
                self.assertEqual(sum(trend["tenureBands"].values()), trend["total"])
                self.assertEqual(sum(trend[key] for key in ("female", "male", "unknown")), trend["total"])
                self.assertEqual(set(trend["genderByOrganization"]), set(trend["organizations"]))
                for org, count in trend["organizations"].items():
                    self.assertEqual(sum(trend["genderByOrganization"][org].values()), count)
                for missing_org in all_organizations - set(trend["organizations"]):
                    self.assertNotIn(missing_org, trend["genderByOrganization"])
        latest = personnel.build_trend(personnel.build_year(self.sources, 2025))
        self.assertEqual(latest["tenureBands"]["NA"], 1)
        self.assertEqual(sum(row["unknown"] for row in latest["genderByOrganization"].values()), 7)

    def test_partition_loss_and_truncation_cannot_be_exported_as_zeros(self):
        incomplete = {**self.sources, "others": [row for row in self.sources["others"] if row["YEAR"] != 2025]}
        with self.assertRaisesRegex(ValueError, "yearly partitions"):
            personnel.validate_release(incomplete)
        truncated = {**self.sources, "nationality": self.sources["nationality"][:-1]}
        with self.assertRaisesRegex(ValueError, "total reconciliation"):
            personnel.validate_release(truncated)

    def test_balanced_cross_organization_and_gender_errors_are_rejected(self):
        shifted = deepcopy(self.sources)
        first = shifted["composition"][0]
        second = next(row for row in shifted["composition"] if row["YEAR"] == first["YEAR"] and row["ORG"] != first["ORG"] and row["COUNT"] > 1)
        first["COUNT"] += 1
        second["COUNT"] -= 1
        with self.assertRaisesRegex(ValueError, "organization reconciliation"):
            personnel.validate_release(shifted)
        shifted = deepcopy(self.sources)
        first = shifted["others"][0]
        second = next(row for row in shifted["others"] if row["YEAR"] == first["YEAR"] and row["SEX"] != first["SEX"] and row["COUNT"] > 1)
        first["COUNT"] += 1
        second["COUNT"] -= 1
        with self.assertRaisesRegex(ValueError, "gender reconciliation"):
            personnel.validate_release(shifted)

    def test_coherent_year_and_organization_loss_requires_investigation(self):
        previous = personnel.coverage(self.sources)
        shortened = {name: [row for row in rows if row["YEAR"] != 2017] for name, rows in self.sources.items()}
        with self.assertRaisesRegex(ValueError, "lost existing year coverage"):
            personnel.validate_release(shortened, previous)
        # Even coordinated removal that could still reconcile must not silently
        # remove a previously reported organization from any existing year.
        lost_org = {name: [row for row in rows if row.get("ORG") != "CEB"] for name, rows in self.sources.items()}
        with self.assertRaisesRegex(ValueError, "lost existing organization coverage"):
            personnel.validate_release(lost_org, previous)

    def test_fetch_failure_leaves_all_raw_files_unchanged(self):
        candidate = dict(self.contents)
        candidate["nationality"] = b"\n".join(candidate["nationality"].splitlines()[:-1]) + b"\n"
        with tempfile.TemporaryDirectory() as tmp:
            raw = Path(tmp) / "raw"
            raw.mkdir()
            for name, content in self.contents.items():
                (raw / f"{name}.csv").write_bytes(content)
            def response(url, timeout):
                return io.BytesIO(candidate[url.rsplit("/", 1)[1].removesuffix(".csv")])
            with patch.object(personnel, "urlopen", response), self.assertRaisesRegex(ValueError, "reconciliation|coverage"):
                personnel.fetch_sources(raw)
            for name, content in self.contents.items():
                self.assertEqual((raw / f"{name}.csv").read_bytes(), content)
            self.assertFalse((raw.parent / "download.json").exists())

    def test_failed_ordinary_export_preserves_previous_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw, out = Path(tmp) / "hr/raw", Path(tmp) / "out"
            raw.mkdir(parents=True)
            for name, content in self.contents.items():
                (raw / f"{name}.csv").write_bytes(content)
            personnel.export(raw, out)
            original = {path.name: path.read_bytes() for path in out.iterdir()}
            for name, rows in self.sources.items():
                text = io.StringIO()
                writer = csv.DictWriter(text, fieldnames=personnel.HEADERS[name])
                writer.writeheader()
                writer.writerows(row for row in rows if row["YEAR"] != 2017)
                (raw / f"{name}.csv").write_text(text.getvalue(), encoding="utf-8-sig")
            with self.assertRaisesRegex(ValueError, "lost existing year coverage"):
                personnel.export(raw, out)
            self.assertEqual(original, {path.name: path.read_bytes() for path in out.iterdir()})

    def test_unmapped_nationalities_are_retained_with_null_coordinates(self):
        result = personnel.build_year(self.sources, 2025)
        unknown = [row for row in result["nationalities"] if row["iso3"] == "NA"]
        self.assertTrue(unknown)
        self.assertTrue(all(row["lat"] is None and row["long"] is None for row in unknown))
        self.assertGreater(sum(row["count"] for row in unknown), 0)
        usa = next(row for row in result["dutyStations"] if row["iso3"] == "USA")
        self.assertEqual((usa["lat"], usa["long"]), (37.0902, -95.7129))


if __name__ == "__main__":
    unittest.main()
