"""Export current CEB contributor observations and reconciled four-type totals.

Unresolved historical financing records remain inspectable, but are not added
on top of already reconciled financing controls. Source category is an
observation dimension, independently of the contributor's canonical identity.
"""
import json
from collections import defaultdict
from pathlib import Path

import pandas as pd

from revenue_categories import rev_category
from utils import MEMBERSHIP_NAME_ALIASES, normalize_entity

YEARS = []
OUT = Path("public/data")
FINANCING_KEYS = {"Assessed": "assessed", "Voluntary un-earmarked": "voluntary_unearmarked",
                  "Voluntary earmarked": "voluntary_earmarked", "Other": "other"}


def load_data():
    global YEARS
    fused = pd.read_csv("data/ceb/fused/revenue_by_contributor.csv")
    control_years = set(pd.read_csv("data/ceb/clean/revenue.csv").calendar_year)
    fused = fused[fused.year.isin(control_years)].copy()
    YEARS = sorted(int(year) for year in fused.year.unique())
    fused["entity"] = fused.entity.map(normalize_entity)
    fused["rev_cat"] = fused.rev_type.map(lambda value: rev_category(value) if pd.notna(value) else None)
    states = pd.read_csv("data/ceb/member_states.csv")
    state_info = {row.country: {"status": row.status} for _, row in states.iterrows()}
    return fused, state_info


def _kind(row):
    # Old synthetic test fixtures may supply only is_other.
    return row.get("record_kind", "calculated_balance" if row.get("is_other", False) else "reported_named")


def _resolved(row):
    return pd.notna(row.get("rev_cat"))


def _add_contribution(target, entity, instrument, amount):
    target.setdefault(entity, {})[instrument] = target.get(entity, {}).get(instrument, 0) + float(amount)


def _sum_contributions(contributions):
    return sum(sum(instruments.values()) for instruments in contributions.values())


def _unresolved_record(row):
    record = {"sourceCode": str(row.get("source_rev_type", "")), "entity": row["entity"],
              "amount": float(row["amount"]), "category": row["donor_type"],
              "categoryCode": row.get("contrib_code", "Unknown")}
    for source, key in [("source_donor_name", "sourceName"), ("source_contrib_type", "sourceCategory"),
                        ("source_file", "sourceFile"), ("source_row", "sourceRow")]:
        value = row.get(source)
        if value is not None and pd.notna(value):
            record[key] = int(value) if key == "sourceRow" else str(value)
    return record


def export_donors_json(df, state_info):
    for path in OUT.glob("donors-*.json"):
        suffix = path.stem.removeprefix("donors-")
        if suffix.isdigit() and int(suffix) not in YEARS:
            path.unlink()
    for year in YEARS:
        donors = {}
        for name, rows in df[df.year == year].groupby("donor_name", sort=True):
            categories = sorted(rows.donor_type.unique().tolist())
            kinds = set(rows.apply(_kind, axis=1))
            kind = "calculated_balance" if kinds == {"calculated_balance"} else "reported_aggregate" if "reported_aggregate" in kinds else "reported_named"
            government = categories == ["Government"]
            membership_key = MEMBERSHIP_NAME_ALIASES.get(name, name)
            donor = {"status": state_info.get(membership_key, {}).get("status", "nonmember") if government else "organization",
                     "category": categories[0] if len(categories) == 1 else "Multiple categories",
                     "categories": categories, "record_kind": kind,
                     "is_other": kind == "calculated_balance", "contributions": {}, "categoryContributions": {},
                     "unresolvedContributions": {}, "unresolvedFinancingRecords": []}
            for _, row in rows.iterrows():
                amount, entity, category = float(row.amount), row.entity, row.donor_type
                if _resolved(row):
                    _add_contribution(donor["contributions"], entity, row.rev_cat, amount)
                    _add_contribution(donor["categoryContributions"].setdefault(category, {}), entity, row.rev_cat, amount)
                else:
                    donor["unresolvedContributions"][entity] = donor["unresolvedContributions"].get(entity, 0) + amount
                    donor["unresolvedFinancingRecords"].append(_unresolved_record(row))
            donor["total"] = _sum_contributions(donor["contributions"])
            donor["unresolvedTotal"] = sum(donor["unresolvedContributions"].values())
            donor["financingIncomplete"] = bool(donor["unresolvedFinancingRecords"])
            donors[name] = donor
        (OUT / f"donors-{year}.json").write_text(json.dumps(donors, indent=2, allow_nan=False) + "\n")
        print(f"donors-{year}.json: {len(donors)} contributors")


