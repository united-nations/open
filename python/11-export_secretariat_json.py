"""Export audited Secretariat expenditure in the shared budget-tree contract.

Source: ``data/un-secretariat-expenses.csv`` (2019-2023).

Two files are written per reporting year:

``budget-audited-ppb-{year}.json``
    whole -> budget part -> section -> entity. This is the programme-budget
    presentation of the audited data. Regular assessed, other assessed and
    voluntary amounts stay as an orthogonal funding-source breakdown on every
    node. In particular, peacekeeping support-account expenditure remains in
    the responsible Secretariat section (OICT in 29C, DOS in 29B, and so on).

``budget-audited-pko-{year}.json``
    whole -> mission. Only separately assessed mission-account expenditure is
    here. The support account is not a mission account and is therefore not
    moved into this tree.

The split is based on the source documents, not on ``SOURCE_TYPE`` alone:
``Other Assessed`` also includes the support account and the residual mechanism.
Every output node carries ``values`` using the same three keys as the PPB export,
so the frontend can use one renderer and one funding-shade legend for both.
"""

import json
from pathlib import Path

import pandas as pd

from utils import normalize_entity


SRC = Path("data/un-secretariat-expenses.csv")
OUT = Path("public/data")

PART_ID_FIXES = {"ViII": "VIII"}
PART_DESC_FIXES = {
    "Public information": "Global Communications",
    "Safety and Security": "Safety and security",
}

# Consolidated performance reports for the individual peacekeeping mission
# accounts. Support-account reports (for example A/78/638) are deliberately
# absent: those rows stay in the programme-section tree as other assessed.
MISSION_ACCOUNT_REFERENCES = {
    "A/74/736",
    "A/75/786",
    "A/76/717",
    "A/77/779",
    "A/78/726",
}

SUPPORT_ACCOUNT_REFERENCES = {
    "A/74/743",
    "A/75/656",
    "A/76/596",
    "A/77/631",
    "A/78/638",
}

OTHER_ASSESSED_NON_PK_REFERENCES = {
    "A/75/383",
    "ST/ADM/SER.B/1010",
    "ST/ADM/SER.B/1025",
    "A/77/528",
    "A/79/555",
}

SOURCE_KEYS = {
    "Regular assessed": "regular_budget",
    "Other Assessed": "other_assessed",
    "Voluntary": "extrabudgetary",
}

SOURCE_META = {
    "repo": "open.un.org",
    "release": "audited financial statements extract",
    "url": "https://open.un.org/un-secretariat-financials/expenses?tab=second",
}


def load() -> pd.DataFrame:
    df = pd.read_csv(SRC).rename(
        columns={
            "PRIORITY_AREA": "priority_area",
            "PART_ID": "part_id",
            "PART_DESCRIPTION": "part_desc",
            "SECTION_ID": "section_id",
            "SECTION_DESCRIPTION": "section_desc",
            "ENTITY": "entity",
            "YEAR": "year",
            "FINANCIAL_YEAR": "financial_year",
            "AMOUNT": "amount",
            "SOURCE_TYPE": "source_type",
            "REFERENCE": "reference",
            "NOTE": "note",
        }
    )
    df["entity"] = df["entity"].apply(normalize_entity)
    df["part_id"] = df["part_id"].replace(PART_ID_FIXES)
    df["part_desc"] = df["part_desc"].replace(PART_DESC_FIXES)
    df["section_id"] = df["section_id"].astype(str)

    unexpected_sources = set(df["source_type"]) - set(SOURCE_KEYS)
    assert not unexpected_sources, f"Unexpected source types: {unexpected_sources}"

    other_assessed_refs = set(
        df.loc[df["source_type"] == "Other Assessed", "reference"]
    )
    classified_refs = (
        MISSION_ACCOUNT_REFERENCES
        | SUPPORT_ACCOUNT_REFERENCES
        | OTHER_ASSESSED_NON_PK_REFERENCES
    )
    assert other_assessed_refs == classified_refs, (
        "Every Other Assessed reference must be explicitly classified; "
        f"missing={other_assessed_refs - classified_refs}, "
        f"unused={classified_refs - other_assessed_refs}"
    )
    return df


