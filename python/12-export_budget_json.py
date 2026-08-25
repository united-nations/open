"""Export budget-document treemaps for the /secretariat page.

Source: the `financial-data-v1.6` release of the sibling repository
`united-nations/programme-budget-data`, refined by its
`codex/financial-source-reconciliation` producer. The refinement exposes
source detail that the release exporter had collapsed into remainder tiles,
and removes Section 13 Swiss-franc rows from the USD totals.

    gh release download financial-data-v1.6 \
        --repo united-nations/programme-budget-data -D <tmp> \
        --pattern "*.json" --pattern "SHA256SUMS"
Then cache the files this portal needs, and export. The import verifies every
PPB file against the release's SHA256SUMS before copying it:

    uv run python/12-export_budget_json.py --release <tmp>
    uv run python/12-export_budget_json.py

Peacekeeping is not republished after v1.4, so the three cycle files still come
from that release, whose archive carries them under `financial/pko/`:

    gh release download financial-data-v1.4 --repo … -D <tmp14> \
        --pattern "financial-data-v1.4.tar.gz"
    tar -xzf <tmp14>/financial-data-v1.4.tar.gz -C <tmp14>
    uv run python/12-export_budget_json.py --release <tmp> \
        --pko <tmp14>/financial-data-v1.4

Outputs, one file per year, following the portal's `{view}-{year}.json` rule:

    budget-ppb-{2019..2025}.json   whole -> parts -> sections -> the budget
                                   units of each section -> the detail rows the
                                   fascicles print below them
    budget-pko-{2022..2024}.json   all missions -> missions -> classes -> items

All eight PPB editions are cached and can be built (`PPB_EDITIONS`). The portal
exports expenditure for 2019 onward (`PPB_EDITIONS_DRAWN`); expenditure for
2018 is omitted because that edition publishes only regular-budget expenditure.

The level below the section is what v1.5 made stable. Until then it was not one
kind of thing — a section resolved into organizational entities, or straight
into functional components, or into a lone "not itemized" remainder — so the
tiles of one band were not comparable with each other. The release now projects
that level onto a single **budget-unit** tier: a printed entity where the
fascicle names one, and an explicitly labelled generated wrapper where it does
not (`section_scope`, `programme`, `special_purpose`, `coverage_remainder`).
The tier is additive when the source reconciles. If independently printed
children disagree with their printed parent, the parent stays authoritative;
the portal flags the difference and withholds those children from treemap
geometry rather than drawing the difference as expenditure.

The sibling repository now builds the orthogonal, source-evidenced **entity
dimension** for PPB 2021–2027. Small overlay files bind those added fields to
the exact v1.6 financial view by SHA-256. Build them from
`programme-budget-data` before this export. For example:

    for edition in 2021 2022 2023 2024 2025 2026 2027; do
      uv run python -m pipeline.emit.ppb_entity_dimension \
        --input ../transparency/data/references/\
programme-budget-data-financial-v1.6/ppb/$edition.json \
        --overlay-output ../transparency/data/references/\
programme-budget-data-ppb-entities/$edition.json
    done

This script attaches each canonical name and known abbreviation to the units
it resolves. Where the source says a section has exactly one owner, it also
names that section's generated wrappers and tags the relationship as
`section_owner`. No amount and no hierarchy edge is touched by the entity
layer.

The PPB year is the expenditure year, which is the edition year minus two: the
proposed programme budget for 2027 prints the actual expenditure of 2025. The
PKO year is the first year of the July-June cycle, so 2024 means 2024/25.

Both outputs share one node shape, so one frontend component draws both:

{
  "meta":  {stream, label, measure, fiscalYear, currency, total, source,
            scopeLabel, scopeWarning, coverage, verification, omitted,
            fundingSources, partial, entityDimension},
  "nodes": [ {id, parentId, tier, kind, code, label, amount, basis,
              values?, breakdowns?, unitType?, role?, entity?, sources?}, ... ]
}

`amount` is full dollars (the release prints thousands, and carries the exact
value as a string). `basis` says whether the number is printed in the source
document or derived. An available all-source parent is never replaced by the
sum of RB, OA and XB; that sum is retained separately for reconciliation. Only
when no all-source amount exists does the portal use a clearly labelled sum of
the available funding streams. The exporter validates all seven non-empty
RB/OA/XB filter combinations and accepts a material child gap only when the
producer explicitly flags the same signed source discrepancy.

Only the USD expenditure views are exported. The release also has a CHF view of
PPB 2027, and appropriation and proposed views of the peacekeeping cycles; the
portal shows actual spending in USD, so those are left aside.
"""
import csv
import hashlib
import itertools
import json
import re
import shutil
import sys
from pathlib import Path