def export_entity_revenue_json(df):
    control_years = set(pd.read_csv("data/ceb/clean/revenue.csv").calendar_year)
    for year in sorted(control_years):
        entities = {}
        for entity, rows in df[df.year == year].groupby("entity", sort=True):
            resolved = rows[rows.rev_cat.notna()]
            by_type = resolved.groupby("rev_cat").amount.sum().to_dict()
            by_donor = []
            for name, observations in rows.groupby("donor_name", sort=True):
                known = observations[observations.rev_cat.notna()]
                unresolved = observations[observations.rev_cat.isna()]
                entry = {"donor": name, "total": float(known.amount.sum()),
                         "record_kind": _kind(observations.iloc[0]),
                         **{key: float(value) for key, value in known.groupby("rev_cat").amount.sum().items()},
                         "unresolvedTotal": float(unresolved.amount.sum()), "financingIncomplete": not unresolved.empty}
                by_donor.append(entry)
            entities[entity] = {"total": float(resolved.amount.sum()), "year": int(year),
                                "by_type": by_type, "by_donor": sorted(by_donor, key=lambda row: (-row["total"], row["donor"]))}
        (OUT / f"entity-revenue-{year}.json").write_text(json.dumps(entities, indent=2, allow_nan=False) + "\n")
        print(f"entity-revenue-{year}.json: {len(entities)} organizations")


def export_coverage_json():
    sources = {key: set(pd.read_csv(f"data/ceb/clean/{name}.csv").calendar_year)
               for key, name in {"controls": "revenue", "government": "revenue_government_donors",
                                 "nonGovernment": "revenue_non_gov_donors"}.items()}
    fused = pd.read_csv("data/ceb/fused/revenue_by_contributor.csv")
    coverage = {}
    for year in YEARS:
        unresolved = fused[(fused.year == year) & fused.rev_type.isna()]
        notes = []
        if year not in sources["government"]:
            notes.append("Government donor detail is unavailable. Remaining revenue is Unattributed, not non-government funding.")
        if not unresolved.empty:
            notes.append("Some historical non-government source records have unresolved financing codes. They are available separately and excluded from additive four-type contributor totals; their financing allocation is not inferred.")
        coverage[year] = {key: year in values for key, values in sources.items()} | {
            "note": " ".join(notes) or None, "unresolvedFinancingRows": len(unresolved),
            "unresolvedFinancingAmount": float(unresolved.amount.sum()),
        }
    (OUT / "revenue-coverage.json").write_text(json.dumps(coverage, indent=2) + "\n")


def _point(rows, year):
    known = rows[rows.rev_cat.notna()]
    point = {"year": int(year), **dict.fromkeys(FINANCING_KEYS.values(), 0), "total": float(known.amount.sum())}
    for category, amount in known.groupby("rev_cat").amount.sum().items():
        point[FINANCING_KEYS[category]] = float(amount)
    unresolved = rows[rows.rev_cat.isna()]
    point["unresolvedTotal"] = float(unresolved.amount.sum())
    point["financingIncomplete"] = not unresolved.empty
    return point


def _observed_point(rows, year):
    point = _point(rows, year)
    if rows.empty:
        point["available"] = False
    return point


def export_contributor_trends_json(df):
    balance = (df.donor_name == "Unattributed") & (df.apply(_kind, axis=1) == "calculated_balance")
    attributed = df[~balance]
    nongov = attributed[attributed.donor_type != "Government"]
    categories = sorted(nongov.donor_type.unique().tolist())
    aggregates = {key: [] for key in ["gov", "non-gov", "unattributed", "all", *[f"cat:{category}" for category in categories]]}
    for year in YEARS:
        rows = df[df.year == year]
        year_balance = (rows.donor_name == "Unattributed") & (rows.apply(_kind, axis=1) == "calculated_balance")
        government = (rows.donor_type == "Government") & ~year_balance
        groups = {"gov": rows[government], "non-gov": rows[~government & ~year_balance],
                  "unattributed": rows[year_balance], "all": rows}
        groups.update({f"cat:{category}": rows[(rows.donor_type == category) & ~year_balance] for category in categories})
        for key, group in groups.items():
            point = _point(group, year)
            if key == "all":
                # All financing totals are the reconciled controls. Missing
                # attribution does not make these four control values unknown.
                point["attributionIncomplete"] = point["financingIncomplete"]
                point["financingIncomplete"] = False
            aggregates[key].append(point)
    contributors = {}
    for name, rows in df.groupby("donor_name", sort=True):
        contributors[name] = []
        for year in YEARS:
            observations = rows[rows.year == year]
            point = _observed_point(observations, year)
            contributors[name].append(point)
    category_contributors = {}
    for category, rows in attributed.groupby("donor_type", sort=True):
        category_contributors[category] = {
            name: [_observed_point(observations[observations.year == year], year) for year in YEARS]
            for name, observations in rows.groupby("donor_name", sort=True)
        }
    output = {"meta": {"years": YEARS,
                        "governmentContributors": sorted(attributed[attributed.donor_type == "Government"].donor_name.unique().tolist()),
                        "nonGovContributors": sorted(nongov.donor_name.unique().tolist()),
                        "nonGovCategories": {category: sorted(nongov[nongov.donor_type == category].donor_name.unique().tolist()) for category in categories}},
              "aggregates": aggregates, "contributors": contributors, "categoryContributors": category_contributors}
    (OUT / "contributor-trends.json").write_text(json.dumps(output, indent=2, allow_nan=False) + "\n")
    print(f"contributor-trends.json: {len(contributors)} contributors, {len(categories)} source categories")


if __name__ == "__main__":
    frame, states = load_data()
    export_coverage_json()
    export_donors_json(frame, states)
    export_entity_revenue_json(frame)
    export_contributor_trends_json(frame)
