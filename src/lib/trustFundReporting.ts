import { SHOW_ADDITIONAL_TRUST_FUNDS } from "@/lib/featureFlags";
import type { BudgetData, BudgetNode } from "@/types";

export type TrustFundGrouping = "group" | "entity";

/** Codeless matrix accounts match only their stable portal identity. */
export function findTrustFundYearNode(
  nodes: BudgetNode[],
  selected: Pick<BudgetNode, "id" | "tier" | "code" | "sourceGroup">,
) {
  return (
    nodes.find((node) => node.id === selected.id) ??
    (selected.tier === "detail" && selected.code
      ? nodes.find(
          (node) =>
            node.tier === "detail" &&
            node.code === selected.code &&
            node.sourceGroup === selected.sourceGroup,
        )
      : undefined)
  );
}

/** Use each fund's annual source heading, independently of its mapped entity. */
export function trustFundScheduleGroups(data: BudgetData) {
  const groups = new Map<
    string,
    { code: string; label: string; amount: number; funds: BudgetNode[] }
  >();
  for (const node of data.nodes) {
    if (node.tier !== "detail" || node.sourceGroup === "separate_entities")
      continue;
    const heading = node.scheduleGroup;
    if (!heading) throw new Error(`Missing schedule group for ${node.code}`);
    let group = groups.get(heading.code);
    if (!group) {
      group = {
        code: heading.code,
        label: heading.label,
        amount: 0,
        funds: [],
      };
      groups.set(heading.code, group);
    }
    group.amount += node.amount;
    group.funds.push(node);
  }
  return [...groups.values()].sort((a, b) => Number(a.code) - Number(b.code));
}

export function trustFundSearchText(
  node: BudgetNode,
  parent?: BudgetNode,
  grouping: TrustFundGrouping = "entity",
) {
  return [
    node.label,
    node.code,
    node.entity?.acronym,
    parent?.label,
    parent?.code,
    parent?.entity?.acronym,
    grouping === "group" ? node.scheduleGroup?.label : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Keep source scope consistent across tiles, totals, deep links and year changes. */
export function trustFundReportingData(
  data: BudgetData,
  includeAdditional = SHOW_ADDITIONAL_TRUST_FUNDS,
): BudgetData {
  if (
    includeAdditional ||
    data.meta.stream !== "trust_funds" ||
    !data.meta.sourceGroups?.some((group) => group.id === "separate_entities")
  ) {
    return data;
  }

  const root = data.nodes.find(
    (node) => node.sourceGroup === "volume_i" && node.tier === "whole",
  );
  if (!root) throw new Error("Missing UN Secretariat trust-fund schedule root");

  return {
    ...data,
    meta: {
      ...data.meta,
      sourceKind: "trust_fund_schedule",
      title: "UN Secretariat trust-fund schedules",
      total: root.amount,
      scopeLabel: "UN Secretariat trust-fund schedules",
      scopeWarning:
        "Fund-level expenditure is not additive to programme-budget or consolidated Secretariat expenditure. Unmapped Trust Funds is a display group for funds without a verified entity assignment.",
      sourceNote:
        "Amounts come from the audited Schedules of Individual Trust Funds accompanying the United Nations Volume I accounts.",
      sourceGroups: data.meta.sourceGroups.filter(
        (group) => group.id === "volume_i",
      ),
    },
    nodes: data.nodes
      .filter((node) => node.sourceGroup === "volume_i")
      .map((node) =>
        node.id === root.id ? { ...node, parentId: null } : node,
      ),
  };
}
