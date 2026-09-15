"use client";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatAssessmentRate } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { PaymentChartScaleProvider } from "@/components/PaymentChartScale";
import { ChartFooter } from "@/components/ChartFooter";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useEffect, useMemo, useState } from "react";
import { YearSlider } from "@/components/YearSlider";
import { RegularBudgetPaymentTimelineCard } from "@/components/RegularBudgetPaymentTimelineCard";
import { RegularBudgetPaymentStatusTrends } from "@/components/RegularBudgetPaymentStatusTrends";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  RegularBudgetContributor,
  RegularBudgetContributorsData,
  RegularBudgetPaymentStatus,
} from "@/types";

import {
  REGULAR_BUDGET_STATUS_STYLES as STATUS_STYLES,
  formatAssessmentCurrency as formatCurrency,
  formatAssessmentDate as formatDate,
} from "@/lib/regularBudgetContributors";
import { RegularBudgetContributorSidebar } from "@/components/RegularBudgetContributorSidebar";
import {
  useDeepLink,
  replaceToSidebar,
  clearSidebarHash,
} from "@/hooks/useDeepLink";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const STATUS_ORDER: RegularBudgetPaymentStatus[] = [
  "paid_on_time",
  "paid_late",
  "not_paid_in_full",
];

function statusCount(
  data: RegularBudgetContributorsData,
  status: RegularBudgetPaymentStatus,
): number {
  if (status === "paid_on_time") return data.meta.paid_on_time_count;
  if (status === "paid_late") return data.meta.paid_late_count;
  return data.meta.not_paid_in_full_count;
}

