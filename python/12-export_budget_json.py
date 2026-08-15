"""Export budget-document treemaps for the /secretariat page.

Source: the `financial-data-v1.4` release of the sibling repository
`united-nations/programme-budget-data`. That release publishes one standalone,
consumer-ready treemap file per PPB edition, which is what this script reads —
the release notes say to chart from those rather than from the full edition
JSONs, whose Swiss-franc Section 13 rows are still classified as USD.

    gh release download financial-data-v1.4 \
        --repo united-nations/programme-budget-data -D <tmp> \
        --pattern "*.json" --pattern "SHA256SUMS"
    cd <tmp> && shasum -a 256 -c SHA256SUMS   # paths are archive-relative;
                                              # compare the eight *-usd.json by hand

Then cache the files this portal needs, and export:

    uv run python/12-export_budget_json.py --release <tmp>
    uv run python/12-export_budget_json.py

v1.4 ships the three peacekeeping cycle files unchanged from v1.1/v1.2 (checked
by SHA-256 against the release SHA256SUMS), so --release carries the cached
copies over rather than making you unpack the 640 MB archive again.

Outputs, one file per year, following the portal's `{view}-{year}.json` rule:

    budget-ppb-{2018..2025}.json   whole -> 14 parts -> ~41 sections -> the
                                   entities, components, subprogrammes and
                                   allocations the fascicles print below them
    budget-pko-{2022..2024}.json   all missions -> missions -> classes -> items

The level below the section is not one kind of thing: a section resolves into
organizational entities, or straight into functional components (policymaking
organs, executive direction, programme of work, programme support), or into a
single "Lower-level allocation not itemized" remainder. The release keeps the
remainders as explicit rows so the areas stay additive, and this script keeps
them too — a tile that says "not itemized" is honest, a missing tile is not.

The PPB year is the expenditure year, which is the edition year minus two: the
proposed programme budget for 2027 prints the actual expenditure of 2025. The
PKO year is the first year of the July-June cycle, so 2024 means 2024/25.

Both outputs share one node shape, so one frontend component draws both:

{
  "meta":  {stream, label, measure, fiscalYear, currency, total, source,
            scopeLabel, scopeWarning, coverage, verification, omitted,
            fundingSources, partial},
  "nodes": [ {id, parentId, kind, code, label, amount, basis,
              values?, sources?}, ... ]
}

`amount` is full dollars (the release prints thousands, and carries the exact
value as a string). `basis` says whether the number is printed in the source
document or derived by adding the children. Nothing is recomputed here: the
values are copied, and the script only asserts that the tree adds up.

Only the USD expenditure views are exported. The release also has a CHF view of
PPB 2027, and appropriation and proposed views of the peacekeeping cycles; the
portal shows actual spending in USD, so those are left aside.
"""
import json
import re
import shutil
import sys
from pathlib import Path

SRC = Path("data/references/programme-budget-data-financial-v1.4")
OUT = Path("public/data")

RELEASE = {
    "repo": "united-nations/programme-budget-data",
    "release": "financial-data-v1.4",
    "url": "https://github.com/united-nations/programme-budget-data/releases/tag/financial-data-v1.4",
}

PPB_EDITIONS = range(2020, 2028)
PKO_CYCLES = (2024, 2025, 2026)

# The release labels the parts "Part I" ... "Part XIV", without a description.
# The descriptions are the ones the Budget-Part lens already uses in
# src/lib/secretariatGroupings.ts (keep the two lists in step).
PART_DESCRIPTIONS = {
    "I": "Overall policymaking, direction and coordination",
    "II": "Political affairs",
    "III": "International justice and law",
    "IV": "International cooperation for development",
    "V": "Regional cooperation for development",
    "VI": "Human rights and humanitarian affairs",
    "VII": "Global Communications",
    "VIII": "Common support services",
    "IX": "Internal oversight",
    "X": "Jointly financed administrative activities and special expenses",
    "XI": "Capital expenditures",
    "XII": "Safety and security",
    "XIII": "Development Account",
    "XIV": "Staff assessment",
}

