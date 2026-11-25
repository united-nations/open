"""Snapshot the public MPTF Gateway and export separate annual portfolio data.

Run with --fetch --years 2016 ... 2025 to refresh; otherwise replay retained
responses. Source rows and controls are retained without allocating pooled
contributions to recipients or joining Secretariat trust-fund accounts.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request

from utils import clean_donor_name, normalize_entity, normalize_country_name

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/mptf"
OUT = ROOT / "public/data"
GATEWAY = "https://mptf.undp.org"
QUERIES = {
    "funds": ("getAnalyzeAllFunds", ",FUND,PARENT_fund_code,COMMITMENT,DEPOSIT,BUDGET,NET_FUNDED,EXPENDITURE,"),
    "contributors": ("getAnalyzeAllContributions", ",donor_group_description,CONTRIBUTOR_PARTNER_ID,COUNTRY_CODE,CONTRIBUTOR_TYPE,FUND,PARENT_fund_code,DEPOSIT,COMMITMENT,donor_refund,"),
    "organizations": ("getAnalyzeAllProjects", ",FUND,PARENT_fund_code,FUND_CATEGORY,TYPOLOGY,geo_description,implementing_agent_group_description,ORGANIZATION,agency_code,Country,BUDGET,NET_FUNDED,EXPENDITURE,"),
}
SOURCE_METRICS = {"grossDeposits": "DEPOSIT", "commitments": "COMMITMENT", "netTransfers": "NET_FUNDED", "expenditure": "EXPENDITURE", "budget": "BUDGET", "refunds": "donor_refund"}
FEEDER_TYPE = "MULTILATERAL_FEEDER_FUND"


def amount(value):
    if value is None or str(value).strip() == "":
        return None
    result = Decimal(str(value))
    if not result.is_finite():
        raise ValueError(f"Non-finite source amount: {value}")
    return result


def total(values):
    values = list(values)
    return None if not values or any(v is None for v in values) else sum(values, Decimal(0))


def decoded(raw):
    value = json.loads(raw)
    value = json.loads(value) if isinstance(value, str) else value
    if not isinstance(value, dict) or not isinstance(value.get("data"), list):
        raise ValueError("Invalid Gateway response")
    if len(value["data"]) != int(value["total"][0]["totalItems"]):
        raise ValueError("Incomplete Gateway response: pagination did not return all rows")
    return value


def source_url(kind, year):
    method, columns = QUERIES[kind]
    filters = f"fromMonth:1,fromYear:{year},toMonth:12,toYear:{year},pagination:a,"
    return GATEWAY + "/mptf_rest_api/" + urllib.parse.quote(method + "/" + columns + "/" + filters, safe="/,:-")


def fetch_source(item):
    kind, year = item
    url = source_url(kind, year)
    request = urllib.request.Request(url, headers={"drupal-page-url": "/analyze-all-projects" if kind == "organizations" else "/analyze-all-contributions", "User-Agent": "UN-Transparency-Portal/1.0"})
    raw = urllib.request.urlopen(request, timeout=90).read()
    value = decoded(raw)
    if value.get("filter") != f"fromMonth:1,fromYear:{year},toMonth:12,toYear:{year},pagination:a,":
        raise ValueError(f"Gateway did not acknowledge requested year: {kind}/{year}")
    record = {"kind": kind, "year": year, "url": url, "retrievedAt": datetime.now(timezone.utc).isoformat(), "sha256": hashlib.sha256(raw).hexdigest(), "rows": len(value["data"])}
    return record, raw


def verify_control(response, field):
    rows = total(amount(row.get(field)) for row in response["data"])
    control = total(amount(row.get(field)) for row in response["dataTotals"])
    if rows is None or control is None or abs(rows - control) > Decimal("0.005"):
        raise ValueError(f"Source rows do not reconcile: {field}: {rows} != {control}")
    return control


def build_year(year, responses, registry, entity_names, donor_names, aliases):
    funds = {}
    for kind, response in responses.items():
        seen = set()
        for row in response["data"]:
            code = row.get("PARENT_fund_code")
            if not code:
                raise ValueError("Missing source fund identifier")
            # '-' is the literal source placeholder, never a fabricated fund code.
            fund = funds.setdefault(code, {"contributors": [], "organizations": [], "countries": []})
            name = row.get("FUND_header") or row.get("FUND")
            meta = registry.setdefault(code, {"id": code, "name": name or "Unidentified in MPTF source", "category": "Not specified", "typology": "Not specified", "scope": "Not specified"})
            if name:
                meta["name"] = name
            if code != "-":
                meta["url"] = GATEWAY + "/fund/" + urllib.parse.quote(code.lower(), safe="")
            for source, key in [("FUND_CATEGORY", "category"), ("TYPOLOGY", "typology"), ("geo_description", "scope")]:
                if row.get(source):
                    if key in fund and fund[key] != row[source]:
                        raise ValueError(f"Ambiguous fund metadata {year}/{code}/{key}")
                    fund[key] = row[source]
                    meta[key] = row[source]
            if kind == "funds":
                if code in seen:
                    raise ValueError(f"Duplicate fund total: {year}/{code}")
                seen.add(code)
                fund.update({key: amount(row.get(source)) for key, source in SOURCE_METRICS.items() if source in row})
            elif kind == "contributors":
                source_name = row.get("donor_group_description") or "Unidentified contributor"
                canonical = clean_donor_name(aliases.get("contributors", {}).get(row.get("donor_group_code"), source_name))
                fund["contributors"].append({"id": row.get("donor_group_code"), "name": source_name, "portalName": canonical if canonical in donor_names and row.get("contributor_type") != FEEDER_TYPE else None, "sourceType": row.get("contributor_type") or None, "deposit": amount(row.get("DEPOSIT")), "refund": amount(row.get("donor_refund")), "commitment": amount(row.get("COMMITMENT"))})
            else:
                code_org = row.get("ORGANIZATION") or ""
                # Only independently matching reporting units link to CEB profiles.
                canonical = normalize_entity(aliases.get("organizations", {}).get(code_org, code_org))
                source_name = row.get("implementing_agent_group_description") or code_org or "Unidentified organization"
                if code_org in {"NGO/UNDP", "NGO/OCHA", "UNWOMN NGO"}:
                    source_name = f"{source_name} — {code_org}"
                fund["organizations"].append({"id": row.get("agency_code"), "groupId": row.get("implementing_group_code"), "name": source_name, "portalName": canonical if canonical in entity_names else None, "netTransfers": amount(row.get("NET_FUNDED")), "expenditure": amount(row.get("EXPENDITURE")), "budget": amount(row.get("BUDGET"))})
                fund["countries"].append({"id": row.get("country_code"), "name": normalize_country_name(row.get("Country") or "Not specified"), "netTransfers": amount(row.get("NET_FUNDED")), "expenditure": amount(row.get("EXPENDITURE"))})

    controls = {}
    for kind, fields in {"funds": ["DEPOSIT", "COMMITMENT", "NET_FUNDED", "EXPENDITURE", "BUDGET"], "contributors": ["DEPOSIT", "COMMITMENT", "donor_refund"], "organizations": ["NET_FUNDED", "EXPENDITURE", "BUDGET"]}.items():
        controls[kind] = {field: verify_control(responses[kind], field) for field in fields}
    for field in ["DEPOSIT", "COMMITMENT"]:
        if controls["funds"][field] != controls["contributors"][field]:
            raise ValueError(f"Cross-source control mismatch {year}/{field}")
    for field in ["NET_FUNDED", "EXPENDITURE", "BUDGET"]:
        if controls["funds"][field] != controls["organizations"][field]:
            raise ValueError(f"Cross-source control mismatch {year}/{field}")

    for code, fund in funds.items():
        for key, field in [("grossDeposits", "deposit"), ("commitments", "commitment")]:
            detail = total(row[field] for row in fund["contributors"])
            if key in fund and detail is not None and fund[key] != detail:
                raise ValueError(f"Fund contributor reconciliation failed {year}/{code}/{key}")
            fund.setdefault(key, detail)
        for key in ["netTransfers", "expenditure", "budget"]:
            detail = total(row[key] for row in fund["organizations"])
            if key in fund and detail is not None and fund[key] != detail:
                raise ValueError(f"Fund recipient reconciliation failed {year}/{code}/{key}")
            fund.setdefault(key, detail)
        fund["routedDeposits"] = total(row["deposit"] for row in fund["contributors"] if row["sourceType"] == FEEDER_TYPE) or Decimal(0)
        fund["deposits"] = None if fund["grossDeposits"] is None else fund["grossDeposits"] - fund["routedDeposits"]
        fund["refunds"] = total(row["refund"] for row in fund["contributors"])
        # Retain source agency identities; aggregate duplicate country rows explicitly.
        countries = defaultdict(list)
        for row in fund["countries"]:
            countries[(row["id"], row["name"])].append(row)
        fund["countries"] = [{"id": key[0], "name": key[1], **{metric: total(row[metric] for row in values) for metric in ["netTransfers", "expenditure"]}} for key, values in countries.items()]
    routed = sum((fund["routedDeposits"] for fund in funds.values()), Decimal(0))
    totals = {"grossDeposits": controls["funds"]["DEPOSIT"], "deposits": controls["funds"]["DEPOSIT"] - routed, "routedDeposits": routed, "refunds": controls["contributors"]["donor_refund"], "commitments": controls["funds"]["COMMITMENT"], "netTransfers": controls["funds"]["NET_FUNDED"], "expenditure": controls["funds"]["EXPENDITURE"], "budget": controls["funds"]["BUDGET"]}
    return {"year": year, "totals": totals, "funds": funds, "controls": controls}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, default=lambda value: float(value) if isinstance(value, Decimal) else value, ensure_ascii=False, separators=(",", ":")) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--years", type=int, nargs="+")
    args = parser.parse_args()
    years = sorted(set(args.years or [int(path.stem.rsplit("-", 1)[1]) for path in (DATA / "raw").glob("funds-*.json")]))
    if not years:
        parser.error("Specify --fetch --years or retain raw annual responses first")
    manifest_path = DATA / "source-manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else []
    candidates = {}
    if args.fetch:
        with ThreadPoolExecutor(max_workers=4) as pool:
            fetched = list(pool.map(fetch_source, [(kind, year) for year in years for kind in QUERIES]))
        candidates = {(record["year"], record["kind"]): raw for record, raw in fetched}
        manifest = [row for row in manifest if row["year"] not in years] + [record for record, _ in fetched]
    source_records = {(row["year"], row["kind"]): row for row in manifest}
    # --years selects what to fetch, not what to forget. Partial refreshes must
    # preserve the registry, trends and profile links for every retained year.
    retained = defaultdict(set)
    for record in manifest:
        retained[record["year"]].add(record["kind"])
    years = sorted(year for year, kinds in retained.items() if set(QUERIES) <= kinds)
    aliases = json.loads((DATA / "identity-aliases.json").read_text())
    registry, annual = {}, []
    # Validate the entire selection before changing any browser-facing export.
    for year in years:
        responses = {}
        for kind in QUERIES:
            raw = candidates.get((year, kind))
            if raw is None:
                raw = (DATA / "raw" / f"{kind}-{year}.json").read_bytes()
            record = source_records.get((year, kind))
            if not record or hashlib.sha256(raw).hexdigest() != record["sha256"]:
                raise ValueError(f"Missing or changed source evidence {kind}/{year}; refresh with --fetch")
            responses[kind] = decoded(raw)
        revenues_path = OUT / f"entity-revenue-{year}.json"
        expenses_path = OUT / f"entity-spending-{year}.json"
        donors_path = OUT / f"donors-{year}.json"
        entity_names = set(json.loads(revenues_path.read_text())) if revenues_path.exists() else set()
        if expenses_path.exists():
            entity_names.update(row["entity"] for row in json.loads(expenses_path.read_text()))
        donor_names = set(json.loads(donors_path.read_text())) if donors_path.exists() else set()
        annual.append(build_year(year, responses, registry, entity_names, donor_names, aliases))
    snapshot_at = max(row["retrievedAt"] for row in manifest if row["year"] in years)
    descriptions_path = DATA / "fund-descriptions.json"
    descriptions = json.loads(descriptions_path.read_text()) if descriptions_path.exists() else {}
    for code, identity in registry.items():
        description = descriptions.get(code)
        if description:
            identity.update({"description": description["description"], "descriptionSource": description["url"], "descriptionRetrievedAt": description["retrievedAt"]})
    # Promote fetched evidence only after every retained candidate year passes
    # all source and cross-source financial controls. A rejected refresh leaves
    # the last replayable raw corpus and its dates/hashes unchanged.
    if args.fetch:
        (DATA / "raw").mkdir(parents=True, exist_ok=True)
        for (year, kind), raw in candidates.items():
            (DATA / "raw" / f"{kind}-{year}.json").write_bytes(raw)
        manifest_path.write_text(json.dumps(sorted(manifest, key=lambda row: (row["year"], row["kind"])), indent=2) + "\n")
    for row in annual:
        row["snapshotAt"] = max(source_records[(row["year"], kind)]["retrievedAt"] for kind in QUERIES)
        write_json(OUT / f"pooled-funds-{row['year']}.json", row)
    metrics = list(SOURCE_METRICS) + ["deposits", "routedDeposits"]
    write_json(OUT / "pooled-funds.json", {"meta": {"years": years, "snapshotAt": snapshot_at, "source": GATEWAY}, "funds": registry, "annual": [{"year": row["year"], "snapshotAt": row["snapshotAt"], "totals": row["totals"], "funds": {code: {key: fund.get(key) for key in [*metrics, "category", "typology", "scope"]} for code, fund in row["funds"].items()}} for row in annual]})
    print(f"Exported {len(registry)} fund identities across {len(years)} validated annual snapshots")


if __name__ == "__main__":
    main()
