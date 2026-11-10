"""Export the five CEB HR datasets independently of financial reporting scopes.

Run with --fetch to validate and archive a new download before promotion. By
 default the tracked local source files are used, allowing offline regeneration.
"""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
from hashlib import sha256
import io
import json
from pathlib import Path
import shutil
from urllib.request import urlopen

from utils import normalize_entity
from country_coordinates import COUNTRY_CENTROIDS

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/ceb/hr/raw"
OUT = ROOT / "public/data"
BASE = "https://unsceb.org/assets/data/HR/"
HEADERS = {
    "organization": ("YEAR", "ORG", "ENTITY", "COUNT"),
    "composition": ("ORG", "CATEGORY", "SUBCATEGORY", "GRADE", "SEX", "YEAR", "COUNT"),
    "nationality": ("REGION", "SUBREGION", "COUNTRY", "ORG", "YEAR", "ISO", "COUNT"),
    "duty_station": ("YEAR", "REGION", "SUBREGION", "ISO", "COUNTRY", "DS", "ORG", "COUNT"),
    "others": ("YEAR", "SEX", "TENURE", "TENURE_BAND", "AGE_BAND", "AGE", "COUNT"),
}
UNKNOWN = {"", "NA"}


def parse_source(name: str, content: bytes) -> list[dict]:
    """Reject schema/key/count changes rather than silently alter the population."""
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    if tuple(reader.fieldnames or ()) != HEADERS[name]:
        raise ValueError(f"{name}: unexpected columns {reader.fieldnames}")
    result, keys = [], set()
    for line, row in enumerate(reader, 2):
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"{name}:{line}: malformed row")
        if not row["YEAR"].isdigit() or not 1900 <= int(row["YEAR"]) <= 2200:
            raise ValueError(f"{name}:{line}: invalid year")
        if not row["COUNT"].isdigit():
            raise ValueError(f"{name}:{line}: missing or invalid personnel count")
        if "ORG" in row and row["ORG"] in UNKNOWN:
            raise ValueError(f"{name}:{line}: missing organization")
        key = tuple(row[column] for column in HEADERS[name] if column != "COUNT")
        if key in keys:
            raise ValueError(f"{name}:{line}: duplicate dimension key {key}")
        keys.add(key)
        if "SEX" in row and row["SEX"] not in {"F", "M", "NA", ""}:
            raise ValueError(f"{name}:{line}: unrecognized gender code {row['SEX']}")
        for field in ("AGE", "TENURE"):
            if field in row and row[field] not in UNKNOWN and not row[field].isdigit():
                raise ValueError(f"{name}:{line}: invalid {field}")
        result.append({**row, "YEAR": int(row["YEAR"]), "COUNT": int(row["COUNT"])})
    if not result:
        raise ValueError(f"{name}: empty source")
    return result


def read_sources(raw: Path = RAW) -> tuple[dict, dict]:
    contents = {name: (raw / f"{name}.csv").read_bytes() for name in HEADERS}
    return {name: parse_source(name, data) for name, data in contents.items()}, contents



def coverage(sources: dict) -> dict:
    return {name: {
        "years": sorted({row["YEAR"] for row in rows}),
        "organizationsByYear": {
            str(year): sorted({row["ORG"] for row in rows if row["YEAR"] == year})
            for year in sorted({row["YEAR"] for row in rows})
        } if name != "others" else {},
    } for name, rows in sources.items()}


def validate_release(sources: dict, previous: dict | None = None) -> dict:
    """Accept complete, reconciled releases; reject unexplained coverage losses.

    A whole missing source partition is unavailable rather than a zero-valued
    year. Such a candidate must be investigated before it can replace the
    complete release consumed by this view.
    """
    current = coverage(sources)
    years = current["organization"]["years"]
    if not years or any(item["years"] != years for item in current.values()):
        raise ValueError("Inconsistent yearly partitions across HR sources")
    for name, old in (previous or {}).items():
        if set(old["years"]) - set(current[name]["years"]):
            raise ValueError(f"{name}: lost existing year coverage")
        for year, organizations in old.get("organizationsByYear", {}).items():
            if set(organizations) - set(current[name]["organizationsByYear"].get(year, [])):
                raise ValueError(f"{name}: lost existing organization coverage in {year}")
    annual = {}
    for year in years:
        data = build_year(sources, year)
        if not data["quality"]["totalsMatch"]:
            raise ValueError(f"{year}: HR source total reconciliation failed")
        if any(data["quality"]["organizationDifferences"].values()):
            raise ValueError(f"{year}: HR organization reconciliation failed")
        names = [row["org"] for row in data["organizations"]]
        if len(names) != len(set(names)):
            raise ValueError(f"{year}: organization aliases collide")
        composition_sex, age_sex = Counter(), Counter()
        for row in data["composition"]:
            composition_sex[row["sex"] if row["sex"] not in UNKNOWN else "NA"] += row["count"]
        for row in data["ageTenure"]:
            age_sex[row["sex"] if row["sex"] not in UNKNOWN else "NA"] += row["count"]
        if composition_sex != age_sex:
            raise ValueError(f"{year}: HR gender reconciliation failed")
        annual[year] = data
    return annual