def source_values(frame: pd.DataFrame) -> dict[str, float]:
    grouped = frame.groupby("source_type", dropna=False)["amount"].sum()
    return {
        SOURCE_KEYS[source_type]: round(float(amount), 2)
        for source_type, amount in grouped.items()
        if abs(float(amount)) >= 0.005
    }


def amount_of(frame: pd.DataFrame) -> float:
    return round(float(frame["amount"].sum()), 2)


def entity_node(entity: str, parent_id: str, frame: pd.DataFrame) -> dict:
    return {
        "id": f"{parent_id}~entity-{entity.lower()}",
        "parentId": parent_id,
        "tier": "budget_unit",
        "kind": "entity",
        "code": entity,
        "label": entity,
        "amount": amount_of(frame),
        "basis": "derived_from_audited_rows",
        "values": source_values(frame),
        "unitType": "entity",
        "role": "source_node",
        "entity": {
            "name": entity,
            "acronym": entity,
            "relationship": "audited_entity",
        },
    }


def build_programme(year: int, frame: pd.DataFrame) -> dict:
    nodes: list[dict] = []
    root_id = "audited-programme"
    nodes.append(
        {
            "id": root_id,
            "parentId": None,
            "tier": "whole",
            "kind": "whole",
            "code": None,
            "label": "Programme budget sections",
            "amount": amount_of(frame),
            "basis": "derived_from_audited_rows",
            "values": source_values(frame),
        }
    )

    parts = (
        frame[["part_id", "part_desc"]]
        .drop_duplicates()
        .sort_values(["part_id", "part_desc"])
    )
    for part in parts.itertuples(index=False):
        part_frame = frame[frame["part_id"] == part.part_id]
        part_id = f"audited-part-{part.part_id}"
        nodes.append(
            {
                "id": part_id,
                "parentId": root_id,
                "tier": "part",
                "kind": "part",
                "code": part.part_id,
                "label": part.part_desc,
                "amount": amount_of(part_frame),
                "basis": "derived_from_audited_rows",
                "values": source_values(part_frame),
            }
        )

        # A source variant such as "Political affairs- SPM" must not create a
        # second copy of the same numbered section. Prefer the shortest label,
        # which is the canonical section heading in the observed variants.
        section_rows = [
            (section_id, min(group["section_desc"].dropna(), key=len))
            for section_id, group in part_frame.groupby("section_id", sort=True)
        ]
        for section_id_value, section_desc in section_rows:
            section_frame = part_frame[
                part_frame["section_id"] == section_id_value
            ]
            section_id = f"{part_id}~section-{section_id_value.lower()}"
            nodes.append(
                {
                    "id": section_id,
                    "parentId": part_id,
                    "tier": "section",
                    "kind": "section",
                    "code": section_id_value,
                    "label": section_desc,
                    "amount": amount_of(section_frame),
                    "basis": "derived_from_audited_rows",
                    "values": source_values(section_frame),
                }
            )
            for entity, entity_frame in section_frame.groupby(
                "entity", sort=True
            ):
                nodes.append(entity_node(entity, section_id, entity_frame))

    # Exact arithmetic at every edge is the contract BudgetTreemap relies on.
    by_parent: dict[str, list[dict]] = {}
    for node in nodes:
        if node["parentId"]:
            by_parent.setdefault(node["parentId"], []).append(node)
    by_id = {node["id"]: node for node in nodes}
    for parent_id, children in by_parent.items():
        parent = by_id[parent_id]
        assert abs(sum(child["amount"] for child in children) - parent["amount"]) < 1

    return {
        "meta": {
            "stream": "ppb",
            "title": "Audited Secretariat expenditure",
            "label": f"Audited Secretariat expenditure {year} (USD)",
            "measure": "expenditure",
            "year": year,
            "fiscalYear": str(year),
            "currency": "USD",
            "total": nodes[0]["amount"],
            "fundingSources": list(SOURCE_KEYS.values()),
            "fundingLabels": {
                "regular_budget": "Regular assessed",
                "other_assessed": "Other assessed",
                "extrabudgetary": "Voluntary",
            },
            "partial": False,
            "scopeLabel": (
                "Programme budget sections, excluding mission-account assessments"
            ),
            "scopeWarning": (
                "Regular assessed, other assessed and voluntary expenditure are "
                "shown together in their programme-budget sections. Other assessed "
                "support-account resources remain with the Headquarters entities "
                "they finance. Separately assessed mission accounts are shown in "
                "the Peacekeeping block below."
            ),
            "sourceKind": "audited",
            "source": SOURCE_META,
        },
        "nodes": nodes,
    }


