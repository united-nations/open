import { fundingSources } from "@un-eosg/ui/funding-sources";
import type {
  SankeyGraph,
  SankeyNode,
  SankeySelection,
} from "@un-eosg/ui/sankey";
import type { SecretariatOverviewData } from "@/types";
import {
  fundingArrangementColor,
  priorityAreaColor,
} from "./secretariatGroupings";

export interface SecretariatRecord {
  id: string;
  year: number;
  financial_year: string;
  original_code: string;
  code: string;
  entity_id: string | null;
  name: string;
  group: string;
  group_basis: string;
  priority_area: string;
  funding_source: "regular_budget" | "other_assessed" | "extrabudgetary";
  source_type: string;
  reference: string;
  note: string;
  amount: number;
  amount_exact: string;
  budgetary_spm: boolean | null;
  spm_evidence: string[];
  budgetary_spm_status: string;
  budget_reporting_identity: {
    id: string;
    name: string;
    edition: number;
    reportingYear: number;
    qualification: string;
  } | null;
  arrangement: {
    id: string;
    family: string;
    label: string;
    subtype: string;
    evidence: string;
    fund_codes?: string[];
  };
}
export const sumRecords = (rows: SecretariatRecord[]) =>
  rows.reduce((sum, row) => sum + row.amount, 0);
export const positiveRecords = (rows: SecretariatRecord[]) =>
  rows.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
export const edgeKey = (source: string, target: string) =>
  JSON.stringify([source, target]);

export type SecretariatFlowDimension =
  | "mechanism"
  | "arrangement"
  | "category"
  | "entity"
  | "priority";
export const SECRETARIAT_FLOW_DIMENSIONS = {
  mechanism: {
    column: 0,
    label: "Funding mechanism",
    heading: "Funding mechanisms",
  },
  arrangement: {
    column: 0,
    label: "Funding arrangement",
    heading: "Funding arrangements",
  },
  category: {
    column: 1,
    label: "Entity category",
    heading: "Entity categories",
  },
  entity: { column: 1, label: "Entity", heading: "Entities" },
  priority: { column: 2, label: "Priority area", heading: "Priority areas" },
} as const;
export interface SecretariatFlowChoices {
  funding: "mechanism" | "arrangement" | "none";
  entity: "category" | "entity" | "none";
  priority: "priority" | "none";
}

export function secretariatFlowDimensions(choices: SecretariatFlowChoices) {
  return [choices.funding, choices.entity, choices.priority].filter(
    (dimension): dimension is SecretariatFlowDimension => dimension !== "none",
  );
}

function assembleFlows(
  rows: SecretariatRecord[],
  paths: SankeyNode[][],
  rankByAmount = false,
) {
  const nodes = new Map<string, SankeyNode>();
  const nodeRows = new Map<string, SecretariatRecord[]>();
  const edgeRows = new Map<string, SecretariatRecord[]>();
  const add = (
    map: Map<string, SecretariatRecord[]>,
    key: string,
    row: SecretariatRecord,
  ) => {
    const members = map.get(key) ?? [];
    members.push(row);
    map.set(key, members);
  };
  paths.forEach((path, index) => {
    const row = rows[index];
    path.forEach((node, column) => {
      nodes.set(node.id, node);
      add(nodeRows, node.id, row);
      if (column > 0) add(edgeRows, edgeKey(path[column - 1].id, node.id), row);
    });
  });
  if (rankByAmount) {
    for (const column of new Set(
      paths.flatMap((path) => path.map((node) => node.column)),
    )) {
      [...nodes.values()]
        .filter((node) => node.column === column)
        .sort(
          (a, b) =>
            Number(!!a.isAggregate) - Number(!!b.isAggregate) ||
            sumRecords(nodeRows.get(b.id) ?? []) -
              sumRecords(nodeRows.get(a.id) ?? []) ||
            a.label.localeCompare(b.label),
        )
        .forEach((node, order) => {
          node.order = order;
        });
    }
  }
  const graph: SankeyGraph = {
    nodes: [...nodes.values()],
    links: [...edgeRows].map(([key, members]) => {
      const [source, target] = JSON.parse(key) as [string, string];
      return {
        source,
        target,
        color: source.startsWith("source:")
          ? nodes.get(source)!.color
          : undefined,
        value: sumRecords(members),
        positiveValue: positiveRecords(members),
      };
    }),
  };
  return { graph, nodeRows, edgeRows, rows };
}

function dimensionNode(
  data: SecretariatOverviewData,
  row: SecretariatRecord,
  dimension: SecretariatFlowDimension,
  column: number,
): SankeyNode {
  const category = data.meta.groups[row.group as keyof typeof data.meta.groups];
  switch (dimension) {
    case "mechanism": {
      const source = fundingSources[row.funding_source];
      return {
        id: "source:" + row.funding_source,
        column,
        label: source.label,
        color: source.color,
      };
    }
    case "arrangement":
      return {
        id: "fund:" + row.arrangement.family,
        column,
        label: data.meta.funding_families[row.arrangement.family],
        color: fundingArrangementColor(row.arrangement.family),
        order: Object.keys(data.meta.funding_families).indexOf(
          row.arrangement.family,
        ),
      };
    case "category":
      return {
        id: "group:" + row.group,
        column,
        label: category.label,
        color: category.color,
        order: category.order,
      };
    case "entity":
      return {
        id: "entity:" + row.code,
        column,
        label: row.code,
        fullLabel: row.name,
        color: "var(--color-dusty-gray)",
      };
    case "priority":
      return {
        id: "priority:" + row.priority_area,
        column,
        label: row.priority_area,
        color: priorityAreaColor(row.priority_area),
        order: data.meta.priorities.indexOf(row.priority_area),
      };
  }
}

