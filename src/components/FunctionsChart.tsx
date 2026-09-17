"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelBar,
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelTotalRow,
} from "@un-eosg/ui/components/financial-panel-parts";
import { ChartFooter } from "@/components/ChartFooter";
import { YearSlider } from "@/components/YearSlider";
import { SidebarControls } from "@/components/SidebarControls";
import { FunctionsMethodology } from "@/components/FunctionsMethodology";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { useFunctionExpenses } from "@/hooks/useFunctionExpenses";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useDeepLink, clearSidebarHash } from "@/hooks/useDeepLink";
import {
  UN_FUNCTIONS,
  FUNCTION_SERIES,
  type FunctionExpenses,
  type UnFunctionKey,
} from "@/lib/functions";
import { formatBudget } from "@/lib/entities";

export function FunctionsChart() {
  const router = useRouter();
  const { data, error } = useFunctionExpenses();
  const [year, setYear] = useState<number | null>(null);
  const [pending, setSelected] = useDeepLink({
    hashPrefix: "function",
    sectionId: "functions",
    onNavigateAway: (): void => setSelected(null),
  });
  const selected =
    UN_FUNCTIONS.find((item) => item.key === pending)?.key ?? null;
  const close = useCallback(() => {
    setSelected(null);
    clearSidebarHash();
  }, [setSelected]);
  if (!data)
    return (
      <div role="status" className="py-12 text-sm">
        {error
          ? "Function spending could not be loaded. Please reload to try again."
          : "Loading spending by function…"}
      </div>
    );
  const requestedYear = pending
    ? Number(new URLSearchParams(window.location.search).get("year"))
    : null;
  const row =
    data.data.find((item) => item.year === (year ?? requestedYear)) ??
    data.data[data.data.length - 1];
  return (
    <>
      <GroupedTreemap
        className="[&>div:first-child]:flex [&>div:first-child]:min-h-24 [&>div:first-child]:items-end [&>div:first-child>div]:w-full [&>div:nth-child(2)]:flow-root"
        rows={UN_FUNCTIONS.map((item) => ({
          key: item.key,
          label: item.label,
          color: item.color,
          value: row.functions[item.key] ?? 0,
          leaves: Object.entries(row.entities)
            .map(([entity, amounts]) => ({
              key: `${item.key}:${entity}`,
              label: entity,
              value: amounts[item.key] ?? 0,
              color: item.color,
              onActivate: () =>
                router.push(
                  `/system/organizations/?year=${row.year}#entity=${encodeURIComponent(entity)}`,
                ),
            }))
            .filter((leaf) => leaf.value > 0)
            .sort(
              (a, b) => b.value - a.value || a.label.localeCompare(b.label),
            ),
        })).filter((group) => group.leaves.length > 0)}
        showRowLabels
        showLeafValues
        plotClassName="h-[280px]"
        plotStyle={{ marginTop: 10 }}
        totalLabel="Total spending"
        summaries={[
          {
            key: "total",
            label: "Total spending",
            value: formatBudget(row.total),
          },
        ]}
        formatValue={formatBudget}
        formatAccessibleValue={formatBudget}
        yearControl={
          <YearSlider
            years={data.meta.years}
            selectedYear={row.year}
            onChange={setYear}
          />
        }
        footer={
          <ChartFooter
            hint="Click on an organization to explore details."
            details={<FunctionsMethodology />}
          />
        }
        renderTooltip={({ row: group, leaf }) => (
          <FinancialTooltip
            title={leaf.label}
            parents={[{ label: group.label, color: group.color }]}
            total={{ label: "Spending", value: formatBudget(leaf.value) }}
            actionHint="Click to explore details"
          />
        )}
      />
      {selected && (
        <FunctionSidebar
          key={selected}
          functionKey={selected}
          initialYear={row.year}
          data={data}
          onClose={close}
        />
      )}
    </>
  );
}