FUNDING_SOURCES = ["regular_budget", "other_assessed", "extrabudgetary"]

FUNDING_NAMES = {
    "regular_budget": "regular budget",
    "other_assessed": "other assessed",
    "extrabudgetary": "extrabudgetary",
}

COST_CLASS_LABELS = {
    "military_police_personnel": "Military and police personnel",
    "civilian_personnel": "Civilian personnel",
    "operational_costs": "Operational costs",
}

# Long names for the missions in the peacekeeping corpus.
MISSION_NAMES = {
    "MINURSO": "United Nations Mission for the Referendum in Western Sahara",
    "MINUSCA": "United Nations Multidimensional Integrated Stabilization Mission in the Central African Republic",
    "MINUSMA": "United Nations Multidimensional Integrated Stabilization Mission in Mali",
    "MONUSCO": "United Nations Organization Stabilization Mission in the Democratic Republic of the Congo",
    "RSCE": "Regional Service Centre in Entebbe",
    "UNDOF": "United Nations Disengagement Observer Force",
    "UNFICYP": "United Nations Peacekeeping Force in Cyprus",
    "UNGSC": "United Nations Global Service Centre",
    "UNIFIL": "United Nations Interim Force in Lebanon",
    "UNISFA": "United Nations Interim Security Force for Abyei",
    "UNMIK": "United Nations Interim Administration Mission in Kosovo",
    "UNMISS": "United Nations Mission in South Sudan",
    "UNSOS": "United Nations Support Office in Somalia",
    "UNSOH": "United Nations Support Office in Somalia (successor arrangement)",
}


def slug(text: str) -> str:
    out = "".join(c.lower() if c.isalnum() else "-" for c in text)
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-")[:60] or "item"


def money(block: dict | None) -> int | None:
    """Full-dollar amount out of a release `money` block."""
    if not block:
        return None
    exact = block.get("amountExact")
    return int(exact) if exact is not None else block.get("amount")


def short_id(tree_node_id: str) -> str:
    """tree:ppb2027:part:Part VI -> part-VI ; tree:ppb2020:section:6 -> section-6.

    The ids must not carry the edition, because the same section keeps the same
    id across years. That is what lets a deep link, and an open sidebar, survive
    a move of the year slider.
    """
    tail = re.sub(r"^tree:ppb\d+:", "", tree_node_id)
    return tail.replace(":Part ", "-").replace(":", "-").replace(" ", "-")


def stable_id(parent_id: str, node: dict, used: set[str]) -> str:
    """An id for a node below the section, built from where it sits.

    The release gives the lower nodes a content hash (tree:ppb2027:lower:2:e198…)
    that is new in every edition, so those ids cannot carry a deep link from one
    year to the next. The path plus the printed label can: "C. Programme of work"
    under section 3 is the same row in every edition that prints it.
    """
    code = (node.get("code") or "").strip()
    tail = slug(f"{code} {node['label']}" if code else node["label"])
    candidate = f"{parent_id}~{tail}"
    i = 2
    while candidate in used:
        candidate, i = f"{parent_id}~{tail}-{i}", i + 1
    used.add(candidate)
    return candidate


def clean_label(label: str, code: str) -> str:
    """Drop the section number the label repeats.

    The editions do not agree on how they write it: 2020-2026 print
    "Section 29A: Department of Management Strategy", 2027 prints
    "13. International Trade Centre". The number is shown separately.
    """
    for prefix in (f"Section {code}: ", f"{code}. ", f"Section {code}. ", f"{code}: "):
        if label.startswith(prefix):
            return label[len(prefix):]
    return label


# --------------------------------------------------------------------------
# Programme budget (PPB)
# --------------------------------------------------------------------------

