import { SHOW_ADDITIONAL_TRUST_FUNDS } from "@/lib/featureFlags";
import type { BudgetData } from "@/types";

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