def build_peacekeeping(year: int, frame: pd.DataFrame) -> dict:
    root_id = "audited-missions"
    nodes: list[dict] = [
        {
            "id": root_id,
            "parentId": None,
            "tier": "whole",
            "kind": "whole",
            "code": None,
            "label": "Peacekeeping mission accounts",
            "amount": amount_of(frame),
            "basis": "derived_from_audited_rows",
            "values": source_values(frame),
        }
    ]
    for entity, mission_frame in frame.groupby("entity", sort=True):
        nodes.append(
            {
                "id": entity,
                "parentId": root_id,
                "tier": "mission",
                "kind": "mission",
                "code": entity,
                "label": entity,
                "amount": amount_of(mission_frame),
                "basis": "derived_from_audited_rows",
                "values": source_values(mission_frame),
                "mission": entity,
            }
        )

    assert abs(sum(node["amount"] for node in nodes[1:]) - nodes[0]["amount"]) < 1
    # The audited extract keys each peacekeeping cycle by its ending calendar
    # year. Its FINANCIAL_YEAR field is inconsistent in 2021 and 2022, where it
    # contains only that ending year, so derive the July-June label here.
    period_label = f"{year - 1}/{str(year)[-2:]}"
    return {
        "meta": {
            "stream": "pko",
            "title": "Peacekeeping mission accounts",
            "label": f"Audited peacekeeping mission expenditure {period_label} (USD)",
            "measure": "expenditure",
            "year": year,
            "fiscalYear": period_label,
            "currency": "USD",
            "total": nodes[0]["amount"],
            "fundingSources": list(SOURCE_KEYS.values()),
            "fundingLabels": {
                "regular_budget": "Regular assessed",
                "other_assessed": "Other assessed",
                "extrabudgetary": "Voluntary",
            },
            "partial": False,
            "scopeLabel": "Separately assessed peacekeeping mission accounts",
            "scopeWarning": (
                "This block contains the mission-account performance-report rows "
                "only. The peacekeeping support account is reported as other "
                "assessed expenditure in the responsible programme-budget "
                "sections above."
            ),
            "sourceKind": "audited",
            "source": SOURCE_META,
        },
        "nodes": nodes,
    }


def export() -> None:
    df = load()
    years = sorted(int(year) for year in df["year"].unique())
    print(f"Loaded {len(df)} rows, years {years[0]}-{years[-1]}")

    for year in years:
        year_frame = df[df["year"] == year].copy()
        mission_mask = year_frame["reference"].isin(MISSION_ACCOUNT_REFERENCES)
        mission_frame = year_frame[mission_mask]
        programme_frame = year_frame[~mission_mask]

        programme = build_programme(year, programme_frame)
        peacekeeping = build_peacekeeping(year, mission_frame)
        raw_total = amount_of(year_frame)
        split_total = programme["meta"]["total"] + peacekeeping["meta"]["total"]
        assert abs(split_total - raw_total) < 1, (
            f"{year}: split {split_total} != raw {raw_total}"
        )

        ppb_path = OUT / f"budget-audited-ppb-{year}.json"
        pko_path = OUT / f"budget-audited-pko-{year}.json"
        ppb_path.write_text(json.dumps(programme, indent=2))
        pko_path.write_text(json.dumps(peacekeeping, indent=2))
        print(
            f"{year}: programme ${programme['meta']['total']/1e9:.2f}B + "
            f"missions ${peacekeeping['meta']['total']/1e9:.2f}B = "
            f"${raw_total/1e9:.2f}B ✓"
        )


if __name__ == "__main__":
    export()