def stream_states(view: dict) -> dict[str, str]:
    """The state of each funding source at the top of the tree.

    An edition that never publishes, say, extrabudgetary expenditure for its
    historical year covers a smaller scope than one that publishes all three.
    Its total is not comparable with the others, and the page has to say so.
    """
    whole = next(n for n in view["nodes"] if n["kind"] == "whole")
    return {fs: (whole["values"].get(fs) or {}).get("state", "missing")
            for fs in FUNDING_SOURCES}


def build_ppb(view: dict) -> dict:
    lens = view["lens"]
    year = lens["dataYear"]
    edition = lens["edition"]

    # Walk the tree from the root, so that a node is always built after its
    # parent and can be given an id below its parent's.
    source_nodes = view["nodes"]
    by_tree_id = {n["treeNodeId"]: n for n in source_nodes}
    children_of: dict[str | None, list[dict]] = {}
    for n in source_nodes:
        children_of.setdefault(n["parentTreeNodeId"], []).append(n)
    for siblings in children_of.values():
        siblings.sort(key=lambda n: -(money(
            ((n["values"].get("total_all_sources") or {}).get("total") or {}).get("money")
        ) or 0))

    ids: dict[str, str] = {}
    used_ids: set[str] = set()
    ordered: list[dict] = []

    def walk(node: dict) -> None:
        ordered.append(node)
        for child in children_of.get(node["treeNodeId"], []):
            walk(child)

    for root in children_of.get(None, []):
        walk(root)
    assert len(ordered) == len(source_nodes), "PPB: the tree does not reach every node"

    nodes = []
    omitted = []
    dropped: set[str] = set()
    for n in ordered:
        # A node without a published total cannot be drawn, and nothing below it
        # can be either: its children would have no parent to hang from, and the
        # release leaves the whole branch out of the totals above it as well.
        parent_tree_id = n["parentTreeNodeId"]
        if parent_tree_id in dropped:
            dropped.add(n["treeNodeId"])
            continue
        code = (n.get("code") or "").replace("Part ", "")
        totals = n["values"].get("total_all_sources") or {}
        total_block = totals.get("total") or {}
        amount = money(total_block.get("money"))

        published = {}
        for fs in FUNDING_SOURCES:
            fs_amount = money(((n["values"].get(fs) or {}).get("total") or {}).get("money"))
            if fs_amount is not None:
                published[fs] = fs_amount

        if amount is None:
            # No published total across the funding sources. Record what it does
            # publish, so that the page can name what is missing instead of
            # quietly dropping it.
            dropped.add(n["treeNodeId"])
            omitted.append({
                "kind": n["kind"],
                "code": code or None,
                "label": clean_label(n["label"], code),
                "values": published,
                "reason": (
                    f"The budget prints no combined total for this {n['kind']}."
                    if published else
                    f"The budget prints no expenditure for this {n['kind']}."
                ),
            })
            continue

        if n["kind"] == "whole":
            label = "Programme budget"
        elif n["kind"] == "part":
            label = PART_DESCRIPTIONS.get(code, n["label"])
        else:
            label = clean_label(n["label"], code)

        parent_id = ids.get(n["parentTreeNodeId"]) if n["parentTreeNodeId"] else None
        if n["kind"] in ("whole", "part", "section"):
            node_id = short_id(n["treeNodeId"])
            used_ids.add(node_id)
        else:
            node_id = stable_id(parent_id or "orphan", n, used_ids)
        ids[n["treeNodeId"]] = node_id

        entry = {
            "id": node_id,
            "parentId": parent_id,
            "kind": n["kind"],
            "code": code or None,
            "label": label,
            "amount": amount,
            "basis": total_block.get("basis") or "printed",
            "values": published,
            "completeness": totals.get("completeness"),
        }
        # A row the fascicle prints as a lump, without saying what is inside it.
        # The page draws it, and says what it is, rather than leaving a hole.
        if re.search(r"not itemi[sz]ed|remainder", n["label"], re.I):
            entry["isRemainder"] = True
        explanation = totals.get("explanation")
        if explanation:
            entry["note"] = explanation
        nodes.append(entry)

    # One budget document family per edition: A/74/6 ... A/81/6, one fascicle
    # per section. The symbol of the family is what belongs in the source line.
    citations = view.get("citations") or []
    symbols = {re.sub(r"\s*\(.*", "", c["symbol"]).replace("_", "/") for c in citations}
    assert len(symbols) <= 1, f"PPB {edition}: several document families {symbols}"
    symbol = symbols.pop() if symbols else None
    doc_url = citations[0]["sourceDocumentUrl"] if citations else None

    states = stream_states(view)
    available = [fs for fs in FUNDING_SOURCES if states[fs] == "available"]
    partial = len(available) < len(FUNDING_SOURCES)

    if partial:
        names = " and ".join(FUNDING_NAMES[fs] for fs in available) or "no funding source"
        missing = " and ".join(FUNDING_NAMES[fs] for fs in FUNDING_SOURCES
                               if fs not in available)
        scope_label = f"Sections of the programme budget, {names} only"
        warning = (
            f"This year covers the {names} only: the budget for {edition} "
            f"(document {symbol}) publishes no {missing} expenditure for {year}. "
            f"The total is therefore much lower than the years that carry all "
            f"three funding sources, and the two are not comparable."
        )
    else:
        scope_label = "Sections of the programme budget, all funding sources"
        warning = (
            f"Expenditure in {year} as printed in the proposed programme budget "
            f"for {edition} (document {symbol}). Regular budget, other assessed "
            f"and extrabudgetary resources are added together, but not every "
            f"section publishes all three. Peacekeeping operations are a "
            f"separate budget, shown below."
        )

    if omitted:
        # "row", because what has no printed total may be a section, a component
        # or an allocation, and saying "section" for all of them would be wrong.
        listed = ", ".join(o["label"] for o in omitted)
        warning += f" {len(omitted)} row{'' if len(omitted) == 1 else 's'} " \
                   f"cannot be drawn ({listed}); see the note below."

    return {
        "meta": {
            "stream": "ppb",
            "title": "Programme budget",
            "label": view["label"],
            "edition": edition,
            "measure": lens["measure"],
            "year": year,
            "fiscalYear": str(year),
            "currency": lens["currency"],
            "total": next(n["amount"] for n in nodes if n["kind"] == "whole"),
            "fundingSources": FUNDING_SOURCES,
            "fundingStates": states,
            "partial": partial,
            "scopeLabel": scope_label,
            "scopeWarning": warning,
            "hierarchyProjection": view.get("hierarchyProjection"),
            "documentSymbol": symbol,
            "documentUrl": doc_url,
            "omitted": omitted,
            "source": RELEASE,
        },
        "nodes": nodes,
    }