from domain_taxonomies import load_secretariat_taxonomies

SRC = Path("data/references/programme-budget-data-financial-v1.6")
ENTITY_SRC = Path("data/references/programme-budget-data-ppb-entities")
OUT = Path("public/data")

# The immutable v1.6 views already carry a source citation for every numeric
# lens, but that release predates the producer's PDF-page join.  When the
# sibling checkout is available, use its independently generated document
# outline to fill those still-null page fields.  A future release with pages
# embedded remains authoritative and does not need this fallback.
PROGRAMME_BUDGET_DATA = Path("../programme-budget-data")

RELEASE = {
    "repo": "united-nations/programme-budget-data",
    "release": "financial-data-v1.6 + source reconciliation",
    "url": "https://github.com/united-nations/programme-budget-data/tree/codex/financial-source-reconciliation",
    "baseRelease": "financial-data-v1.6",
    "baseReleaseUrl": "https://github.com/united-nations/programme-budget-data/releases/tag/financial-data-v1.6",
}

# Peacekeeping is unchanged since v1.4 and is not republished, so the PKO files
# must say which release they are really from.
PKO_RELEASE = {
    "repo": "united-nations/programme-budget-data",
    "release": "financial-data-v1.4",
    "url": "https://github.com/united-nations/programme-budget-data/releases/tag/financial-data-v1.4",
}

PPB_EDITIONS = range(2020, 2028)
PKO_CYCLES = (2024, 2025, 2026)

# Which PPB editions the portal draws. Editions 2021–2027 provide expenditure
# for 2019–2025 with all three funding sources. The 2020 edition (expenditure
# 2018) is deliberately excluded because it publishes regular-budget
# expenditure only. Entity overlays cover every drawn edition.
PPB_EDITIONS_DRAWN = range(2021, 2028)

SECRETARIAT_TAXONOMIES = load_secretariat_taxonomies()
PART_DESCRIPTIONS = {
    part["code"]: part["label"]
    for part in SECRETARIAT_TAXONOMIES["budget_parts"]
}
ORDERED_FUNDING = sorted(
    SECRETARIAT_TAXONOMIES["funding_sources"], key=lambda source: source["order"]
)
FUNDING_SOURCES = [source["key"] for source in ORDERED_FUNDING]
FUNDING_NAMES = {
    source["key"]: source["sentence_label"] for source in ORDERED_FUNDING
}
COST_CLASS_LABELS = {
    cost_class["key"]: cost_class["label"]
    for cost_class in SECRETARIAT_TAXONOMIES["cost_classes"]
}
MISSION_NAMES = SECRETARIAT_TAXONOMIES["peacekeeping_mission_names"]


def sha256(path: Path) -> str:
    """Hex SHA-256 of one release asset."""
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def release_checksums(release_dir: Path) -> dict[str, str]:
    """Release-asset basename -> digest, rejecting ambiguous checksum rows.

    SHA256SUMS names the paths inside the release archive, while GitHub places
    the standalone treemap downloads at the top of `release_dir`. Basenames are
    therefore the shared identity. A duplicate basename is unsafe rather than
    something to resolve by row order.
    """
    checksum_file = release_dir / "SHA256SUMS"
    assert checksum_file.is_file(), f"release has no {checksum_file.name}"
    checksums: dict[str, str] = {}
    for line_number, line in enumerate(checksum_file.read_text().splitlines(), 1):
        match = re.fullmatch(r"([0-9a-f]{64})  (\S+)", line)
        assert match, f"SHA256SUMS line {line_number} is malformed"
        digest, raw_name = match.groups()
        name = Path(raw_name).name
        assert name not in checksums, f"SHA256SUMS repeats basename {name}"
        checksums[name] = digest
    return checksums


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


