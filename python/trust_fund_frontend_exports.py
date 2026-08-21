"""Export validated trust-fund schedules into compact frontend datasets.

The entity view uses current-period ``Total expenses``.  The contributor view
uses named rows preceding the printed voluntary-contribution total that
reconciles to the financial-performance statement.  Rows after that total can
belong to a second transfer schedule on the same physical page and are not
treated as contributions.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pandas as pd

DEFAULT_STAGE2 = Path("data/trust-fund-schedules/stage2")
DEFAULT_CROSSWALK = Path(
    "data/trust-fund-schedules/crosswalk/trust-fund-entity-crosswalk.csv"
)
DEFAULT_MANIFEST = Path("data/trust-fund-schedules/source-manifest.json")
DEFAULT_ENTITIES = Path("public/data/entities.json")
DEFAULT_OUTPUT = Path("public/data")

REPO_URL = "https://github.com/united-nations/transparency"

COUNTERPARTY_ALIASES = {
    "europena union": "European Union",
    "republic of korea": "Republic of Korea",
    "united states of america": "United States of America",
}

ADJUSTMENT_PATTERNS = (
    re.compile(r"present value adjustment", re.I),
    re.compile(r"^(?:from/\(to\)|\(to\)/from|to/from)(?:\s|$)", re.I),
)


def compact(value: Any) -> str:
    return " ".join(str(value).split())


def canonical_counterparty(value: str) -> str:
    name = compact(value)
    return COUNTERPARTY_ALIASES.get(name.casefold(), name)


def is_adjustment(value: str) -> bool:
    return any(pattern.search(value) for pattern in ADJUSTMENT_PATTERNS)


def as_int(value: Any) -> int:
    if pd.isna(value):
        return 0
    return int(round(float(value)))


def effective_flow_amount(row: pd.Series) -> int:
    """Return the printed row total across the two observed column layouts."""
    if pd.notna(row.get("total_usd")):
        return as_int(row["total_usd"])
    if pd.notna(row.get("refunds_transfers_adjustments_usd")):
        return as_int(row["refunds_transfers_adjustments_usd"])
    return as_int(row.get("monetary_usd")) + as_int(row.get("in_kind_usd"))


def source_for_year(manifest: list[dict[str, Any]], year: int) -> dict[str, Any]:
    return next(item for item in manifest if int(item["calendar_year"]) == year)


def json_dump(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False),
        encoding="utf-8",
    )


def entity_name(row: pd.Series, entity_names: dict[str, str] | None = None) -> str:
    if pd.notna(row.get("ppb_entity_name")):
        return compact(row["ppb_entity_name"])
    code = compact(row["audited_entity_code"])
    return (entity_names or {}).get(code, code)


def entity_acronym(row: pd.Series) -> str:
    if pd.notna(row.get("ppb_entity_acronym")):
        return compact(row["ppb_entity_acronym"])
    return compact(row["audited_entity_code"])


def build_entity_export(
    year: int,
    facts: pd.DataFrame,
    crosswalk: pd.DataFrame,
    source: dict[str, Any],
    entity_names: dict[str, str],
) -> dict[str, Any]:
    expenses = facts.loc[
        facts["calendar_year"].eq(year)
        & facts["period_year"].eq(year)
        & facts["statement_type"].eq("financial_performance")
        & facts["line_item"].eq("Total expenses")
    ].copy()
    if expenses.empty:
        raise ValueError(f"No current-period total expenses for {year}")
    if expenses.duplicated(["fund_code"]).any():
        raise ValueError(f"Duplicate total-expense facts for {year}")

    joined = expenses.merge(crosswalk, on="fund_code", how="left", validate="1:1")
    approved = joined["approved_for_aggregation"].fillna(False).astype(bool)
    mapped = joined.loc[approved].copy()
    unmapped = joined.loc[~approved].copy()
    all_total = int(joined["amount_usd"].sum())
    mapped_total = int(mapped["amount_usd"].sum())

    root_id = "trust-funds"
    part_id = "trust-funds~xb"
    section_id = "trust-funds~entities"
    common_source = {
        "symbol": source["symbol"],
        "url": source["landing_page_url"],
        "rowLabel": "Total expenses",
        "columnHeader": str(year),
    }
    nodes: list[dict[str, Any]] = [
        {
            "id": root_id,
            "parentId": None,
            "tier": "whole",
            "kind": "whole",
            "code": None,
            "label": "Mapped individual trust funds",
            "amount": mapped_total,
            "basis": "derived_from_printed_fund_totals",
            "values": {"extrabudgetary": mapped_total},
            "source": common_source,
        },
        {
            "id": part_id,
            "parentId": root_id,
            "tier": "part",
            "kind": "part",
            "code": "XB",
            "label": "Individual trust funds",
            "amount": mapped_total,
            "basis": "derived_from_printed_fund_totals",
            "values": {"extrabudgetary": mapped_total},
            "source": common_source,
        },
        {
            "id": section_id,
            "parentId": part_id,
            "tier": "section",
            "kind": "section",
            "code": "TF",
            "label": "Mapped Secretariat entities",
            "amount": mapped_total,
            "basis": "derived_from_printed_fund_totals",
            "values": {"extrabudgetary": mapped_total},
            "source": common_source,
        },
    ]

    for code, group in mapped.groupby("audited_entity_code", sort=True):
        first = group.iloc[0]
        amount = int(group["amount_usd"].sum())
        entity_id = f"trust-fund-entity:{code}"
        name = entity_name(first, entity_names)
        acronym = entity_acronym(first)
        nodes.append(
            {
                "id": entity_id,
                "parentId": section_id,
                "tier": "budget_unit",
                "kind": "entity",
                "code": code,
                "label": name,
                "amount": amount,
                "basis": "derived_from_printed_fund_totals",
                "values": {"extrabudgetary": amount},
                "unitType": "entity",
                "role": "source_node",
                "entity": {
                    "name": name,
                    "acronym": acronym,
                    "relationship": "trust_fund_crosswalk",
                },
                "source": common_source,
            }
        )
        for fund in group.sort_values("amount_usd", ascending=False).itertuples():
            fund_amount = as_int(fund.amount_usd)
            nodes.append(
                {
                    "id": f"{entity_id}:fund:{fund.fund_code}",
                    "parentId": entity_id,
                    "tier": "detail",
                    "kind": "allocation",
                    "code": fund.fund_code,
                    "label": fund.fund_name,
                    "amount": fund_amount,
                    "basis": "directly_printed",
                    "values": {"extrabudgetary": fund_amount},
                    "source": common_source,
                }
            )

    if sum(node["amount"] for node in nodes if node["parentId"] == section_id) != mapped_total:
        raise ValueError(f"Entity totals do not reconcile for {year}")

    return {
        "meta": {
            "stream": "trust_funds",
            "sourceKind": "trust_fund_schedule",
            "title": "Schedule of Individual Trust Funds",
            "label": f"Individual trust-fund expenses {year} (USD)",
            "measure": "IPSAS expenses",
            "year": year,
            "fiscalYear": str(year),
            "currency": "USD",
            "total": mapped_total,
            "scopeLabel": "Current-period expenses of trust funds with an approved entity crosswalk",
            "scopeWarning": (
                "This is gross fund-level accounting and is not additive to PPB or consolidated "
                "Secretariat expenditure. Entity assignments reconstruct the old open-data mapping."
            ),
            "fundingSources": ["extrabudgetary"],
            "fundingLabels": {"extrabudgetary": "Individual trust funds"},
            "documentSymbol": source["symbol"],
            "documentUrl": source["landing_page_url"],
            "verification": {
                "schedule_total_usd": str(all_total),
                "mapped_total_usd": str(mapped_total),
                "mapped_funds": str(len(mapped)),
                "unresolved_funds": str(len(unmapped)),
                "unresolved_fund_codes": ", ".join(sorted(unmapped["fund_code"])),
            },
            "source": {
                "repo": "transparency",
                "release": "trust-fund schedule extraction",
                "url": REPO_URL,
            },
        },
        "nodes": nodes,
    }


def selected_contribution_rows(
    year: int, flows: pd.DataFrame, statements: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Select named rows before each statement-reconciling printed total."""
    annual = flows.loc[
        flows["calendar_year"].eq(year)
        & flows["flow_type"].eq("voluntary_contribution")
    ].copy()
    annual["effective_amount_usd"] = annual.apply(effective_flow_amount, axis=1)
    statement = statements.loc[
        statements["calendar_year"].eq(year)
        & statements["period_year"].eq(year)
        & statements["statement_type"].eq("financial_performance")
        & statements["line_item"].eq("Voluntary contributions"),
        ["fund_code", "amount_usd"],
    ].copy()
    if statement.duplicated("fund_code").any():
        raise ValueError(f"Duplicate voluntary-contribution facts for {year}")

    selected: list[pd.DataFrame] = []
    reconciliation: list[dict[str, Any]] = []
    for fact in statement.itertuples(index=False):
        group = annual.loc[annual["fund_code"].eq(fact.fund_code)].sort_values(
            ["page", "source_y", "source_row_index"]
        )
        exact = group.loc[
            group["is_total"].astype(bool)
            & group["effective_amount_usd"].eq(int(fact.amount_usd))
        ]
        if exact.empty:
            if int(fact.amount_usd) != 0:
                raise ValueError(
                    f"{year} {fact.fund_code}: no printed total matches the statement"
                )
            rows = group.iloc[0:0]
        else:
            preferred = exact.loc[
                exact["counterparty"].str.casefold().isin({"total", "grand total"})
            ]
            total = (preferred if not preferred.empty else exact).iloc[0]
            rows = group.loc[
                (group["page"] < total["page"])
                | (
                    group["page"].eq(total["page"])
                    & (group["source_y"] < total["source_y"])
                )
            ]
            rows = rows.loc[~rows["is_total"].astype(bool)]
        named_total = int(rows["effective_amount_usd"].sum())
        reconciliation.append(
            {
                "fund_code": fact.fund_code,
                "statement_amount_usd": int(fact.amount_usd),
                "named_rows_amount_usd": named_total,
                "residual_usd": int(fact.amount_usd) - named_total,
            }
        )
        selected.append(rows)
    return (
        pd.concat(selected, ignore_index=True) if selected else annual.iloc[0:0],
        pd.DataFrame(reconciliation),
    )


