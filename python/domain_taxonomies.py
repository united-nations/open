"""Load and validate versioned domain taxonomies shared with the frontend."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _load(filename: str) -> dict[str, Any]:
    path = DATA_DIR / filename
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("schema_version") != 1:
        raise ValueError(f"{path}: unsupported or missing schema_version")
    return payload


def _require_unique(rows: list[dict[str, Any]], field: str, context: str) -> None:
    values = [row[field] for row in rows]
    if len(values) != len(set(values)):
        raise ValueError(f"{context}: duplicate {field}")


def load_sdgs() -> dict[str, Any]:
    payload = _load("sdgs.json")
    goals = payload.get("goals", [])
    _require_unique(goals, "number", "sdgs.goals")
    if sorted(goal["number"] for goal in goals) != list(range(1, 18)):
        raise ValueError("sdgs.goals must contain each goal number from 1 to 17")
    return payload


def load_organization_taxonomies() -> dict[str, Any]:
    payload = _load("organization-taxonomies.json")
    for field in ("system_groupings", "regions", "contributor_statuses"):
        rows = payload.get(field, [])
        _require_unique(rows, "key", f"organization-taxonomies.{field}")
    instruments = payload.get("financing_instruments", [])
    _require_unique(instruments, "key", "organization-taxonomies.financing_instruments")
    _require_unique(instruments, "order", "organization-taxonomies.financing_instruments")
    return payload


def load_secretariat_taxonomies() -> dict[str, Any]:
    payload = _load("secretariat-taxonomies.json")
    parts = payload.get("budget_parts", [])
    _require_unique(parts, "code", "secretariat-taxonomies.budget_parts")
    if [part["code"] for part in parts] != [
        "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
        "XI", "XII", "XIII", "XIV",
    ]:
        raise ValueError("secretariat budget parts must be ordered I through XIV")

    for field in ("cost_classes", "funding_sources"):
        rows = payload.get(field, [])
        _require_unique(rows, "key", f"secretariat-taxonomies.{field}")
        _require_unique(rows, "order", f"secretariat-taxonomies.{field}")

    source_labels = [
        label
        for source in payload["funding_sources"]
        for label in source.get("source_labels", [])
    ]
    if len(source_labels) != len(set(source_labels)):
        raise ValueError("secretariat funding source labels must be unique")
    return payload
