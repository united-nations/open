"use client";

import { FinancialPanelSection } from "@un-eosg/ui/components/financial-panel-parts";
import { useRegularBudgetOutstanding } from "@/hooks/useRegularBudgetOutstanding";
import {
  RegularBudgetOutstandingTrendsChart,
  outstandingMetricRows,
  type AssessmentFiles,
} from "@/components/RegularBudgetOutstandingTrendsChart";
import {
  formatAssessmentCurrency as money,
  formatAssessmentDate as date,
} from "@/lib/regularBudgetContributors";
import {
  outstandingAmount,
  outstandingSourceUrl,
} from "@/lib/regularBudgetOutstanding";

export function RegularBudgetOutstandingSidebarHistory({
  name,
  year,
  assessments,
}: {
  name: string;
  year: number;
  assessments: AssessmentFiles;
}) {
  const { rows, error } = useRegularBudgetOutstanding();
  const snapshot = rows?.find((row) => row.meta.year === year);
  const amount = outstandingAmount(snapshot, [name]);
  return (
    <FinancialPanelSection heading="Outstanding contributions">
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : !rows ? (
        <p role="status" className="text-sm text-gray-600">
          Loading outstanding-balance history…
        </p>
      ) : (
        <>
          {snapshot && amount !== null ? (
            <>
              <p className="text-2xl font-medium" data-country-outstanding>
                {money(amount)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                At {date(snapshot.meta.as_of)}
              </p>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-sm">
                {outstandingMetricRows(
                  snapshot,
                  rows.find((row) => row.meta.year === year - 1),
                  [name],
                  assessments,
                  false,
                ).map((row) => (
                  <div key={row.label} className="contents">
                    <dt>{row.label}</dt>
                    <dd className="text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Outstanding balance unavailable for {year}.
            </p>
          )}
          <p className="my-3 text-sm text-gray-600">
            Includes previous years’ arrears. Balance / annual assessment is a
            comparison with one year’s assessment, not the percentage of that
            year left unpaid.
          </p>
          <RegularBudgetOutstandingTrendsChart
            rows={rows}
            names={[name]}
            assessments={assessments}
            compact
            showShareOfTotal={false}
          />
          <p className="mt-3 text-sm text-gray-600">
            Balances are autumn snapshots. The honour roll has a separate
            reporting date.
          </p>
          {snapshot && (
            <p className="mt-3 text-sm">
              <a
                href={outstandingSourceUrl(snapshot)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue underline"
              >
                Balance source: {year} financial situation presentation,{" "}
                {snapshot.meta.source.format === "pdf" ? "page" : "slide"}{" "}
                {snapshot.meta.source.page}
              </a>
            </p>
          )}
          {snapshot?.meta.reconciliation_note && (
            <p className="mt-2 text-sm text-gray-600">
              {snapshot.meta.reconciliation_note}
            </p>
          )}
        </>
      )}
    </FinancialPanelSection>
  );
}
