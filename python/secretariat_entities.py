"""Load and validate the Secretariat entity classification source."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from utils import normalize_entity


SRC = Path("data/secretariat-entities.json")
EXPENSES_SRC = Path("data/un-secretariat-expenses.csv")
GROUP_IDS = {"secretariat", "spm", "pko", "other"}
MISSION_KINDS = {"pko", "spm", "support"}


def load_secretariat_entities() -> dict:
    data = json.loads(SRC.read_text())
    assert data["schema_version"] == 1
    assert set(data["groups"]) == GROUP_IDS

    orders = [group["order"] for group in data["groups"].values()]
    assert len(orders) == len(set(orders)), "Group display order must be unique"
    assert sum(group["field_legend"] for group in data["groups"].values()) == 3

    for code, entity in data["entities"].items():
        assert entity["group"] in GROUP_IDS, f"{code}: unknown group"
        assert entity["basis"], f"{code}: classification basis is required"

    locations = data["locations"]
    location_codes = [location["code"] for location in locations]
    assert len(location_codes) == len(set(location_codes)), (
        "Mission location codes must be unique"
    )
    for location in locations:
        assert location["kind"] in MISSION_KINDS
        entity = data["entities"].get(location["code"])
        if entity is None:
            continue
        expected_group = (
            "secretariat" if location["kind"] == "support" else location["kind"]
        )
        assert entity["group"] == expected_group, (
            f"{location['code']}: {location['kind']} location conflicts with "
            f"{entity['group']} classification"
        )

    aliases = data["aliases"]
    for alias, canonical in aliases.items():
        assert alias != canonical
        assert canonical in data["entities"] or canonical in location_codes

    locations_by_code = {location["code"]: location for location in locations}
    for code, entity in data["entities"].items():
        if entity["group"] not in {"pko", "spm"}:
            continue
        canonical = aliases.get(code, code)
        assert canonical in locations_by_code, (
            f"{code}: {entity['group']} classification has no map location"
        )
        assert locations_by_code[canonical]["kind"] == entity["group"], (
            f"{code}: map location kind conflicts with {entity['group']} classification"
        )

    if EXPENSES_SRC.exists():
        expenses = pd.read_csv(EXPENSES_SRC, usecols=["ENTITY"])
        expense_codes = {
            normalize_entity(str(code)) for code in expenses["ENTITY"].dropna().unique()
        }
        missing = sorted(expense_codes - set(data["entities"]))
        assert not missing, f"Missing Secretariat entity classifications: {missing}"

    return data