def citation_source(citation: dict | None) -> dict | None:
    """Compact one producer citation for a sidebar amount link."""
    if not citation:
        return None
    header = citation.get("headerPath") or []
    page = citation.get("pdfPage")
    url = citation.get("pdfUrl") or citation.get("sourceDocumentUrl")
    if not url:
        return None
    if page is not None:
        url = f"{url.split('#', 1)[0]}#page={page}"
    return {
        "symbol": citation["symbol"].replace("_", "/"),
        "url": url,
        "pdfPage": page,
        "pageStatus": citation.get("pageStatus"),
        "rowLabel": citation.get("rowLabel") or "",
        "columnHeader": " › ".join(str(item) for item in header),
        "tableTitle": citation.get("tableTitle") or citation.get("tableCaption"),
    }


def apply_pdf_page_index(view: dict, edition: int) -> tuple[int, int]:
    """Fill legacy null citation pages from the producer's page-index output.

    The join key is the canonical document symbol plus the physical Word table
    ordinal, exactly the producer key in ``financial_export.py``.  A missing or
    ambiguous page remains null; no neighbouring page is guessed.
    """
    outline = (
        PROGRAMME_BUDGET_DATA / "data" / "processed" / f"ppb{edition}"
        / "extracted" / "document_outline.csv"
    )
    citations = view.get("citations") or []
    if not outline.is_file():
        return 0, len(citations)

    ordinals: dict[str, int] = {}
    pages: dict[tuple[str, int], tuple[int, str | None]] = {}
    with outline.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("block_type") != "table-content":
                continue
            symbol = re.sub(r"\s+", " ", row.get("symbol") or "").strip().casefold()
            ordinal = ordinals.get(symbol, 0) + 1
            ordinals[symbol] = ordinal
            page = (row.get("page") or "").strip()
            if page.isdigit():
                pages[(symbol, ordinal)] = (
                    int(page), (row.get("located_by") or "").strip() or None
                )

    located = 0
    for citation in citations:
        if citation.get("pdfPage") is not None:
            located += 1
            continue
        symbol = re.sub(r"\s+", " ", citation["symbol"]).strip().casefold()
        match = pages.get((symbol, int(citation["tableOrdinal"])))
        if not match:
            continue
        page, located_by = match
        citation["pdfPage"] = page
        citation["pageStatus"] = "located"
        citation["pageLocatedBy"] = located_by
        citation["pageMissReason"] = None
        located += 1
    return located, len(citations)


def stable_id(parent_id: str, label: str, used: set[str]) -> str:
    """An id for a node below the section, built from where it sits.

    The release gives the lower nodes a content hash (tree:ppb2027:lower:2:e198…)
    that is new in every edition, so those ids cannot carry a deep link from one
    year to the next. The path plus the printed label can: "Programme of work"
    under section 3 is the same row in every edition that prints it.

    The label comes in already stripped of its numeral, because the numeral is
    the one part that does move: the Office of Counter-Terrorism is heading VI
    of section 3 in the 2025 edition and heading V in the 2027 one.
    """
    tail = slug(label)
    candidate = f"{parent_id}~{tail}"
    i = 2
    while candidate in used:
        candidate, i = f"{parent_id}~{tail}-{i}", i + 1
    used.add(candidate)
    return candidate


def clean_label(label: str, code: str) -> str:
    """Drop the number or heading numeral the label repeats.

    The editions do not agree on how they write it: 2020-2026 print
    "Section 29A: Department of Management Strategy", 2027 prints
    "13. International Trade Centre". Below the section the numeral is the
    heading marker instead — "I. Department of Political and Peacebuilding
    Affairs". Either way the numeral is carried separately, in `code`.
    """
    for prefix in (f"Section {code}: ", f"{code}. ", f"Section {code}. ", f"{code}: "):
        if label.startswith(prefix):
            return label[len(prefix):]
    return label


