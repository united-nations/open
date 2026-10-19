import { fundingSources } from "@un-eosg/ui/funding-sources";
import type {
  SankeyGraph,
  SankeyNode,
  SankeySelection,
} from "@un-eosg/ui/sankey";
import type { SecretariatOverviewData } from "@/types";
import { priorityAreaColor } from "./secretariatGroupings";

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

export function buildSecretariatFlows(
  data: SecretariatOverviewData,
  rows: SecretariatRecord[],
  expanded: ReadonlySet<string>,
  limit = 12,
) {
  // The source uses one generic arrangement for unitemized resources.
  // Expand by the reporting entity without inventing named funds or allocations.
  const detailIdentity = (row: SecretariatRecord) =>
    row.arrangement.family === "unitemized"
      ? {
          id: `unitemized:entity:${row.code}`,
          label: `${row.code} XB`,
        }
      : row.arrangement;
  const familyOrder = Object.keys(data.meta.funding_families);
  const visibleFunds = new Set<string>();
  for (const family of expanded) {
    const totals = new Map<string, number>();
    for (const row of rows.filter((r) => r.arrangement.family === family)) {
      const { id } = detailIdentity(row);
      totals.set(id, (totals.get(id) ?? 0) + Math.abs(row.amount));
    }
    [...totals]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .forEach(([id]) => visibleFunds.add(id));
  }
  const nodes = new Map<string, SankeyNode>();
  const nodeRows = new Map<string, SecretariatRecord[]>();
  const edgeRows = new Map<string, SecretariatRecord[]>();
  const addRows = (
    map: Map<string, SecretariatRecord[]>,
    key: string,
    row: SecretariatRecord,
  ) => map.set(key, [...(map.get(key) ?? []), row]);
  for (const row of rows) {
    const { family } = row.arrangement;
    const { id, label } = detailIdentity(row);
    const detail = expanded.has(family);
    const further = detail && !visibleFunds.has(id);
    const fundingId =
      "fund:" + (detail ? (further ? family + ":further" : id) : family);
    const categoryId = "group:" + row.group;
    const priorityId = "priority:" + row.priority_area;
    const category =
      data.meta.groups[row.group as keyof typeof data.meta.groups];
    const path: SankeyNode[] = [
      {
        id: fundingId,
        column: 0,
        label: detail
          ? further
            ? "Further identified arrangements"
            : label
          : data.meta.funding_families[family],
        color: "var(--color-un-blue)",
        order: familyOrder.indexOf(family),
        isAggregate: further,
      },
      {
        id: categoryId,
        column: 1,
        label: category.label,
        color: category.color,
        order: category.order,
      },
      {
        id: priorityId,
        column: 2,
        label: row.priority_area,
        color: priorityAreaColor(row.priority_area),
        order: data.meta.priorities.indexOf(row.priority_area),
      },
    ];
    for (const node of path) {
      nodes.set(node.id, node);
      addRows(nodeRows, node.id, row);
    }
    addRows(edgeRows, edgeKey(fundingId, categoryId), row);
    addRows(edgeRows, edgeKey(categoryId, priorityId), row);
  }
  const graph: SankeyGraph = {
    nodes: [...nodes.values()],
    links: [...edgeRows].map(([key, members]) => {
      const [source, target] = JSON.parse(key) as [string, string];
      return {
        source,
        target,
        value: sumRecords(members),
        positiveValue: positiveRecords(members),
      };
    }),
  };
  return { graph, nodeRows, edgeRows, rows };
}
export type SecretariatFlowModel = ReturnType<typeof buildSecretariatFlows>;
/** Direct funding-source to priority-area flows, preserving signed source records. */
export function buildSecretariatFundingFlows(
  data: SecretariatOverviewData,
  rows: SecretariatRecord[] = data.records,
): SecretariatFlowModel {
  const nodes = new Map<string, SankeyNode>();
  const nodeRows = new Map<string, SecretariatRecord[]>();
  const edgeRows = new Map<string, SecretariatRecord[]>();
  for (const row of rows) {
    const funding = fundingSources[row.funding_source];
    const source: SankeyNode = {
      id: "source:" + row.funding_source,
      column: 0,
      label: funding.label,
      color: funding.color,
      order: data.meta.funding_sources.indexOf(row.funding_source),
    };
    const priority: SankeyNode = {
      id: "priority:" + row.priority_area,
      column: 1,
      label: row.priority_area,
      color: priorityAreaColor(row.priority_area),
      order: data.meta.priorities.indexOf(row.priority_area),
    };
    for (const node of [source, priority]) {
      nodes.set(node.id, node);
      const members = nodeRows.get(node.id) ?? [];
      members.push(row);
      nodeRows.set(node.id, members);
    }
    const key = edgeKey(source.id, priority.id);
    const members = edgeRows.get(key) ?? [];
    members.push(row);
    edgeRows.set(key, members);
  }
  for (const column of [0, 1]) {
    const ranked = [...nodes.values()]
      .filter((node) => node.column === column)
      .sort(
        (a, b) =>
          sumRecords(nodeRows.get(b.id) ?? []) -
            sumRecords(nodeRows.get(a.id) ?? []) ||
          a.label.localeCompare(b.label),
      );
    ranked.forEach((node, order) => {
      node.order = order;
    });
  }
  const graph: SankeyGraph = {
    nodes: [...nodes.values()],
    links: [...edgeRows].map(([key, members]) => {
      const [source, target] = JSON.parse(key) as [string, string];
      return {
        source,
        target,
        color: nodes.get(source)!.color,
        value: sumRecords(members),
        positiveValue: positiveRecords(members),
      };
    }),
  };
  return { graph, nodeRows, edgeRows, rows };
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
