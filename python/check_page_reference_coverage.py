"""Inventory physical-page citation coverage without counting amounts as additive.

Run with the portal virtualenv: python/check_page_reference_coverage.py.
A cited amount is fully paged only when all of its direct supporting references
have physical page metadata. This does not independently verify PDF contents.
"""
from __future__ import annotations
import argparse
import json
from collections import Counter
from pathlib import Path


def has_page(reference):
    pages = reference.get("pdfPages") or [reference.get("pdfPage")]
    return any(isinstance(p, int) and not isinstance(p, bool) and p > 0 for p in pages)


def add(counter, references):
    counter["amounts"] += 1
    if not references:
        counter["without_references"] += 1
    elif all(has_page(ref) for ref in references):
        counter["all_references_paged"] += 1
    elif any(has_page(ref) for ref in references):
        counter["some_references_paged"] += 1
    else:
        counter["document_only"] += 1


def inventory(root: Path):
    results = {}
    for metric in ("expenditure", "approved", "proposed"):
        counts = Counter()
        years = {}
        for path in sorted(root.glob(f"budget-ppb-{metric}-*.json")):
            data = json.loads(path.read_text())
            year = Counter()
            for node in data["nodes"]:
                for funding, amount in node.get("values", {}).items():
                    if not isinstance(amount, (float, int)):
                        continue
                    references = node.get("metricSources", {}).get(metric, {}).get(funding, [])
                    if not references and metric == "expenditure":
                        direct = node.get("sources", {}).get(funding)
                        references = [direct] if direct else []
                    add(year, references)
            years[path.stem] = dict(year)
            counts.update(year)
        results[f"ppb_{metric}"] = {"totals": dict(counts), "files": years}
    for pattern in ("budget-pko-*.json", "budget-trust-funds-*.json"):
        counts = Counter()
        for path in sorted(root.glob(pattern)):
            data = json.loads(path.read_text())
            for node in data["nodes"]:
                if node.get("basis", "").startswith("derived"):
                    continue
                references = node.get("supportingSources") or ([node["source"]] if node.get("source") else [])
                add(counts, references)
        results[pattern] = dict(counts)
    counts = Counter()
    for path in sorted(root.glob("trust-fund-contributors-*.json")):
        for contributor in json.loads(path.read_text())["contributors"]:
            for destination in contributor["destinations"]:
                add(counts, destination.get("supportingSources", []))
    results["trust_fund_contributor_destinations"] = dict(counts)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path(__file__).resolve().parents[1] / "public/data")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = json.dumps(inventory(args.data), indent=2) + "\n"
    if args.output:
        args.output.write_text(report)
    else:
        print(report, end="")
