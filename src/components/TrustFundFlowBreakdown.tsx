import {
  FinancialPanelSection,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { formatBudget } from "@un-eosg/ui/format-budget";
import type { TrustFundFlow } from "@/types";

export function TrustFundFlowBreakdown({ flows }: { flows: TrustFundFlow[] }) {
  const grouped = new Map<string, TrustFundFlow>();
  for (const flow of flows) {
    const existing = grouped.get(flow.group);
    grouped.set(flow.group, {
      ...flow,
      amount_usd: flow.amount_usd + (existing?.amount_usd ?? 0),
    });
  }
  const rows = [...grouped.values()];
  const maximum = Math.max(0, ...rows.map((row) => row.amount_usd));
  if (!rows.length) return null;
  return (
    <FinancialPanelSection heading="Contributions and transfers">
      <div className="space-y-3">
        {rows.map((row) => (
          <FinancialPanelRankedRow
            key={row.group}
            label={row.label}
            value={formatBudget(row.amount_usd)}
          >
            <FinancialPanelBar
              percent={
                maximum ? (Math.max(0, row.amount_usd) / maximum) * 100 : 0
              }
              color="var(--color-un-blue)"
            />
          </FinancialPanelRankedRow>
        ))}
      </div>
      <p className="mt-3 text-sm">
        Signed amounts include reported refunds and adjustments. Internal
        transfers move existing funding between accounts; these totals are not a
        measure of new external funding.
      </p>
    </FinancialPanelSection>
  );
}