# --------------------------------------------------------------------------
# The entity dimension
# --------------------------------------------------------------------------

def apply_entity_overlay(view: dict, overlay: dict, source_path: Path) -> None:
    """Apply additive entity fields only when they bind to this exact view."""
    edition = view["lens"]["edition"]
    assert overlay.get("schemaVersion") == 1, \
        f"PPB {edition}: unsupported entity-overlay schema"
    assert overlay.get("edition") == edition, \
        f"PPB {edition}: entity overlay has the wrong edition"
    assert overlay.get("sourceViewSha256") == sha256(source_path), \
        f"PPB {edition}: entity overlay does not bind to the cached financial view"
    dimension = overlay.get("entityDimension")
    assert isinstance(dimension, dict) and dimension.get("edition") == edition, \
        f"PPB {edition}: entity overlay has no valid dimension"

    bindings = overlay.get("nodes")
    assert isinstance(bindings, list), f"PPB {edition}: entity overlay has no node bindings"
    by_id = {}
    for row in bindings:
        node_id = row.get("treeNodeId")
        relationship_ids = row.get("entityRelationshipIds")
        assert isinstance(node_id, str) and node_id not in by_id, \
            f"PPB {edition}: invalid or duplicate entity-overlay node"
        assert isinstance(relationship_ids, list) and all(
            isinstance(value, str) for value in relationship_ids
        ), f"PPB {edition}: invalid entity relationship list for {node_id}"
        by_id[node_id] = relationship_ids
    source_ids = {node["treeNodeId"] for node in view["nodes"]}
    assert set(by_id) == source_ids, \
        f"PPB {edition}: entity overlay and financial view have different nodes"

    relationship_ids = {
        row["relationshipId"] for row in dimension.get("relationships", [])
    }
    for node in view["nodes"]:
        node_relationships = by_id[node["treeNodeId"]]
        assert set(node_relationships) <= relationship_ids, \
            f"PPB {edition}: entity overlay refers to an unknown relationship"
        node["entityRelationshipIds"] = node_relationships
    view["entityDimension"] = dimension