export function FunctionsTrendsChart() {
  const { data, error } = useFunctionExpenses();
  if (!data)
    return (
      <p role="status" className="text-sm">
        {error
          ? "Function spending could not be loaded."
          : "Loading spending by function…"}
      </p>
    );
  return (
    <section className="min-w-0 space-y-4">
      <h3 className="text-xl font-bold">Spending by function over time</h3>
      <FinancingInstrumentChart
        height={325}
        legendClassName="min-h-24 content-end items-start"
        data={data.data.map((item) => ({
          year: String(item.year),
          ...item.functions,
        }))}
        series={FUNCTION_SERIES}
        filterable
        showTooltipTotal
      />
      <p className="text-sm text-slate-600">
        Current CEB classification, from 2018. Values are nominal US dollars;
        reporting coverage can change between years.
      </p>
    </section>
  );
}

function FunctionSidebar({
  functionKey,
  initialYear,
  data,
  onClose,
}: {
  functionKey: UnFunctionKey;
  initialYear: number;
  data: FunctionExpenses;
  onClose: () => void;
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [showAll, setShowAll] = useState(false);
  const focusRef = useFocusTrap(true);
  const definition = UN_FUNCTIONS.find((item) => item.key === functionKey)!;
  const row = data.data.find((item) => item.year === year)!;
  useEffect(() => {
    const style = document.documentElement.style;
    const overflow = style.overflow;
    const gutter = style.scrollbarGutter;
    style.overflow = "hidden";
    style.scrollbarGutter = "auto";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      style.overflow = overflow;
      style.scrollbarGutter = gutter;
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  const entities = Object.entries(row.entities)
    .map(([name, amounts]) => ({ name, amount: amounts[functionKey] ?? 0 }))
    .filter((item) => item.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
  const maximum = Math.max(1, ...entities.map((item) => Math.abs(item.amount)));
  const trends = data.data.map((item) => ({
    year: String(item.year),
    [functionKey]: item.functions[functionKey] ?? 0,
  }));
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        ref={focusRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="function-panel-title"
        className="h-full w-full overflow-hidden bg-white shadow-2xl sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px]"
        onClick={(event) => event.stopPropagation()}
      >
        <FinancialDetailPanel
          titleId="function-panel-title"
          className="sm:w-full"
          title={definition.label}
          yearSelectorPlacement="header"
          yearSelector={{
            years: [...data.meta.years].reverse(),
            selected: year,
            onChange: setYear,
            label: "Select year",
          }}
          controls={
            <SidebarControls
              shareHash={`function=${functionKey}`}
              onClose={onClose}
              closeLabel="Close function details"
            />
          }
        >
          <div className="space-y-6">
            <p className="text-sm">{definition.description}</p>
            <FinancialPanelTotalRow
              label="Total spending"
              value={formatBudget(row.functions[functionKey] ?? 0)}
            />
            <section className="space-y-3">
              <FinancialPanelHeading>Spending by entity</FinancialPanelHeading>
              {(showAll ? entities : entities.slice(0, 10)).map((item) => (
                <FinancialPanelRankedRow
                  key={item.name}
                  label={item.name}
                  value={formatBudget(item.amount)}
                  onClick={() =>
                    router.push(
                      `/system/organizations/?year=${year}#entity=${encodeURIComponent(item.name)}`,
                    )
                  }
                >
                  <FinancialPanelBar
                    percent={(Math.max(0, item.amount) / maximum) * 100}
                    color={definition.color}
                  />
                </FinancialPanelRankedRow>
              ))}
              {entities.length > 10 && (
                <button
                  className="text-sm text-un-blue hover:underline"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? "Show fewer"
                    : `Show all ${entities.length} entities`}
                </button>
              )}
            </section>
            <section className="space-y-3">
              <FinancialPanelHeading>Spending over time</FinancialPanelHeading>
              <FinancingInstrumentChart
                data={trends}
                series={FUNCTION_SERIES.filter(
                  (item) => item.key === functionKey,
                )}
                showLegend={false}
              />
            </section>
            <details className="group/sources">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                <FinancialPanelHeading subheading>
                  Source and methodology
                </FinancialPanelHeading>
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 group-open/sources:rotate-90"
                />
              </summary>
              <div className="mt-3">
                <FunctionsMethodology />
              </div>
            </details>
          </div>
        </FinancialDetailPanel>
      </div>
    </div>
  );
}