def build_contributor_export(
    year: int,
    flows: pd.DataFrame,
    statements: pd.DataFrame,
    funds: pd.DataFrame,
    crosswalk: pd.DataFrame,
    source: dict[str, Any],
    entity_names: dict[str, str],
) -> dict[str, Any]:
    rows, reconciliation = selected_contribution_rows(year, flows, statements)
    fund_lookup = funds.set_index("fund_code")["fund_name"].to_dict()
    crosswalk_lookup = crosswalk.set_index("fund_code")
    rows["is_adjustment"] = rows["counterparty"].map(is_adjustment)
    contributor_rows = rows.loc[~rows["is_adjustment"]].copy()
    adjustment_rows = rows.loc[rows["is_adjustment"]].copy()
    contributor_rows["name"] = contributor_rows["counterparty"].map(
        canonical_counterparty
    )

    contributors: list[dict[str, Any]] = []
    for name, contributor in contributor_rows.groupby("name", sort=True):
        amount = int(contributor["effective_amount_usd"].sum())
        destinations: list[dict[str, Any]] = []
        for fund_code, destination in contributor.groupby("fund_code", sort=True):
            fund_amount = int(destination["effective_amount_usd"].sum())
            mapping = crosswalk_lookup.loc[fund_code]
            approved = bool(mapping["approved_for_aggregation"])
            destinations.append(
                {
                    "fund_code": fund_code,
                    "fund_name": fund_lookup[fund_code],
                    "entity_code": mapping["audited_entity_code"] if approved else None,
                    "entity_name": (
                        entity_name(mapping, entity_names) if approved else None
                    ),
                    "entity_id": (
                        f"trust-fund-entity:{mapping['audited_entity_code']}"
                        if approved
                        else None
                    ),
                    "amount_usd": fund_amount,
                }
            )
        groups = sorted(set(contributor["counterparty_group"].dropna()))
        contributors.append(
            {
                "name": name,
                "counterparty_group": groups[0] if len(groups) == 1 else "Mixed",
                "amount_usd": amount,
                "positive_amount_usd": int(
                    contributor.loc[
                        contributor["effective_amount_usd"] > 0,
                        "effective_amount_usd",
                    ].sum()
                ),
                "negative_amount_usd": int(
                    contributor.loc[
                        contributor["effective_amount_usd"] < 0,
                        "effective_amount_usd",
                    ].sum()
                ),
                "reported_names": sorted(set(contributor["counterparty"])),
                "destinations": sorted(
                    destinations, key=lambda item: item["amount_usd"], reverse=True
                ),
            }
        )
    contributors.sort(key=lambda item: item["amount_usd"], reverse=True)

    adjustments = [
        {
            "label": label,
            "amount_usd": int(group["effective_amount_usd"].sum()),
        }
        for label, group in adjustment_rows.groupby("counterparty", sort=True)
    ]
    statement_total = int(reconciliation["statement_amount_usd"].sum())
    named_total = int(reconciliation["named_rows_amount_usd"].sum())
    contributor_total = sum(item["amount_usd"] for item in contributors)
    adjustment_total = sum(item["amount_usd"] for item in adjustments)
    if contributor_total + adjustment_total != named_total:
        raise ValueError(f"Contributor rows do not reconcile for {year}")
    absolute_statement = int(reconciliation["statement_amount_usd"].abs().sum())
    absolute_residual = int(reconciliation["residual_usd"].abs().sum())
    completeness = (
        max(0.0, 1 - absolute_residual / absolute_statement)
        if absolute_statement
        else 1.0
    )
    unresolved_codes = set(
        crosswalk.loc[~crosswalk["approved_for_aggregation"].astype(bool), "fund_code"]
    )
    unresolved_total = int(
        contributor_rows.loc[
            contributor_rows["fund_code"].isin(unresolved_codes),
            "effective_amount_usd",
        ].sum()
    )

    return {
        "meta": {
            "year": year,
            "currency": "USD",
            "measure": "Recognized voluntary contributions",
            "statement_total_usd": statement_total,
            "named_rows_total_usd": named_total,
            "contributor_total_usd": contributor_total,
            "adjustment_total_usd": adjustment_total,
            "unallocated_residual_usd": statement_total - named_total,
            "named_row_completeness": round(completeness, 6),
            "unresolved_entity_amount_usd": unresolved_total,
            "source": {
                "symbol": source["symbol"],
                "url": source["landing_page_url"],
            },
            "method_note": (
                "Named contribution rows are retained only up to the printed total that "
                "reconciles to the fund's financial-performance statement. Present-value "
                "and internal-fund adjustments are reported separately."
            ),
            "mapping_note": (
                "Entity destinations are reconstructed organizational assignments for the "
                "fund, not proof that a donor financed a particular expense."
            ),
        },
        "contributors": contributors,
        "adjustments": adjustments,
        "reconciliation": reconciliation.to_dict("records"),
    }