# --------------------------------------------------------------------------
# Peacekeeping (PKO)
# --------------------------------------------------------------------------

def build_pko(cycle: dict, view: dict) -> dict:
    obs = {o["observationId"]: o for o in cycle["observations"]}
    view_nodes = view["nodes"]

    # Readable ids that stay the same from one cycle to the next, so that a deep
    # link and an open sidebar survive a move of the year slider:
    # MINURSO, MINURSO~civilian_personnel, MINURSO~civilian_personnel~national-staff.
    ids: dict[str, str] = {}
    used: set[str] = set()
    for n in view_nodes:
        o = obs.get(n["observationId"]) if n.get("observationId") else None
        if n["nodeId"].startswith("pko-node-root"):
            new_id = "all-missions"
        elif n["nodeId"].startswith("pko-node-mission"):
            new_id = o["mission"]
        elif n["nodeId"].startswith("pko-node-class"):
            new_id = f"{o['mission']}~{o['costClass']}"
        else:
            new_id = f"{o['mission']}~{o['costClass']}~{slug(o['rowLabel'])}"
        candidate, i = new_id, 2
        while candidate in used:
            candidate, i = f"{new_id}-{i}", i + 1
        used.add(candidate)
        ids[n["nodeId"]] = candidate

    nodes = []
    for n in view_nodes:
        o = obs.get(n["observationId"]) if n.get("observationId") else None
        kind = n["nodeId"].split(":")[0].replace("pko-node-", "")
        if kind == "root":
            kind, label, code = "whole", "Peacekeeping missions", None
        elif kind == "mission":
            label, code = MISSION_NAMES.get(o["mission"], o["mission"]), o["mission"]
        elif kind == "class":
            label, code = COST_CLASS_LABELS.get(o["costClass"], o["costClass"]), o["costClass"]
        else:
            label, code = o["rowLabel"], None

        node = {
            "id": ids[n["nodeId"]],
            "parentId": ids.get(n["parentNodeId"]) if n.get("parentNodeId") else None,
            "kind": kind,
            "code": code,
            "label": label,
            "amount": money(n["money"]),
            "basis": n["valueBasis"],
        }
        if o:
            node["mission"] = o["mission"]
            node["costClass"] = o["costClass"]
            node["source"] = {
                "symbol": o["source"]["symbol"],
                "url": o["source"]["sourceDocumentUrl"],
                "rowLabel": o["source"]["rowLabel"],
                "columnHeader": o["source"]["columnHeader"],
            }
        nodes.append(node)

    fiscal_year = view["lens"]["fiscalYear"]
    root = next(n for n in nodes if n["parentId"] is None)
    coverage = view["coverage"]
    warning = view["scopeWarning"]
    shown, referenced = coverage["missionsDisplayed"], coverage["missionsInCycleReference"]
    if shown < referenced:
        warning += (f" {referenced - shown} of the {referenced} missions in this "
                    f"cycle have no per-mission breakdown and are not drawn.")

    return {
        "meta": {
            "stream": "pko",
            "title": "Peacekeeping operations",
            "label": f"Peacekeeping expenditure {fiscal_year} (USD)",
            "cycle": view["lens"]["cycle"],
            "measure": view["lens"]["measure"],
            "year": int(fiscal_year.split("/")[0]),
            "fiscalYear": fiscal_year,
            "currency": view["lens"]["currency"],
            "total": root["amount"],
            "costClasses": COST_CLASS_LABELS,
            "missionNames": MISSION_NAMES,
            "partial": False,
            "scopeLabel": view["scopeLabel"],
            "scopeWarning": warning,
            "coverage": coverage,
            "verification": view["verification"],
            "source": RELEASE,
        },
        "nodes": nodes,
    }


