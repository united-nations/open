"""Build an auditable trust-fund-to-Secretariat-entity crosswalk.

The schedule supplies stable three-character fund codes. The old Transparency
Gateway extract supplies a fund name in ``NOTE`` and its audited Secretariat
entity, priority area, and programme-budget section. This module joins those
sources conservatively: normalized exact names are automatic, reviewed aliases
are explicit input data, and unresolved funds remain unresolved.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import pandas as pd
from utils import normalize_entity

DEFAULT_FUNDS = Path("data/trust-fund-schedules/stage2/funds.csv")
DEFAULT_FACTS = Path("data/trust-fund-schedules/stage2/statement-facts.csv")
DEFAULT_OLD_OPEN = Path("data/un-secretariat-expenses.csv")
DEFAULT_REVIEW = Path("data/trust-fund-entity-crosswalk-review.csv")
DEFAULT_PPB_ENTITIES = Path("data/references/programme-budget-data-ppb-entities")
DEFAULT_OUTPUT = Path("data/trust-fund-schedules/crosswalk")

# Audited-extract identifiers and PPB entity-dimension acronyms are not one
# controlled vocabulary. These are institutional aliases, not fund mappings.
PPB_ENTITY_KEYS = {
    "DCO": "RC system",
    "OCT": "UNOCT",
    "OSC-SEA": "SEA Coordinator",
    "OSRSG-CAAC": "SRSG-CAAC",
    "OSRSG-SVC": "SRSG-SVC",
    "OSRSG-VAC": "SRSG-VAC",
    "UNOAU": "United Nations Office to the African Union",
    "VRA": "OVRA",
}


def normalize_fund_name(value: str) -> str:
    """Normalize presentation differences without deleting semantic words."""
    text = unicodedata.normalize("NFKD", str(value))
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = text.replace("&", " and ")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def joined(values: pd.Series) -> str:
    """Return sorted, pipe-delimited distinct non-null values."""
    return " | ".join(sorted({str(value) for value in values.dropna()}))


def load_old_open(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    required = {
        "PRIORITY_AREA",
        "PART_ID",
        "PART_DESCRIPTION",
        "SECTION_ID",
        "SECTION_DESCRIPTION",
        "ENTITY",
        "YEAR",
        "AMOUNT",
        "SOURCE_TYPE",
        "NOTE",
    }
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Old-open extract is missing columns: {sorted(missing)}")
    voluntary = frame.loc[
        frame["SOURCE_TYPE"].eq("Voluntary") & frame["NOTE"].notna()
    ].copy()
    voluntary["audited_entity_code"] = voluntary["ENTITY"].map(normalize_entity)
    voluntary["normalized_fund_name"] = voluntary["NOTE"].map(normalize_fund_name)
    return voluntary


def validate_old_open(voluntary: pd.DataFrame) -> dict[str, Any]:
    by_label = voluntary.groupby("NOTE", dropna=False).agg(
        entity_count=("audited_entity_code", "nunique"),
        priority_count=("PRIORITY_AREA", "nunique"),
        section_count=("SECTION_ID", "nunique"),
    )
    entity_ambiguous = by_label.loc[by_label["entity_count"].ne(1)]
    priority_ambiguous = by_label.loc[by_label["priority_count"].ne(1)]
    if not entity_ambiguous.empty:
        raise ValueError(
            "Old-open fund labels map to multiple entities: "
            f"{entity_ambiguous.index.tolist()}"
        )
    if not priority_ambiguous.empty:
        raise ValueError(
            "Old-open fund labels map to multiple priority areas: "
            f"{priority_ambiguous.index.tolist()}"
        )

    normalized = voluntary.groupby("normalized_fund_name").agg(
        entity_count=("audited_entity_code", "nunique"),
        priority_count=("PRIORITY_AREA", "nunique"),
    )
    normalized_ambiguous = normalized.loc[
        normalized["entity_count"].ne(1) | normalized["priority_count"].ne(1)
    ]
    if not normalized_ambiguous.empty:
        raise ValueError(
            "Normalized old-open names collapse incompatible mappings: "
            f"{normalized_ambiguous.index.tolist()}"
        )

    section_changes = []
    for label, row in by_label.loc[by_label["section_count"].gt(1)].iterrows():
        subset = voluntary.loc[voluntary["NOTE"].eq(label)]
        section_changes.append(
            {
                "old_open_fund_name": label,
                "audited_entity_code": subset["audited_entity_code"].iloc[0],
                "section_ids": joined(subset["SECTION_ID"]),
                "years": joined(subset["YEAR"]),
            }
        )
    return {
        "named_rows": len(voluntary),
        "distinct_labels": int(voluntary["NOTE"].nunique()),
        "distinct_entities": int(voluntary["audited_entity_code"].nunique()),
        "entity_ambiguous_labels": 0,
        "priority_ambiguous_labels": 0,
        "section_changing_labels": section_changes,
    }


def load_ppb_dimension(directory: Path) -> dict[str, dict[str, Any]]:
    """Index the stable PPB entity dimension across every local edition."""
    by_key: dict[str, dict[str, Any]] = {}
    for path in sorted(directory.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        entities = payload.get("entityDimension", {}).get("entities", [])
        for entity in entities:
            keys = [
                entity.get("acronym"),
                entity.get("canonicalName"),
                *entity.get("aliases", []),
            ]
            for key in filter(None, keys):
                normalized = normalize_fund_name(str(key))
                existing = by_key.get(normalized)
                if existing and existing["entityId"] != entity["entityId"]:
                    continue
                by_key[normalized] = entity
    return by_key


def ppb_match(
    audited_entity_code: str | None, ppb_index: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    if not audited_entity_code:
        return {
            "ppb_mapping_status": "not_applicable",
            "ppb_entity_id": None,
            "ppb_entity_name": None,
            "ppb_entity_acronym": None,
        }
    lookup = PPB_ENTITY_KEYS.get(audited_entity_code, audited_entity_code)
    entity = ppb_index.get(normalize_fund_name(lookup))
    if entity is None:
        return {
            "ppb_mapping_status": "not_in_ppb_dimension",
            "ppb_entity_id": None,
            "ppb_entity_name": None,
            "ppb_entity_acronym": None,
        }
    return {
        "ppb_mapping_status": "matched",
        "ppb_entity_id": entity["entityId"],
        "ppb_entity_name": entity["canonicalName"],
        "ppb_entity_acronym": entity.get("acronym"),
    }


def evidence_fields(subset: pd.DataFrame) -> dict[str, Any]:
    return {
        "old_open_fund_name": joined(subset["NOTE"]),
        "audited_entity_code": subset["audited_entity_code"].iloc[0],
        "priority_area": subset["PRIORITY_AREA"].iloc[0],
        "part_ids": joined(subset["PART_ID"]),
        "part_descriptions": joined(subset["PART_DESCRIPTION"]),
        "section_ids": joined(subset["SECTION_ID"]),
        "section_descriptions": joined(subset["SECTION_DESCRIPTION"]),
        "old_open_first_year": int(subset["YEAR"].min()),
        "old_open_last_year": int(subset["YEAR"].max()),
        "old_open_row_count": len(subset),
    }


def expense_fingerprint(
    fund_code: str,
    source_rows: pd.DataFrame,
    facts: pd.DataFrame,
) -> dict[str, Any]:
    schedule = facts.loc[
        facts["fund_code"].eq(fund_code)
        & facts["statement_type"].eq("financial_performance")
        & facts["line_item"].eq("Total expenses")
        & facts["calendar_year"].eq(facts["period_year"])
    ].set_index("calendar_year")["amount_usd"]
    old = source_rows.groupby("YEAR")["AMOUNT"].sum()
    years = sorted(set(schedule.index) & set(old.index))
    differences = [abs(int(schedule[year]) - round(float(old[year]))) for year in years]
    schedule_abs = sum(abs(int(schedule[year])) for year in years)
    return {
        "expense_overlap_years": " | ".join(map(str, years)),
        "expense_exact_years": sum(
            int(schedule[year]) == round(float(old[year])) for year in years
        ),
        "expense_absolute_difference_usd": sum(differences),
        "expense_schedule_absolute_usd": schedule_abs,
        "expense_relative_absolute_difference": (
            sum(differences) / schedule_abs if schedule_abs else None
        ),
    }


def empty_expense_fingerprint() -> dict[str, Any]:
    return {
        "expense_overlap_years": None,
        "expense_exact_years": None,
        "expense_absolute_difference_usd": None,
        "expense_schedule_absolute_usd": None,
        "expense_relative_absolute_difference": None,
    }


def build_crosswalk(
    funds: pd.DataFrame,
    facts: pd.DataFrame,
    voluntary: pd.DataFrame,
    review: pd.DataFrame,
    ppb_index: dict[str, dict[str, Any]],
) -> pd.DataFrame:
    required_review = {
        "fund_code",
        "decision",
        "old_open_fund_name",
        "candidate_entity_code",
        "confidence",
        "reason",
    }
    missing_review = required_review - set(review.columns)
    if missing_review:
        raise ValueError(f"Review file is missing columns: {sorted(missing_review)}")
    unexpected_decisions = set(review["decision"]) - {"map", "unresolved"}
    if unexpected_decisions:
        raise ValueError(f"Unexpected review decisions: {unexpected_decisions}")
    if funds["fund_code"].duplicated().any():
        raise ValueError("Schedule fund codes are not unique")
    if review["fund_code"].duplicated().any():
        raise ValueError("Review decisions contain duplicate fund codes")
    unknown_review_codes = set(review["fund_code"]) - set(funds["fund_code"])
    if unknown_review_codes:
        raise ValueError(
            f"Review decisions contain unknown codes: {unknown_review_codes}"
        )

    old_by_normalized = {
        name: group for name, group in voluntary.groupby("normalized_fund_name")
    }
    review_by_code = review.set_index("fund_code", drop=False)
    output: list[dict[str, Any]] = []

    for fund in funds.itertuples(index=False):
        normalized_name = normalize_fund_name(fund.fund_name)
        source_rows = old_by_normalized.get(normalized_name)
        method = "exact_normalized_name" if source_rows is not None else None
        decision = (
            review_by_code.loc[fund.fund_code]
            if fund.fund_code in review_by_code.index
            else None
        )

        base: dict[str, Any] = {
            "fund_code": fund.fund_code,
            "fund_name": fund.fund_name,
            "fund_first_year": int(fund.first_year),
            "fund_last_year": int(fund.last_year),
            "fund_observed_years": int(fund.observed_years),
            "mapping_status": "unresolved",
            "approved_for_aggregation": False,
            "mapping_method": None,
            "relation_type": None,
            "confidence": None,
            "mapping_reason": None,
            "candidate_entity_code": None,
        }

        if (
            source_rows is None
            and decision is not None
            and decision["decision"] == "map"
        ):
            target = str(decision["old_open_fund_name"])
            source_rows = voluntary.loc[voluntary["NOTE"].eq(target)]
            if source_rows.empty:
                raise ValueError(
                    f"Reviewed target for {fund.fund_code} is absent: {target}"
                )
            method = "curated_alias"

        if source_rows is not None:
            confidence = (
                str(decision["confidence"])
                if decision is not None and decision["decision"] == "map"
                else "high"
            )
            relation_type = "name_match" if confidence == "high" else "inferred"
            evidence = evidence_fields(source_rows)
            if decision is not None and decision["decision"] == "map":
                reviewed_entity = normalize_entity(
                    str(decision["candidate_entity_code"])
                )
                if reviewed_entity != evidence["audited_entity_code"]:
                    raise ValueError(
                        f"Reviewed entity for {fund.fund_code} is {reviewed_entity}, "
                        f"but its old-open target maps to {evidence['audited_entity_code']}"
                    )
            base.update(evidence)
            base.update(
                expense_fingerprint(fund.fund_code, source_rows, facts)
                if relation_type == "name_match"
                else empty_expense_fingerprint()
            )
            base.update(
                {
                    "mapping_status": "mapped",
                    "approved_for_aggregation": True,
                    "mapping_method": method,
                    "relation_type": relation_type,
                    "confidence": confidence,
                    "mapping_reason": (
                        str(decision["reason"])
                        if decision is not None and decision["decision"] == "map"
                        else "Schedule and old-open fund names match after presentation-only normalization."
                    ),
                }
            )
            base.update(ppb_match(base["audited_entity_code"], ppb_index))
        else:
            base.update(
                {
                    "old_open_fund_name": None,
                    "audited_entity_code": None,
                    "priority_area": None,
                    "part_ids": None,
                    "part_descriptions": None,
                    "section_ids": None,
                    "section_descriptions": None,
                    "old_open_first_year": None,
                    "old_open_last_year": None,
                    "old_open_row_count": None,
                    **empty_expense_fingerprint(),
                }
            )
            if decision is not None:
                if decision["decision"] != "unresolved":
                    raise ValueError(f"Unexpected review decision for {fund.fund_code}")
                base.update(
                    {
                        "confidence": None
                        if pd.isna(decision["confidence"])
                        else str(decision["confidence"]),
                        "mapping_reason": str(decision["reason"]),
                        "candidate_entity_code": None
                        if pd.isna(decision["candidate_entity_code"])
                        else str(decision["candidate_entity_code"]),
                    }
                )
            else:
                base["mapping_reason"] = (
                    "No matching old-open fund label or reviewed decision."
                )
            base.update(ppb_match(None, ppb_index))
        output.append(base)

    crosswalk = pd.DataFrame(output).sort_values("fund_code").reset_index(drop=True)
    if len(crosswalk) != len(funds) or crosswalk["fund_code"].duplicated().any():
        raise ValueError(
            "Crosswalk grain is not exactly one row per schedule fund code"
        )
    missing_decisions = crosswalk.loc[
        crosswalk["mapping_status"].eq("unresolved")
        & crosswalk["mapping_reason"].eq(
            "No matching old-open fund label or reviewed decision."
        ),
        "fund_code",
    ].tolist()
    if missing_decisions:
        raise ValueError(f"Unreviewed unresolved fund codes: {missing_decisions}")
    return crosswalk


def value_coverage(
    crosswalk: pd.DataFrame, facts: pd.DataFrame
) -> list[dict[str, Any]]:
    approved = set(crosswalk.loc[crosswalk["approved_for_aggregation"], "fund_code"])
    current = facts.loc[
        facts["calendar_year"].eq(facts["period_year"])
        & facts["statement_type"].eq("financial_performance")
        & facts["line_item"].isin(["Total expenses", "Voluntary contributions"])
    ].copy()
    current["mapped"] = current["fund_code"].isin(approved)
    rows = []
    for (year, line_item), group in current.groupby(["calendar_year", "line_item"]):
        total = int(group["amount_usd"].sum())
        mapped = int(group.loc[group["mapped"], "amount_usd"].sum())
        absolute_total = int(group["amount_usd"].abs().sum())
        absolute_mapped = int(group.loc[group["mapped"], "amount_usd"].abs().sum())
        rows.append(
            {
                "calendar_year": int(year),
                "measure": (
                    "expenses"
                    if line_item == "Total expenses"
                    else "voluntary_contributions"
                ),
                "total_usd": total,
                "mapped_usd": mapped,
                "unmapped_usd": total - mapped,
                "absolute_total_usd": absolute_total,
                "absolute_mapped_usd": absolute_mapped,
                "mapped_absolute_share": (
                    absolute_mapped / absolute_total if absolute_total else None
                ),
            }
        )
    return rows


def quality_profile(
    crosswalk: pd.DataFrame,
    old_profile: dict[str, Any],
    facts: pd.DataFrame,
    source_paths: dict[str, str] | None = None,
) -> dict[str, Any]:
    mapped = crosswalk.loc[crosswalk["mapping_status"].eq("mapped")]
    unresolved = crosswalk.loc[crosswalk["mapping_status"].eq("unresolved")]
    ppb_matched = mapped.loc[mapped["ppb_mapping_status"].eq("matched")]
    medium = mapped.loc[mapped["confidence"].ne("high")]
    comparable = mapped.loc[
        mapped["relation_type"].eq("name_match")
        & mapped["expense_schedule_absolute_usd"].fillna(0).gt(0)
    ].copy()
    fingerprint_difference = float(comparable["expense_absolute_difference_usd"].sum())
    fingerprint_schedule = float(comparable["expense_schedule_absolute_usd"].sum())
    largest_fingerprint_differences = comparable.nlargest(
        5, "expense_absolute_difference_usd"
    )[
        [
            "fund_code",
            "fund_name",
            "audited_entity_code",
            "expense_absolute_difference_usd",
            "expense_schedule_absolute_usd",
            "expense_relative_absolute_difference",
        ]
    ].to_dict("records")
    return {
        "validation_status": "pass",
        "expected_grain": "one row per Schedule of Individual Trust Funds fund_code",
        "source": source_paths
        or {
            "schedule_funds": str(DEFAULT_FUNDS),
            "schedule_statement_facts": str(DEFAULT_FACTS),
            "old_open_extract": str(DEFAULT_OLD_OPEN),
            "review_decisions": str(DEFAULT_REVIEW),
            "ppb_entity_dimension": str(DEFAULT_PPB_ENTITIES),
        },
        "input_checks": old_profile,
        "mapping": {
            "total_funds": len(crosswalk),
            "mapped_funds": len(mapped),
            "mapped_share": float(len(mapped) / len(crosswalk)),
            "exact_normalized_name": int(
                mapped["mapping_method"].eq("exact_normalized_name").sum()
            ),
            "curated_alias": int(mapped["mapping_method"].eq("curated_alias").sum()),
            "high_confidence": int(mapped["confidence"].eq("high").sum()),
            "medium_confidence": int(mapped["confidence"].eq("medium").sum()),
            "unresolved_funds": len(unresolved),
            "distinct_audited_entities": int(mapped["audited_entity_code"].nunique()),
            "ppb_entity_id_funds": len(ppb_matched),
            "ppb_entity_id_share": float(len(ppb_matched) / len(mapped)),
        },
        "non_high_confidence_mappings": medium[
            ["fund_code", "fund_name", "audited_entity_code", "mapping_reason"]
        ].to_dict("records"),
        "expense_fingerprint_diagnostic": {
            "purpose": "Independent diagnostic only; expense equality is not a join rule.",
            "comparable_mapped_funds": len(comparable),
            "within_one_percent": int(
                comparable["expense_relative_absolute_difference"].le(0.01).sum()
            ),
            "within_five_percent": int(
                comparable["expense_relative_absolute_difference"].le(0.05).sum()
            ),
            "weighted_absolute_difference_share": (
                fingerprint_difference / fingerprint_schedule
                if fingerprint_schedule
                else None
            ),
            "largest_absolute_differences": largest_fingerprint_differences,
        },
        "unresolved": unresolved[
            [
                "fund_code",
                "fund_name",
                "candidate_entity_code",
                "confidence",
                "mapping_reason",
            ]
        ].to_dict("records"),
        "value_coverage": value_coverage(crosswalk, facts),
        "limitations": [
            "The old-open mapping procedure is not published; exact names and reviewed aliases reproduce its observed fund-to-entity assignments but do not make them an official crosswalk.",
            "Old-open expense amounts do not exactly reconcile to schedule expense in every year; expense fingerprints are diagnostics only and are never used to auto-accept a mapping.",
            "An audited entity may own many funds. The output is one entity per mapped fund, not one fund per entity.",
            "Programme-budget section is not a stable key: three old-open fund labels change section during 2019-2023. Section history is evidence only.",
            "A trust-fund-to-entity relationship is organizational attribution. It does not prove that a donor financed a particular entity expense or subprogramme in the same year.",
            "The trust-fund schedule is gross fund accounting and contains transfers. Mapped amounts must not be added to PPB extrabudgetary expenditure or consolidated Secretariat totals.",
            "The audited entity universe is broader than the PPB entity dimension, especially for missions, envoys, pooled funds, and residual mechanisms; missing PPB entity IDs are expected.",
        ],
    }


def write_outputs(
    output: Path, crosswalk: pd.DataFrame, profile: dict[str, Any]
) -> None:
    output.mkdir(parents=True, exist_ok=True)
    crosswalk.to_csv(output / "trust-fund-entity-crosswalk.csv", index=False)
    records = (
        crosswalk.astype(object).where(pd.notna(crosswalk), None).to_dict("records")
    )
    (output / "trust-fund-entity-crosswalk.json").write_text(
        json.dumps(records, indent=2, ensure_ascii=False, allow_nan=False),
        encoding="utf-8",
    )
    crosswalk.loc[crosswalk["mapping_status"].eq("unresolved")].to_csv(
        output / "unresolved-review.csv", index=False
    )
    (output / "quality-profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False, allow_nan=False),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--funds", type=Path, default=DEFAULT_FUNDS)
    parser.add_argument("--statement-facts", type=Path, default=DEFAULT_FACTS)
    parser.add_argument("--old-open", type=Path, default=DEFAULT_OLD_OPEN)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--ppb-entities", type=Path, default=DEFAULT_PPB_ENTITIES)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    funds = pd.read_csv(args.funds)
    facts = pd.read_csv(args.statement_facts)
    voluntary = load_old_open(args.old_open)
    old_profile = validate_old_open(voluntary)
    review = pd.read_csv(args.review)
    ppb_index = load_ppb_dimension(args.ppb_entities)
    crosswalk = build_crosswalk(funds, facts, voluntary, review, ppb_index)
    profile = quality_profile(
        crosswalk,
        old_profile,
        facts,
        source_paths={
            "schedule_funds": str(args.funds),
            "schedule_statement_facts": str(args.statement_facts),
            "old_open_extract": str(args.old_open),
            "review_decisions": str(args.review),
            "ppb_entity_dimension": str(args.ppb_entities),
        },
    )
    write_outputs(args.output_dir, crosswalk, profile)
    print(json.dumps(profile, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