def entity_index(view: dict) -> tuple[dict[str, dict], dict[str, dict], dict | None]:
    """Relationships and section verdicts of the release's entity dimension.

    Returns (relationship id -> the entity it names, section code -> the
    release's verdict on who owns that section, the summary). All three are
    empty for an edition that does not carry the dimension.
    """
    dimension = view.get("entityDimension")
    if not dimension:
        return {}, {}, None

    entities = {e["entityId"]: e for e in dimension["entities"]}
    relationships = {}
    for r in dimension["relationships"]:
        entity = entities[r["entityId"]]
        relationships[r["relationshipId"]] = {
            "name": entity["canonicalName"],
            "acronym": entity["acronym"],
            "relationship": r["relationship"],
            "evidenceUrl": (r.get("evidence") or {}).get("sourceDocumentUrl"),
        }
    sections = {s["section"]: s for s in dimension["sections"]}
    return relationships, sections, dimension["summary"]


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
    citations = view.get("citations") or []
    citations_by_id = {citation["citationId"]: citation for citation in citations}

    def source_for(value: dict) -> dict | None:
        primary = value.get("primarySource")
        if not primary:
            return None
        # Top-level citations receive the independently located page overlay;
        # the embedded primarySource is retained as a self-contained fallback.
        citation = citations_by_id.get(primary.get("citationId"), primary)
        return citation_source(citation)

    relationships, section_verdicts, entity_summary = entity_index(view)

    # Walk the tree from the root, so that a node is always built after its
    # parent and can be given an id below its parent's.
    source_nodes = view["nodes"]
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

    def named_entities(node: dict) -> list[dict]:
        """The entities the release ties to this node, if it carries any."""
        return [relationships[i] for i in (node.get("entityRelationshipIds") or [])
                if i in relationships]

    nodes = []
    omitted = []
    dropped: set[str] = set()
    # Section tree id -> the one entity the release says owns that section.
    section_owner: dict[str, dict] = {}
    for n in ordered:
        # The producer retains source-control differences as auditable lineage
        # facts.  They are reconciliation controls, not expenditure, so they
        # must never become treemap tiles.
        if n.get("chartRole") == "reconciliation_control":
            assert not children_of.get(n["treeNodeId"]), (
                f"PPB {edition}: reconciliation control unexpectedly has children"
            )
            continue
        # A node without a published total cannot be drawn, and nothing below it
        # can be either: its children would have no parent to hang from, and the
        # release leaves the whole branch out of the totals above it as well.
        parent_tree_id = n["parentTreeNodeId"]
        if parent_tree_id in dropped:
            dropped.add(n["treeNodeId"])
            continue
        code = (n.get("code") or "").replace("Part ", "")
        published = {}
        for fs in FUNDING_SOURCES:
            fs_amount = money(((n["values"].get(fs) or {}).get("total") or {}).get("money"))
            if fs_amount is not None:
                published[fs] = fs_amount

        totals = n["values"].get("total_all_sources") or {}
        total_block = totals.get("total") or {}
        authoritative_amount = money(total_block.get("money"))
        funding_sum = sum(published.values()) if published else None
        amount = authoritative_amount
        amount_basis = total_block.get("basis") or "printed"
        if amount is None and funding_sum is not None:
            # A missing all-source figure is different from a printed parent
            # that disagrees with its components.  Only the former falls back
            # to a clearly labelled sum of the available funding streams.
            amount = funding_sum
            amount_basis = "derived_available_funding_sum"

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

        tier = n["chartTier"]
        role = n["chartRole"]
        parent_tree = n["parentTreeNodeId"]
        parent_id = ids.get(parent_tree) if parent_tree else None
        if tier in ("whole", "part", "section"):
            node_id = short_id(n["treeNodeId"])
            used_ids.add(node_id)
        else:
            node_id = stable_id(parent_id or "orphan", label, used_ids)
        ids[n["treeNodeId"]] = node_id

        entry = {
            "id": node_id,
            "parentId": parent_id,
            # `tier` is the level of the chart: whole, part, section, the
            # budget-unit tier the treemap draws as tiles, and the detail rows
            # below it. `kind` stays what the fascicle calls the row, which is
            # not the same question — a budget unit is an entity in one section
            # and a generated wrapper in the next.
            "tier": tier,
            "kind": n["kind"],
            "code": code or None,
            "label": label,
            "amount": amount,
            "basis": amount_basis,
            "values": published,
            "completeness": totals.get("completeness"),
        }
        if authoritative_amount is not None:
            entry["allSourcesAmount"] = authoritative_amount
        if funding_sum is not None:
            entry["fundingBreakdownTotal"] = funding_sum
            if authoritative_amount is not None:
                entry["fundingDifference"] = authoritative_amount - funding_sum

        # Preserve the producer's reconciliation at every funding lens.  The
        # frontend chooses the matching record after the user filters RB/OA/XB.
        breakdowns = {}
        for funding in [*FUNDING_SOURCES, "total_all_sources"]:
            value = n["values"].get(funding) or {}
            child_amount = money((value.get("children") or {}).get("money"))
            difference = money(value.get("difference"))
            outcome = value.get("arithmeticOutcome")
            if child_amount is not None or difference is not None or outcome:
                breakdowns[funding] = {
                    "childAmount": child_amount,
                    "difference": difference,
                    "outcome": outcome or "not_testable",
                    "completeness": value.get("completeness"),
                }
        component_breakdowns = [
            breakdowns[funding]
            for funding in published
            if funding in breakdowns
            and breakdowns[funding]["childAmount"] is not None
            and breakdowns[funding]["difference"] is not None
        ]
        if published and len(component_breakdowns) == len(published):
            component_difference = sum(
                item["difference"] for item in component_breakdowns
            )
            source_flagged = any(
                item["outcome"] == "printed_source_discrepancy"
                for item in component_breakdowns
            )
            breakdowns["selected_funding_sources"] = {
                "childAmount": sum(
                    item["childAmount"] for item in component_breakdowns
                ),
                "difference": component_difference,
                "outcome": (
                    "printed_source_discrepancy"
                    if abs(component_difference) > 5000 and source_flagged
                    else "unreconciled_difference"
                    if abs(component_difference) > 5000
                    else "exact"
                ),
                "completeness": (
                    "complete"
                    if all(
                        item.get("completeness") == "complete"
                        for item in component_breakdowns
                    )
                    else "incomplete"
                ),
            }
        if breakdowns:
            entry["breakdowns"] = breakdowns

        sources = {}
        for funding in [*FUNDING_SOURCES, "total_all_sources"]:
            source = source_for(n["values"].get(funding) or {})
            if source:
                sources[funding] = source
        if sources:
            entry["sources"] = sources
            # The unfiltered sidebar amount uses the producer's all-source
            # total. Keep the singular field for the shared PPB/PKO sidebar.
            if sources.get("total_all_sources"):
                entry["source"] = sources["total_all_sources"]
        if tier == "budget_unit":
            entry["unitType"] = n["budgetUnitType"]
            entry["role"] = role
        # A row the fascicle prints as a lump, without saying what is inside it.
        # The page draws it, and says what it is, rather than leaving a hole.
        if role == "coverage_remainder" or re.search(
            r"not itemi[sz]ed|remainder", n["label"], re.I
        ):
            entry["isRemainder"] = True

        # The entity dimension, where the edition carries one.
        named = named_entities(n)
        if tier == "section":
            verdict = section_verdicts.get(code)
            if verdict:
                entry["entityStatus"] = verdict["status"]
                entry["entityNote"] = verdict["reason"]
            owners = [e for e in named if e["relationship"] == "section_owner"]
            if verdict and verdict["status"] == "single_owner" and len(owners) == 1:
                entry["entity"] = owners[0]
                section_owner[n["treeNodeId"]] = owners[0]
        elif tier == "budget_unit":
            if len(named) == 1:
                entry["entity"] = named[0]
            elif role in ("section_scope", "programme") and parent_tree in section_owner:
                # A generated wrapper standing for the section as a whole, in a
                # section the release gives exactly one owner: the money is that
                # entity's. Say where the name came from rather than pass it off
                # as a heading the fascicle printed.
                entry["entity"] = {**section_owner[parent_tree],
                                   "relationship": "section_owner"}

        explanation = totals.get("explanation")
        if explanation:
            entry["note"] = explanation
        nodes.append(entry)

    # One budget document family per edition: A/74/6 ... A/81/6, one fascicle
    # per section. The symbol of the family is what belongs in the source line.
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

    named_units = sum(1 for n in nodes if n["tier"] == "budget_unit" and n.get("entity"))
    all_units = sum(1 for n in nodes if n["tier"] == "budget_unit")
    if entity_summary:
        warning += (
            f" The tiles are the budget units of each section, named after the "
            f"organization the budget document ties them to where it names one: "
            f"{named_units} of {all_units} units in this year, from the "
            f"{entity_summary['entities']} organizations the release evidences "
            f"for the {edition} edition. The rest keep the heading the fascicle "
            f"prints."
        )
    else:
        warning += (
            f" The tiles are the budget units of each section: the entities the "
            f"fascicle names, and clearly labelled remainders for what it leaves "
            f"undivided. The {edition} edition has no entity dimension, so the "
            f"units carry the headings as printed."
        )

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
            "total": next(n["amount"] for n in nodes if n["tier"] == "whole"),
            "fundingSources": FUNDING_SOURCES,
            "fundingStates": states,
            "partial": partial,
            "scopeLabel": scope_label,
            "scopeWarning": warning,
            "hierarchyProjection": view.get("hierarchyProjection"),
            "entityDimension": (
                {
                    **entity_summary,
                    "namedUnits": named_units,
                    "units": all_units,
                    "producer": view["entityDimension"]["producer"],
                    "producerGitHead": view["entityDimension"]["producerGitHead"],
                    "sourceFiles": view["entityDimension"]["sourceFiles"],
                }
                if entity_summary else None
            ),
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
            # Peacekeeping has one kind of row per level, so the tier and the
            # kind are the same thing; the field is there so that both streams
            # answer "which level of the chart is this?" the same way.
            "tier": kind,
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
            "source": PKO_RELEASE,
        },
        "nodes": nodes,
    }


