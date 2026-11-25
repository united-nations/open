"""Fail-closed refresh of current-year honour-roll status, using approved assessments.

No assessment documents, rates, historical years or manifest coverage are changed.
Validation completes before any published file is replaced. CI commits the result
only after the website builds, then deploys it in the same workflow.
"""
from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
from datetime import date, datetime, timezone
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import tempfile

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "honour_roll_exporter", ROOT / "python/13-export_regular_budget_contributors.py"
)
assert SPEC and SPEC.loader
exporter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(exporter)

STATUSES = ("paid_on_time", "paid_late", "not_paid_in_full")


def validate_snapshot(payload: dict, today: date) -> None:
    """Check the approved roster and controls before using it as a baseline."""
    meta, rows = payload["meta"], payload["contributors"]
    year = meta["year"]
    as_of, due = date.fromisoformat(meta["as_of"]), date.fromisoformat(meta["due_date"])
    if as_of.year != year or due.year != year or as_of > today:
        raise ValueError("Invalid baseline snapshot or due-date year/date")
    names = [row["name"] for row in rows]
    if len(rows) != 193 or len(set(names)) != 193 or meta["member_state_count"] != 193:
        raise ValueError("Baseline must contain the complete 193-state assessment roster")
    counts = Counter()
    for row in rows:
        if (not row["name"] or exporter.canonical_country(row["name"]) != row["name"] or
                type(row["assessment_amount"]) is not int or row["assessment_amount"] <= 0 or
                type(row["assessment_rate"]) not in (int, float) or
                not math.isfinite(row["assessment_rate"]) or row["assessment_rate"] <= 0):
            raise ValueError(f"Invalid baseline assessment: {row['name']}")
        status, payment_date = row["payment_status"], row["payment_date"]
        if status not in STATUSES:
            raise ValueError(f"Invalid baseline payment status: {row['name']}")
        if status == "not_paid_in_full":
            if payment_date is not None:
                raise ValueError(f"Unpaid baseline state has a payment date: {row['name']}")
        else:
            paid = date.fromisoformat(payment_date)
            if (paid.year != year or paid > as_of or
                    (status == "paid_on_time") != (paid <= due)):
                raise ValueError(f"Invalid baseline payment date/section: {row['name']}")
        counts[status] += 1
    if abs(sum(row["assessment_rate"] for row in rows) - 100) > 0.0001:
        raise ValueError("Baseline assessment rates do not total 100%")
    assessments = {row["name"]: row for row in rows}
    exporter.validate_assessment_dollars(assessments, meta["assessment_source_control"], year)
    if meta["assessment_total"] != sum(row["assessment_amount"] for row in rows):
        raise ValueError("Baseline assessment total does not reconcile")
    expected_counts = {
        "paid_in_full_count": counts["paid_on_time"] + counts["paid_late"],
        "paid_on_time_count": counts["paid_on_time"],
        "paid_late_count": counts["paid_late"],
        "not_paid_in_full_count": counts["not_paid_in_full"],
    }
    if any(meta[key] != value for key, value in expected_counts.items()):
        raise ValueError("Baseline payment counts do not reconcile")
    reconciliation = meta["amount_reconciliation"]
    discrepancies = reconciliation["discrepancies"]
    if (len({item["name"] for item in discrepancies}) != len(discrepancies) or
            reconciliation["checked_paid_states"] != expected_counts["paid_in_full_count"] or
            reconciliation["exact_matches"] != expected_counts["paid_in_full_count"] - len(discrepancies)):
        raise ValueError("Baseline amount reconciliation is inconsistent")
    for item in discrepancies:
        row = assessments[item["name"]]
        if (row["payment_status"] == "not_paid_in_full" or
                item["assessment_document_amount"] != row["assessment_amount"] or
                type(item["honour_roll_amount"]) is not int or item["honour_roll_amount"] <= 0 or
                item["honour_roll_amount"] == row["assessment_amount"]):
            raise ValueError(f"Invalid baseline amount discrepancy: {item['name']}")


def prepare_update(previous: dict, content: bytes, today: date) -> dict:
    validate_snapshot(previous, today)
    old_meta = previous["meta"]
    year = old_meta["year"]
    meta, payments = exporter.parse_honour_roll_html(
        content, year, exporter.HONOUR_ROLL_CURRENT_URL
    )
    if meta["as_of"] < old_meta["as_of"] or date.fromisoformat(meta["as_of"]) > today:
        raise ValueError("Honour-roll snapshot date moved backwards or is in the future")
    if meta["due_date"] != old_meta["due_date"]:
        raise ValueError("Honour-roll due date changed; manual source review required")
    roster = {row["name"] for row in previous["contributors"]}
    if unknown := payments.keys() - roster:
        raise ValueError(f"Honour roll contains unknown Member States: {sorted(unknown)}")
    known_discrepancies = {
        item["name"]: item for item in old_meta["amount_reconciliation"]["discrepancies"]
    }
    candidate = deepcopy(previous)
    discrepancies = []
    for row in candidate["contributors"]:
        payment = payments.get(row["name"])
        if row["payment_status"] != "not_paid_in_full":
            if not payment or any(row[key] != payment[key] for key in ("payment_status", "payment_date")):
                raise ValueError(f"Previously published payment removed or revised: {row['name']}")
        elif payment and payment["payment_date"] < old_meta["as_of"]:
            raise ValueError(f"New payment predates the previous snapshot: {row['name']}")
        if payment and payment["honour_roll_amount"] != row["assessment_amount"]:
            discrepancy = {
                "name": row["name"], "honour_roll_amount": payment["honour_roll_amount"],
                "assessment_document_amount": row["assessment_amount"],
            }
            if discrepancy != known_discrepancies.get(row["name"]):
                raise ValueError(f"Unexpected honour-roll amount discrepancy: {discrepancy}")
            discrepancies.append(discrepancy)
        row["payment_status"] = payment["payment_status"] if payment else "not_paid_in_full"
        row["payment_date"] = payment["payment_date"] if payment else None
    counts = Counter(row["payment_status"] for row in candidate["contributors"])
    candidate["meta"].update({
        "as_of": meta["as_of"],
        "paid_in_full_count": len(payments),
        "paid_on_time_count": counts["paid_on_time"],
        "paid_late_count": counts["paid_late"],
        "not_paid_in_full_count": counts["not_paid_in_full"],
        "amount_reconciliation": {
            "checked_paid_states": len(payments),
            "exact_matches": len(payments) - len(discrepancies),
            "discrepancies": discrepancies,
        },
    })
    validate_snapshot(candidate, today)
    return candidate