def fetch_sources(raw: Path = RAW) -> None:
    """Keep the complete candidate snapshot, then promote only validated files."""
    contents = {}
    for name in HEADERS:
        with urlopen(BASE + name + ".csv", timeout=90) as response:
            contents[name] = response.read()
    sources = {name: parse_source(name, data) for name, data in contents.items()}
    existing = [(raw / f"{name}.csv").exists() for name in HEADERS]
    if any(existing) and not all(existing):
        raise ValueError("Existing raw HR release is incomplete; restore it before refreshing")
    baseline = coverage(read_sources(raw)[0]) if all(existing) else None
    validate_release(sources, baseline)
    validate_release(sources, registered_coverage(raw))
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    snapshot = raw.parent / "snapshots" / stamp
    snapshot.mkdir(parents=True)
    for name, data in contents.items():
        (snapshot / f"{name}.csv").write_bytes(data)
    (snapshot / "download.json").write_text(json.dumps({
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "files": [{"url": BASE + name + ".csv", "sha256": sha256(data).hexdigest()}
                  for name, data in contents.items()],
    }, indent=2) + "\n")
    raw.mkdir(parents=True, exist_ok=True)
    for name in contents:
        shutil.copyfile(snapshot / f"{name}.csv", raw / f"{name}.csv")
    shutil.copyfile(snapshot / "download.json", raw.parent / "download.json")


def optional_integer(value: str) -> int | None:
    return None if value in UNKNOWN else int(value)


def build_year(sources: dict, year: int) -> dict:
    rows = {name: [row for row in data if row["YEAR"] == year] for name, data in sources.items()}
    organizations = defaultdict(list)
    for row in rows["organization"]:
        organizations[row["ORG"]].append({"entity": row["ENTITY"], "count": row["COUNT"]})
    totals = {name: sum(row["COUNT"] for row in data) for name, data in rows.items()}
    org_totals = {org: sum(row["count"] for row in entries) for org, entries in organizations.items()}
    differences = {}
    for name in ("composition", "nationality", "duty_station"):
        observed = Counter()
        for row in rows[name]:
            observed[row["ORG"]] += row["COUNT"]
        differences[name] = {
            org: {"organization": org_totals.get(org), "detail": observed.get(org)}
            for org in sorted(set(org_totals) | set(observed))
            if org_totals.get(org) != observed.get(org)
        }
    return {
        "year": year,
        "total": totals["organization"] if rows["organization"] else None,
        "organizations": [{"org": normalize_entity(org), "sourceOrg": org,
                           "total": org_totals[org], "entities": entries}
                          for org, entries in sorted(organizations.items())],
        "composition": [{"org": normalize_entity(row["ORG"]), "category": row["CATEGORY"],
                         "subcategory": row["SUBCATEGORY"], "grade": row["GRADE"],
                         "sex": row["SEX"], "count": row["COUNT"]} for row in rows["composition"]],
        "dutyStations": [{"org": normalize_entity(row["ORG"]), "iso3": row["ISO"],
                          "country": row["COUNTRY"], "region": row["REGION"],
                          "subregion": row["SUBREGION"], "station": row["DS"],
                          "lat": COUNTRY_CENTROIDS.get(row["ISO"], (None, None))[0],
                          "long": COUNTRY_CENTROIDS.get(row["ISO"], (None, None))[1],
                          "count": row["COUNT"]} for row in rows["duty_station"]],
        "nationalities": [{"org": normalize_entity(row["ORG"]), "iso3": row["ISO"],
                           "country": row["COUNTRY"], "region": row["REGION"],
                           "subregion": row["SUBREGION"],
                           "lat": COUNTRY_CENTROIDS.get(row["ISO"], (None, None))[0],
                           "long": COUNTRY_CENTROIDS.get(row["ISO"], (None, None))[1],
                           "count": row["COUNT"]}
                          for row in rows["nationality"]],
        "ageTenure": [{"sex": row["SEX"], "age": optional_integer(row["AGE"]),
                       "ageBand": row["AGE_BAND"], "tenure": optional_integer(row["TENURE"]),
                       "tenureBand": row["TENURE_BAND"], "count": row["COUNT"]}
                      for row in rows["others"]],
        "quality": {"totals": totals,
                    "available": {name: bool(data) for name, data in rows.items()},
                    "organizationDifferences": differences,
                    "totalsMatch": all(bool(data) for data in rows.values()) and all(value == totals["organization"] for value in totals.values()),
                    "unknownGender": sum(row["COUNT"] for row in rows["composition"]
                                         if row["SEX"] in UNKNOWN)},
    }