# --------------------------------------------------------------------------

def check_tree(payload: dict, name: str) -> None:
    """Validate hierarchy arithmetic without turning differences into spend."""
    nodes = payload["nodes"]
    by_id = {n["id"]: n for n in nodes}
    children: dict[str, list[dict]] = {}
    for n in nodes:
        if n["parentId"]:
            assert n["parentId"] in by_id, f"{name}: orphan node {n['id']}"
            children.setdefault(n["parentId"], []).append(n)

    unaccounted = []

    def amount_for(node: dict, selected: tuple[str, ...]) -> int:
        if (
            len(selected) == len(FUNDING_SOURCES)
            and node.get("allSourcesAmount") is not None
        ):
            return node["allSourcesAmount"]
        values = node.get("values") or {}
        return sum(values.get(funding, 0) for funding in selected)

    selections = (
        list(itertools.chain.from_iterable(
            itertools.combinations(FUNDING_SOURCES, size)
            for size in range(1, len(FUNDING_SOURCES) + 1)
        ))
        if payload["meta"].get("stream") == "ppb"
        else [tuple()]
    )
    for selected in selections:
        lens = "+".join(selected) if selected else "all"
        for parent_id, kids in children.items():
            parent = by_id[parent_id]
            parent_amount = (
                amount_for(parent, selected) if selected else parent["amount"]
            )
            child_sum = sum(
                amount_for(child, selected) if selected else child["amount"]
                for child in kids
            )
            diff = parent_amount - child_sum
        # Differences of a few hundred dollars come from the printed thousands.
        # The release guarantees no displayed parent/child gap above $5,000
        # without an explicit remainder row, so anything larger is a real gap
        # and must be visible here.
            if abs(diff) > 5000:
                component_records = [
                    (parent.get("breakdowns") or {}).get(funding)
                    for funding in selected
                    if funding in (parent.get("values") or {})
                ]
                declared_difference = (
                    sum(record["difference"] for record in component_records)
                    if component_records
                    and all(
                        record is not None and record.get("difference") is not None
                        for record in component_records
                    )
                    else None
                )
                explicitly_flagged = (
                    declared_difference is not None
                    and abs(declared_difference - diff) <= 5000
                    and any(
                        record.get("outcome") == "printed_source_discrepancy"
                        for record in component_records
                        if record is not None
                    )
                )
                print(
                    f"  ! {name} [{lens}]: {parent['label']} = {parent_amount:,}, "
                    f"children add to {child_sum:,} (difference {diff:,}; "
                    f"{'source flagged' if explicitly_flagged else 'UNACCOUNTED'})"
                )
                if not explicitly_flagged:
                    unaccounted.append((f"{parent_id} [{lens}]", diff))

    root = next(n for n in nodes if n["parentId"] is None)
    assert root["amount"] == payload["meta"]["total"], f"{name}: root != declared total"
    if unaccounted:
        largest = max(abs(diff) for _, diff in unaccounted)
        raise AssertionError(
            f"{name}: {len(unaccounted)} unflagged parent/child discrepancies remain; "
            f"largest absolute difference {largest:,}"
        )