def fetch_current() -> bytes:
    retries = Retry(
        total=3, connect=3, read=3, status=3, backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504), allowed_methods={"GET"},
        respect_retry_after_header=False,
    )
    with requests.Session() as session:
        session.mount("https://", HTTPAdapter(max_retries=retries))
        with session.get(
            exporter.HONOUR_ROLL_CURRENT_URL,
            headers={**exporter.USER_AGENT, "Cache-Control": "no-cache"},
            timeout=(15, 45), stream=True,
        ) as response:
            response.raise_for_status()
            if response.url != exporter.HONOUR_ROLL_CURRENT_URL:
                raise ValueError(f"Honour roll redirected unexpectedly: {response.url}")
            if response.headers.get("Content-Type", "").split(";")[0].strip().lower() != "text/html":
                raise ValueError("Honour roll did not return HTML")
            chunks = []
            size = 0
            for chunk in response.iter_content(65536):
                size += len(chunk)
                if size > 2_000_000:
                    raise ValueError("Honour-roll response exceeds 2 MB")
                chunks.append(chunk)
            return b"".join(chunks)


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def sync(
    data_dir: Path, evidence_dir: Path, *, check: bool = False,
    diagnostics_dir: Path | None = None, today: date | None = None,
) -> bool:
    today = today or datetime.now(timezone.utc).date()
    year = today.year
    # Rollover needs a reviewed annual circular; never relabel last year's bills.
    manifest = json.loads((data_dir / "manifest.json").read_text())
    if year not in manifest["regularBudgetContributors"]["years"]:
        raise ValueError(f"No approved {year} assessments in manifest; manual annual setup required")
    path = data_dir / f"regular-budget-contributors-{year}.json"
    original = path.read_bytes()
    previous = json.loads(original)
    if diagnostics_dir is not None:
        atomic_write(diagnostics_dir / "baseline.json", original)
    if previous["meta"]["year"] != year:
        raise ValueError("Assessment file does not match the current calendar year")
    validate_snapshot(previous, today)
    content = fetch_current()
    if diagnostics_dir is not None:
        atomic_write(diagnostics_dir / "source.html", content)
    candidate = prepare_update(previous, content, today)
    changed = candidate != previous
    if changed:
        candidate["meta"]["sources"]["honour_roll"].update({
            "url": exporter.HONOUR_ROLL_CURRENT_URL,
            "sha256": hashlib.sha256(content).hexdigest(),
            "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        })
    encoded = (json.dumps(candidate, indent=2, ensure_ascii=False) + "\n").encode()
    report = {
        "year": year, "changed": changed, "check_only": check,
        "previous_as_of": previous["meta"]["as_of"], "as_of": candidate["meta"]["as_of"],
        "previous_paid_in_full": previous["meta"]["paid_in_full_count"],
        "paid_in_full": candidate["meta"]["paid_in_full_count"],
        "source_sha256": hashlib.sha256(content).hexdigest(),
    }
    if diagnostics_dir is not None:
        atomic_write(diagnostics_dir / "candidate.json", encoded)
        atomic_write(diagnostics_dir / "report.json", (json.dumps(report, indent=2) + "\n").encode())
    if changed and not check:
        # Detect edits during the fetch instead of overwriting them.
        if path.read_bytes() != original:
            raise ValueError("Published assessment file changed during sync; refusing to overwrite")
        atomic_write(evidence_dir / f"honourroll-{year}.html", content)
        atomic_write(path, encoded)
    print(json.dumps(report))
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fetch and validate without publishing changes")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "public/data")
    parser.add_argument("--evidence-dir", type=Path, default=ROOT / "data/honour-roll")
    parser.add_argument("--diagnostics-dir", type=Path)
    args = parser.parse_args()
    try:
        sync(args.data_dir, args.evidence_dir, check=args.check, diagnostics_dir=args.diagnostics_dir)
    except Exception as error:
        # Nonzero is essential: the build, commit and deployment must all stop.
        print(f"Honour-roll sync FAILED: {error}", file=sys.stderr)
        if args.diagnostics_dir is not None:
            try:
                atomic_write(args.diagnostics_dir / "error.txt", f"{error}\n".encode())
            except OSError:
                pass  # Preserve the original failure, including disk-full errors.
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