function matchesContributor(name: string, query: string): boolean {
  return name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function ContributorTooltip({
  context,
  asOf,
}: {
  context: GroupedTreemapTooltipContext<
    RegularBudgetPaymentStatus,
    never,
    RegularBudgetContributor,
    never
  >;
  asOf: string;
}) {
  const contributor = context.leaf.data;
  if (!contributor) return null;
  const status = STATUS_STYLES[contributor.payment_status];
  const paymentDetail =
    contributor.payment_status === "not_paid_in_full"
      ? `Not listed as paid in full as of ${formatDate(asOf)}`
      : contributor.payment_date
        ? `${status.label} on ${formatDate(contributor.payment_date)}`
        : status.label;

  return (
    <FinancialTooltip
      title={contributor.name}
      total={{
        label: "Assessment",
        value: formatCurrency(contributor.assessment_amount),
      }}
      rows={[
        {
          label: "Assessment rate",
          value: formatAssessmentRate(contributor.assessment_rate),
        },
      ]}
      notes={paymentDetail}
      actionHint="Click to explore details"
    />
  );
}

export function RegularBudgetContributorsTreemap() {
  const years = useYearRanges().regularBudgetContributors;
  const [selectedYear, setSelectedYear] = useState(years.default);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadedData, setLoadedData] =
    useState<RegularBudgetContributorsData | null>(null);
  const [loadError, setLoadError] = useState<{
    year: number;
    message: string;
  } | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "regular-budget-contributor",
    sectionId: "regular-budget-contributors",
    onNavigateAway: () => setSelectedName(null),
  });
  const activeName =
    pending && loadedData?.contributors.some((item) => item.name === pending)
      ? pending
      : selectedName;
  const data = loadedData;
  const error = loadError?.year === selectedYear ? loadError.message : null;
  const loading = data === null && error === null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/data/regular-budget-contributors-${selectedYear}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load regular-budget data for ${selectedYear}`,
          );
        }
        return response.json() as Promise<RegularBudgetContributorsData>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setLoadedData(payload);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setLoadError({
          year: selectedYear,
          message:
            reason instanceof Error ? reason.message : "Failed to load data",
        });
      });
    return () => controller.abort();
  }, [selectedYear]);

  const rows = useMemo(() => {
    if (!data) return [];
    return STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_STYLES[status].label,
      labelColor: STATUS_STYLES[status].textColor,
      color: STATUS_STYLES[status].color,
      data: status,
      leaves: data.contributors
        .filter(
          (contributor) =>
            contributor.payment_status === status &&
            Number.isFinite(contributor.assessment_amount) &&
            contributor.assessment_amount > 0,
        )
        .sort(
          (a, b) =>
            b.assessment_amount - a.assessment_amount ||
            a.name.localeCompare(b.name),
        )
        .map((contributor) => ({
          key: contributor.name,
          label: contributor.name,
          value: contributor.assessment_amount,
          color: STATUS_STYLES[contributor.payment_status].color,
          textColor: STATUS_STYLES[contributor.payment_status].textColor,
          borderColor:
            contributor.payment_status === "not_paid_in_full"
              ? "var(--color-un-green-shade)"
              : undefined,
          data: contributor,
          onActivate: () => {
            setPending(null);
            setSelectedName(contributor.name);
            replaceToSidebar("regular-budget-contributor", contributor.name);
          },
        })),
    })).filter((row) => row.leaves.length > 0) satisfies GroupedTreemapRow<
      RegularBudgetPaymentStatus,
      never,
      RegularBudgetContributor,
      never
    >[];
  }, [data, setPending]);

  return (
    <div id="regular-budget-contributors" className="relative w-full">
      <DelayedChartLoading
        pending={loadedData?.meta.year !== selectedYear}
        requestKey={selectedYear}
      />
      {data && (
        <>
          <GroupedTreemap<
            RegularBudgetPaymentStatus,
            never,
            RegularBudgetContributor,
            never
          >
            footer={
              <ChartFooter
                details={
                  <div className="space-y-2">
                    <p>
                      Tile area uses each Member State&apos;s assessment in the
                      official{" "}
                      <a
                        href={data.meta.sources.assessment_document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-gray-700"
                      >
                        {data.meta.sources.assessment_document.symbol}{" "}
                        assessment circular
                      </a>
                      . Payment colour and date use the{" "}
                      <a
                        href={data.meta.sources.honour_roll.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-gray-700"
                      >
                        UN regular-budget honour roll
                      </a>
                      . Assessment rates are checked against the{" "}
                      <a
                        href={data.meta.sources.scale.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-gray-700"
                      >
                        historical scale of assessments
                      </a>
                      .
                    </p>
                    <p>
                      “Not listed as paid in full” may include Member States
                      that made a partial payment. It does not mean that no
                      payment was made.
                    </p>
                    {data.meta.year >= 2025 && (
                      <p>
                        From 2025, the circular&apos;s total includes the
                        Peacebuilding Fund portion assessed in the
                        regular-budget circular. Other assessed and
                        extrabudgetary contributions are excluded from this
                        view.
                      </p>
                    )}
                    {data.meta.amount_reconciliation.discrepancies.length >
                      0 && (
                      <p>
                        The honour roll and assessment circular differ for{" "}
                        {data.meta.amount_reconciliation.discrepancies.length}{" "}
                        Member State
                        {data.meta.amount_reconciliation.discrepancies
                          .length === 1
                          ? ""
                          : "s"}
                        ; the treemap uses the assessment circular amount.
                      </p>
                    )}
                  </div>
                }
                hint="Click on a contributor to explore details"
                sourceSuffix={`Status as of ${formatDate(data.meta.as_of)}`}
              />
            }
            yearControl={
              <YearSlider
                years={years.years}
                selectedYear={selectedYear}
                onChange={setSelectedYear}
                disabled={loading}
              />
            }
            controls={
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Payment statuses"
              >
                {STATUS_ORDER.map((status) => {
                  const style = STATUS_STYLES[status];
                  return (
                    <LegendLabel
                      key={status}
                      label={`${style.label} (${statusCount(data, status)})`}
                      color={style.color}
                      selected={!hiddenGroups.includes(status)}
                      onToggle={() =>
                        setHiddenGroups((current) =>
                          current.includes(status)
                            ? current.filter((key) => key !== status)
                            : [...current, status],
                        )
                      }
                    />
                  );
                })}
              </div>
            }
            rows={rows.filter((row) => !hiddenGroups.includes(row.key))}
            search={{
              value: searchQuery,
              onChange: setSearchQuery,
              label: "Search Member States",
              placeholder: "Search Member States...",
              predicate: (leafLabel, _subgroupLabel, _rowLabel, query) =>
                matchesContributor(leafLabel, query),
            }}
            totalLabel="Total"
            layout={{
              rowOrder: "input",
              consolidateSmallRows: false,
              leafGap: 2,
            }}
            plotClassName="h-[560px] sm:h-[680px] lg:h-[780px]"
            formatValue={(value) => formatCurrency(value)}
            formatAccessibleValue={(value) => formatCurrency(value)}
            showLeafValues
            renderTooltip={(context) => (
              <ContributorTooltip context={context} asOf={data.meta.as_of} />
            )}
            emptyContent={
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-500">
                  No Member States match the selected statuses and search.
                </p>
              </div>
            }
          />
        </>
      )}

      {loading && (
        <div className="flex h-[560px] items-center justify-center bg-gray-100 sm:h-[680px] lg:h-[780px]">
          <p className="text-sm text-gray-500">
            Loading regular-budget assessments...
          </p>
        </div>
      )}
      {!loading && error && (
        <div className="flex h-80 items-center justify-center bg-gray-100 px-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {activeName && data && (
        <RegularBudgetContributorSidebar
          key={activeName}
          name={activeName}
          initialData={data}
          years={years.years}
          onClose={() => {
            setSelectedName(null);
            setPending(null);
            clearSidebarHash();
          }}
        />
      )}
      <PaymentChartScaleProvider>
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-0">
          <RegularBudgetPaymentStatusTrends />
          <RegularBudgetPaymentTimelineCard />
        </div>
      </PaymentChartScaleProvider>
    </div>
  );
}