def prepare(release_dir: Path, pko_dir: Path | None = None) -> None:
    """Cache the release files this portal reads."""
    assert release_dir.is_dir(), f"no such directory: {release_dir}"
    checksums = release_checksums(release_dir)
    (SRC / "ppb").mkdir(parents=True, exist_ok=True)
    (SRC / "pko").mkdir(parents=True, exist_ok=True)

    for edition in PPB_EDITIONS:
        matches = sorted(release_dir.glob(f"{edition}-expenditure-*-usd.json"))
        assert len(matches) == 1, \
            f"PPB {edition}: expected 1 standalone USD treemap file, found {len(matches)}"
        asset = matches[0]
        expected_digest = checksums.get(asset.name)
        assert expected_digest is not None, \
            f"PPB {edition}: {asset.name} is not bound by SHA256SUMS"
        actual_digest = sha256(asset)
        assert actual_digest == expected_digest, \
            f"PPB {edition}: {asset.name} does not match SHA256SUMS"
        view = json.loads(asset.read_text())
        assert view["lens"]["currency"] == "USD", f"PPB {edition}: not a USD view"
        assert view["lens"]["measure"] == "expenditure", f"PPB {edition}: not expenditure"
        (SRC / "ppb" / f"{edition}.json").write_text(json.dumps(view))
        entities = (view.get("entityDimension") or {}).get("summary")
        print(f"  cached PPB {edition} (expenditure {view['lens']['dataYear']}, "
              f"{len(view['nodes'])} nodes"
              f"{f', {entities["entities"]} entities' if entities else ''})")

    for cycle in PKO_CYCLES:
        target = SRC / "pko" / f"{cycle}.json"
        searched = [d / "financial" / "pko" / f"{cycle}.json" for d in
                    (pko_dir, release_dir) if d] + \
                   [d / f"{cycle}.json" for d in (pko_dir, release_dir) if d]
        for candidate in searched:
            if candidate.exists():
                shutil.copyfile(candidate, target)
                print(f"  cached PKO cycle {cycle} from {candidate.parent}")
                break
        else:
            # Peacekeeping has not been republished since v1.4, so an earlier
            # cache still applies. Only complain when there is nothing to fall
            # back on.
            assert target.exists(), (
                f"PKO cycle {cycle} is in neither {release_dir} nor the cache. "
                f"Unpack the {PKO_RELEASE['release']} archive and pass "
                f"--pko <unpacked-archive>."
            )
            print(f"  kept the cached PKO cycle {cycle} "
                  f"({PKO_RELEASE['release']}, not republished since)")

    size = sum(f.stat().st_size for f in SRC.rglob("*.json"))
    print(f"Cached {SRC} ({size / 1e6:.1f} MB).")