def export_all(
    stage2: Path = DEFAULT_STAGE2,
    crosswalk_path: Path = DEFAULT_CROSSWALK,
    manifest_path: Path = DEFAULT_MANIFEST,
    entities_path: Path = DEFAULT_ENTITIES,
    output: Path = DEFAULT_OUTPUT,
) -> None:
    required = [
        stage2 / "funds.csv",
        stage2 / "statement-facts.csv",
        stage2 / "counterparty-flows.csv",
        crosswalk_path,
        manifest_path,
        entities_path,
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing trust-fund pipeline inputs: {missing}")
    funds = pd.read_csv(stage2 / "funds.csv")
    facts = pd.read_csv(stage2 / "statement-facts.csv")
    flows = pd.read_csv(stage2 / "counterparty-flows.csv")
    crosswalk = pd.read_csv(crosswalk_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    entities = json.loads(entities_path.read_text(encoding="utf-8"))
    entity_names = {
        item["entity"]: compact(item["entity_long"])
        for item in entities
        if item.get("entity") and item.get("entity_long")
    }
    output.mkdir(parents=True, exist_ok=True)
    years = sorted(int(year) for year in facts["calendar_year"].unique())
    for year in years:
        source = source_for_year(manifest, year)
        json_dump(
            output / f"budget-trust-funds-{year}.json",
            build_entity_export(year, facts, crosswalk, source, entity_names),
        )
        json_dump(
            output / f"trust-fund-contributors-{year}.json",
            build_contributor_export(
                year, flows, facts, funds, crosswalk, source, entity_names
            ),
        )
    print(f"Exported {len(years)} trust-fund entity and contributor datasets")
