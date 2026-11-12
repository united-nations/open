"use client";

import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { SidebarControls } from "@/components/SidebarControls";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { useContributorSidebarYear } from "@/hooks/useContributorSidebarYear";
import { collectBudgetNodeSources } from "@/lib/budgetSourceCollection";
import { COST_CLASS_LABELS, fiscalYearLabel } from "@/lib/budgetGroupings";
import { formatBudget } from "@/lib/entities";
import {
  PEACEKEEPING_METRICS,
  peacekeepingSidebarHash,
  type PeacekeepingMetric,
} from "@/lib/peacekeepingBudget";
import { useYearRanges } from "@/lib/useYearRanges";
import type { BudgetData } from "@/types";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelBar,
  FinancialPanelRankedRow,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";

export function PeacekeepingAccountSidebar({
  code,
  metric,
  initialData,
  onClose,
}: {
  code: string;
  metric: PeacekeepingMetric;
  initialData: BudgetData;
  onClose: () => void;
}) {
  const ranges = useYearRanges();
  const years = (
    metric === "approved"
      ? ranges.budgetPkoApproved
      : metric === "proposed"
        ? ranges.budgetPkoProposed
        : ranges.budgetPko
  ).years;
  const selection = useContributorSidebarYear<BudgetData>(
    `budget-pko-${metric}`,
    initialData.meta.year,
  );
  const data = selection.isInitialYear ? initialData : selection.data;
  const initialAccount = initialData.peacekeepingSupplement?.accounts.find(
    (row) => row.code === code,
  );
  const account = data?.peacekeepingSupplement?.accounts.find(
    (row) => row.code === code,
  );
  const missionNodes =
    data?.nodes.filter((node) => node.mission === code) ?? [];
  const mission = missionNodes.find(
    (node) => node.tier === "mission" && node.costClass === "total",
  );
  const amount = account?.amount ?? mission?.amount;
  const breakdown =
    account?.breakdown ??
    missionNodes.flatMap((node) =>
      node.tier === "class" && node.costClass
        ? [
            {
              label: COST_CLASS_LABELS[node.costClass] ?? node.label,
              amount: node.amount,
            },
          ]
        : [],
    );
  const references = account
    ? [account.source, ...account.breakdown.map((row) => row.source)]
    : missionNodes.flatMap((node) => collectBudgetNodeSources(node));
  const titleId = "peacekeeping-account-title";

  return (
    <DetailDrawer onClose={onClose} titleId={titleId} className="sm:w-[32rem]">
      <FinancialDetailPanel
        title={
          <DrawerTitle>
            {account?.label ??
              mission?.label ??
              initialAccount?.label ??
              "Peacekeeping support account"}
          </DrawerTitle>
        }
        titleId={titleId}
        subtitle={account?.note}
        controls={
          <SidebarControls
            shareHash={peacekeepingSidebarHash(code, metric, selection.year)}
            onClose={onClose}
            closeLabel="Close account details"
          />
        }
        yearSelectorPlacement="header"
        yearSelector={{
          years: [...years].sort((a, b) => b - a),
          selected: selection.year,
          onChange: selection.setYear,
          label: "Select fiscal year",
          formatLabel: fiscalYearLabel,
        }}
        total={
          amount === undefined
            ? undefined
            : {
                label: PEACEKEEPING_METRICS[metric],
                value: formatBudget(amount),
              }
        }
        busy={selection.loading}
        statusMessage={
          selection.loading ? "Loading account details…" : undefined
        }
        notice={
          selection.error
            ? { tone: "error", description: selection.error }
            : !selection.loading && amount === undefined
              ? {
                  tone: "empty",
                  description:
                    "No amount is published for this account in the selected fiscal year and budget stage.",
                }
              : undefined
        }
      >
        {breakdown.length > 0 && (
          <FinancialPanelSection heading="Cost breakdown">
            <div className="space-y-2">
              {breakdown.map((row) => (
                <FinancialPanelRankedRow
                  key={row.label}
                  label={row.label}
                  value={formatBudget(row.amount)}
                >
                  <FinancialPanelBar
                    percent={amount ? (row.amount / amount) * 100 : 0}
                    color="var(--color-un-blue)"
                  />
                </FinancialPanelRankedRow>
              ))}
            </div>
          </FinancialPanelSection>
        )}
        {references.length > 0 && (
          <SourceReferenceList references={references} />
        )}
      </FinancialDetailPanel>
    </DetailDrawer>
  );
}