def export() -> None:
    assert SRC.is_dir(), (
        f"{SRC} is missing. Download the release and run:\n"
        f"    uv run python/12-export_budget_json.py --release <unpacked-release>"
    )

    stale = sorted(p for p in OUT.glob("budget-ppb-*.json")
                   if int(p.stem.rsplit("-", 1)[1]) not in
                   {e - 2 for e in PPB_EDITIONS_DRAWN})
    for path in stale:
        path.unlink()
        print(f"removed {path.name} (its edition is not drawn)")

    for edition in PPB_EDITIONS_DRAWN:
        source_path = SRC / "ppb" / f"{edition}.json"
        overlay_path = ENTITY_SRC / f"{edition}.json"
        assert overlay_path.is_file(), (
            f"PPB {edition}: {overlay_path} is missing. Build the entity overlays "
            "from the programme-budget-data repository first."
        )
        view = json.loads(source_path.read_text())
        pages, citations = apply_pdf_page_index(view, edition)
        overlay = json.loads(overlay_path.read_text())
        apply_entity_overlay(view, overlay, source_path)
        payload = build_ppb(view)
        year = payload["meta"]["year"]
        name = f"budget-ppb-{year}"
        check_tree(payload, name)
        (OUT / f"{name}.json").write_text(json.dumps(payload, indent=2))
        flag = " (partial scope)" if payload["meta"]["partial"] else ""
        print(f"{name}.json: {len(payload['nodes'])} nodes, "
              f"${payload['meta']['total'] / 1e9:.2f}B{flag}; "
              f"{pages}/{citations} source citations page-linked ✓")
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
    args = sys.argv[1:]
    if "--release" in args:
        pko = args[args.index("--pko") + 1] if "--pko" in args else None
        prepare(Path(args[args.index("--release") + 1]),
                Path(pko) if pko else None)
    else:
        export()