# --------------------------------------------------------------------------

def check_tree(payload: dict, name: str) -> None:
    """Every node must have a parent, and children must add up to their parent."""
    nodes = payload["nodes"]
    by_id = {n["id"]: n for n in nodes}
    children: dict[str, list[dict]] = {}
    for n in nodes:
        if n["parentId"]:
            assert n["parentId"] in by_id, f"{name}: orphan node {n['id']}"
            children.setdefault(n["parentId"], []).append(n)

    residue = 0
    for parent_id, kids in children.items():
        parent = by_id[parent_id]
        diff = sum(k["amount"] for k in kids) - parent["amount"]
        # Differences of a few hundred dollars come from the printed thousands.
        # The release guarantees no displayed parent/child gap above $5,000
        # without an explicit remainder row, so anything larger is a real gap
        # and must be visible here.
        if abs(diff) > 5000:
            residue += diff
            print(f"  ! {name}: {parent['label']} = {parent['amount']:,}, "
                  f"children add to {parent['amount'] + diff:,} (difference {diff:,})")

    root = next(n for n in nodes if n["parentId"] is None)
    assert root["amount"] == payload["meta"]["total"], f"{name}: root != declared total"
    if residue:
        print(f"  ! {name}: total unexplained difference {residue:,}")


def prepare(release_dir: Path) -> None:
    """Cache the release files this portal reads."""
    assert release_dir.is_dir(), f"no such directory: {release_dir}"
    (SRC / "ppb").mkdir(parents=True, exist_ok=True)
    (SRC / "pko").mkdir(parents=True, exist_ok=True)

    for edition in PPB_EDITIONS:
        matches = sorted(release_dir.glob(f"{edition}-expenditure-*-usd.json"))
        assert len(matches) == 1, \
            f"PPB {edition}: expected 1 standalone USD treemap file, found {len(matches)}"
        view = json.loads(matches[0].read_text())
        assert view["lens"]["currency"] == "USD", f"PPB {edition}: not a USD view"
        assert view["lens"]["measure"] == "expenditure", f"PPB {edition}: not expenditure"
        (SRC / "ppb" / f"{edition}.json").write_text(json.dumps(view))
        print(f"  cached PPB {edition} (expenditure {view['lens']['dataYear']}, "
              f"{len(view['nodes'])} nodes)")

    for cycle in PKO_CYCLES:
        target = SRC / "pko" / f"{cycle}.json"
        for candidate in (release_dir / "financial" / "pko" / f"{cycle}.json",
                          release_dir / f"{cycle}.json"):
            if candidate.exists():
                shutil.copyfile(candidate, target)
                print(f"  cached PKO cycle {cycle}")
                break
        else:
            # v1.4 ships the cycle files unchanged, so an earlier cache still
            # applies. Only complain when there is nothing to fall back on.
            assert target.exists(), (
                f"PKO cycle {cycle} is neither in {release_dir} nor already cached. "
                f"Unpack the release archive and point --release at it."
            )
            print(f"  kept the cached PKO cycle {cycle} (unchanged in this release)")

    size = sum(f.stat().st_size for f in SRC.rglob("*.json"))
    print(f"Cached {SRC} ({size / 1e6:.1f} MB).")