// The source uses one generic arrangement for unitemized resources.
// Expand by reporting entity without inventing named funds or allocations.
const arrangementIdentity = (row: SecretariatRecord) =>
  row.arrangement.family === "unitemized"
    ? { id: `unitemized:entity:${row.code}`, label: `${row.code} XB` }
    : row.arrangement;

function arrangementPaths(
  data: SecretariatOverviewData,
  rows: SecretariatRecord[],
  expanded: ReadonlySet<string>,
  limit: number,
) {
  const visibleFunds = new Set<string>();
  for (const family of expanded) {
    const totals = new Map<string, number>();
    for (const row of rows.filter((r) => r.arrangement.family === family)) {
      const { id } = arrangementIdentity(row);
      totals.set(id, (totals.get(id) ?? 0) + Math.abs(row.amount));
    }
    [...totals]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .forEach(([id]) => visibleFunds.add(id));
  }
  return rows.map((row) => {
    const { family } = row.arrangement;
    const { id, label } = arrangementIdentity(row);
    const detail = expanded.has(family);
    const further = detail && !visibleFunds.has(id);
    return {
      ...dimensionNode(data, row, "arrangement", 0),
      color: fundingArrangementColor(
        family,
        detail && !further ? row.code : undefined,
      ),
      id: "fund:" + (detail ? (further ? family + ":further" : id) : family),
      label: detail
        ? further
          ? "Further identified arrangements"
          : label
        : data.meta.funding_families[family],
      isAggregate: further,
    };
  });
}

export function buildSecretariatFlows(
  data: SecretariatOverviewData,
  rows: SecretariatRecord[],
  expanded: ReadonlySet<string>,
  limit = 12,
) {
  const arrangements = arrangementPaths(data, rows, expanded, limit);
  return assembleFlows(
    rows,
    rows.map((row, index) => [
      arrangements[index],
      dimensionNode(data, row, "category", 1),
      dimensionNode(data, row, "priority", 2),
    ]),
  );
}
export type SecretariatFlowModel = ReturnType<typeof assembleFlows>;

/** Direct funding-source to priority-area flows, preserving signed source records. */
export function buildSecretariatFundingFlows(
  data: SecretariatOverviewData,
  rows: SecretariatRecord[] = data.records,
): SecretariatFlowModel {
  return assembleFlows(
    rows,
    rows.map((row) => [
      dimensionNode(data, row, "mechanism", 0),
      dimensionNode(data, row, "priority", 1),
    ]),
    true,
  );
}

/** Re-group the same ledger occurrences; omitted dimensions imply no allocation. */
export function buildSecretariatColumnFlows(
  data: SecretariatOverviewData,
  choices: SecretariatFlowChoices,
  limit = 12,
  rows: SecretariatRecord[] = data.records,
): SecretariatFlowModel {
  const slots = [choices.funding, choices.entity, choices.priority];
  const dimensions = secretariatFlowDimensions(choices);
  if (dimensions.length < 2)
    throw new Error("Select at least two flow dimensions");
  const arrangements =
    choices.funding === "arrangement"
      ? arrangementPaths(data, rows, new Set(["unitemized"]), Infinity)
      : [];
  const paths = rows.map((row, index) =>
    dimensions.map((dimension) => {
      const column = slots.indexOf(dimension);
      return dimension === "arrangement"
        ? { ...arrangements[index], column }
        : dimensionNode(data, row, dimension, column);
    }),
  );
  dimensions.forEach((dimension, index) => {
    const column = slots.indexOf(dimension);
    if (
      !Number.isFinite(limit) ||
      (dimension !== "entity" && dimension !== "arrangement")
    )
      return;
    const totals = new Map<string, number>();
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const id = paths[rowIndex][index].id;
      totals.set(id, (totals.get(id) ?? 0) + Math.abs(rows[rowIndex].amount));
    }
    const tail = new Set(
      [...totals]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(limit)
        .map(([id]) => id),
    );
    if (!tail.size) return;
    for (const path of paths) {
      if (tail.has(path[index].id))
        path[index] = {
          id: dimension + ":remaining",
          column,
          label: `${tail.size} other ${dimension === "entity" ? "entities" : "arrangements"}`,
          color: "var(--color-dusty-gray)",
          isAggregate: true,
        };
    }
  });
  return assembleFlows(rows, paths, true);
}

export function selectionRows(
  model: SecretariatFlowModel,
  selection: SankeySelection,
  within?: SankeySelection,
): SecretariatRecord[] {
  const members =
    (selection.kind === "node"
      ? model.nodeRows.get(selection.id)
      : model.edgeRows.get(edgeKey(selection.source, selection.target))) ?? [];
  if (!within) return members;
  const ids = new Set(selectionRows(model, within).map((r) => r.id));
  return members.filter((r) => ids.has(r.id));
}
export function selectedLinkValue(
  model: SecretariatFlowModel,
  selection: SankeySelection,
  source: string,
  target: string,
) {
  const ids = new Set(selectionRows(model, selection).map((r) => r.id));
  return positiveRecords(
    (model.edgeRows.get(edgeKey(source, target)) ?? []).filter((r) =>
      ids.has(r.id),
    ),
  );
}