def build_trend(data: dict) -> dict:
    """Count-based histories preserve unknowns and only observed org-years."""
    gender = {"female": 0, "male": 0, "unknown": 0}
    gender_by_org = {}
    for row in data["composition"]:
        key = "female" if row["sex"] == "F" else "male" if row["sex"] == "M" else "unknown"
        gender[key] += row["count"]
        org = gender_by_org.setdefault(row["org"], {"female": 0, "male": 0, "unknown": 0})
        org[key] += row["count"]
    age_bands, tenure_bands = Counter(), Counter()
    for row in data["ageTenure"]:
        age_bands[row["ageBand"]] += row["count"]
        tenure_bands[row["tenureBand"]] += row["count"]
    return {"year": data["year"], "total": data["total"],
            "organizations": {row["org"]: row["total"] for row in data["organizations"]},
            **gender, "genderByOrganization": gender_by_org,
            "ageBands": dict(age_bands), "tenureBands": dict(tenure_bands)}

def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")



def registered_coverage(raw: Path) -> dict:
    manifest_path = raw.parent / "source.json"
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    return {entry["file"].removesuffix(".csv"): {
        "years": entry["years"], "organizationsByYear": entry.get("organizationsByYear", {}),
    } for entry in previous.get("files", [])}

def export(raw: Path = RAW, out: Path = OUT) -> dict:
    sources, contents = read_sources(raw)
    manifest_path = raw.parent / "source.json"
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    annual = validate_release(sources, registered_coverage(raw))
    years = sorted(annual)
    current_coverage = coverage(sources)
    files = [{"file": name + ".csv", "url": BASE + name + ".csv",
              "sha256": sha256(contents[name]).hexdigest(), "rows": len(rows),
              "columns": list(HEADERS[name]), **current_coverage[name],
              "totalsByYear": {str(year): sum(row["COUNT"] for row in rows if row["YEAR"] == year) for year in years},
              "unknownCells": {column: sum(row[column] in UNKNOWN for row in rows)
                               for column in HEADERS[name] if column not in {"YEAR", "COUNT"}}}
             for name, rows in sources.items()]
    inspected = previous.get("inspectedAt") if previous.get("files") == files else None
    manifest = {"source": "https://unsceb.org/data-download/", "inspectedAt": inspected or datetime.now(timezone.utc).isoformat(),
                "scope": "Staff who, on 31 December of each year, either held a contract of at least one year or had been employed for at least one year; excludes consultants, individual contractors and other non-staff personnel.",
                "codebook": {"url": "https://unsceb.org/assets/data/HR/ceb_hr_codebook_v1.0.md?v=1.0",
                             "version": "1.0", "date": "2026-10-27",
                             "sha256": sha256((ROOT / "data/ceb/hr/ceb_hr_codebook_v1.0.md").read_bytes()).hexdigest()},
                "files": files, "checks": {"uniqueDimensionKeys": True, "nonnegativeIntegerCounts": True,
                                          "sourceColumnsValidated": True, "completeYearPartitions": True,
                                          "sourceTotalsReconciled": True, "organizationTotalsReconciled": True,
                                          "genderTotalsReconciled": True, "priorCoveragePreserved": True},
                "notes": ["HR reporting organizations have a different scope from financial reporting organizations.",
                          "UN entity detail is contained within UN; do not add those entities again as financial reporting organizations.",
                          "Age and tenure are system-wide; their source has no organization dimension.",
                          "NA means not reported or not identified. Missing rows mean no staff were recorded for that combination in the source year; missing datasets or years remain unavailable.",
                          "Annual trends can reflect changing participation and reporting systems, as well as staffing changes."]}
    downloaded = raw.parent / "download.json"
    if downloaded.exists():
        download = json.loads(downloaded.read_text())
        if {entry["sha256"] for entry in download["files"]} == {entry["sha256"] for entry in files}:
            manifest["retrievedAt"] = download["retrievedAt"]
    trends = []
    for year in years:
        data = annual[year]
        write_json(out / f"personnel-{year}.json", data)
        trends.append(build_trend(data))
        print(f"personnel-{year}: {data['total']} staff; totals match: {data['quality']['totalsMatch']}")
    # Remove only generated annual personnel files after all current years
    # have been validated and written. This prevents manifest globs advertising
    # obsolete files from an older/local export without touching other data.
    expected = {f"personnel-{year}.json" for year in years}
    for path in out.glob("personnel-*.json"):
        suffix = path.stem.removeprefix("personnel-")
        if suffix.isdigit() and path.name not in expected:
            path.unlink()
    write_json(out / "personnel-trends.json", {"years": trends})
    write_json(out / "personnel-source.json", manifest)
    write_json(manifest_path, manifest)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="Download and validate a new source release first")
    parser.add_argument("--raw-dir", type=Path, default=RAW)
    parser.add_argument("--out-dir", type=Path, default=OUT)
    args = parser.parse_args()
    if args.fetch:
        fetch_sources(args.raw_dir)
    export(args.raw_dir, args.out_dir)