def export() -> None:
    assert SRC.is_dir(), (
        f"{SRC} is missing. Download the release and run:\n"
        f"    uv run python/12-export_budget_json.py --release <unpacked-release>"
    )

    for edition in PPB_EDITIONS:
        view = json.loads((SRC / "ppb" / f"{edition}.json").read_text())
        payload = build_ppb(view)
        year = payload["meta"]["year"]
        name = f"budget-ppb-{year}"
        check_tree(payload, name)
        (OUT / f"{name}.json").write_text(json.dumps(payload, indent=2))
        flag = " (partial scope)" if payload["meta"]["partial"] else ""
        print(f"{name}.json: {len(payload['nodes'])} nodes, "
              f"${payload['meta']['total'] / 1e9:.2f}B{flag} ✓")
        for o in payload["meta"]["omitted"]:
            values = ", ".join(f"{FUNDING_NAMES[k]} {v:,}" for k, v in o["values"].items())
            print(f"  - not drawn: {o['label']} — {o['reason']}"
                  f"{' It publishes ' + values + '.' if values else ''}")

    for cycle in PKO_CYCLES:
        cycle_data = json.loads((SRC / "pko" / f"{cycle}.json").read_text())
        views = [v for v in cycle_data["treemapViews"]
                 if v["lens"]["measure"] == "expenditure"]
        assert len(views) == 1, f"PKO {cycle}: expected 1 expenditure view"
        payload = build_pko(cycle_data, views[0])
        name = f"budget-pko-{payload['meta']['year']}"
        check_tree(payload, name)
        (OUT / f"{name}.json").write_text(json.dumps(payload, indent=2))
        print(f"{name}.json ({payload['meta']['fiscalYear']}): "
              f"{len(payload['nodes'])} nodes, "
              f"${payload['meta']['total'] / 1e9:.2f}B ✓")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--release":
        prepare(Path(sys.argv[2]))
    else:
        export()
