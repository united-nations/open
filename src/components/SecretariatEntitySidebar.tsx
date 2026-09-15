"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FinancialDetailPanel,
  type FinancialDetailPanelFundingBreakdown,
  type FinancialDetailPanelNotice,
} from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelBar,
  FinancialPanelRankedRow,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";
import { SidebarControls } from "@/components/SidebarControls";
import {
  FUNDING_SOURCE_TREND_SERIES,
  type FinancingInstrumentDataPoint,
} from "@/components/SidebarStackedTrend";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { fundingSources } from "@un-eosg/ui/funding-sources";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";
import {
  PRIORITY_AREA_DISPLAY_ORDER,
  priorityAreaColor,
} from "@/lib/secretariatGroupings";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  SecretariatFundingSource,
  SecretariatOverviewData,
  SecretariatOverviewEntity,
} from "@/types";

const FUNDING_SOURCES: readonly SecretariatFundingSource[] = [
  "regular_budget",
  "other_assessed",
  "extrabudgetary",
];

interface SecretariatEntitySidebarProps {
  entity: SecretariatOverviewEntity;
  year: number;
  source: SecretariatOverviewData["meta"]["source"];
  selectedPriority: string | null;
  onClose: () => void;
}

interface DisplayedEntity {
  entity: SecretariatOverviewEntity;
  year: number;
  source: SecretariatOverviewData["meta"]["source"];
}

function amountRows(
  entity: SecretariatOverviewEntity,
  key: "priority_area" | "funding_source",
) {
  const values = new Map<string, number>();
  for (const cell of entity.cells) {
    const label = cell[key];
    values.set(label, (values.get(label) ?? 0) + cell.amount);
  }
  return [...values.entries()].sort((a, b) => b[1] - a[1]);
}

function fundingAmounts(entity: SecretariatOverviewEntity) {
  const amounts: Record<SecretariatFundingSource, number> = {
    regular_budget: 0,
    other_assessed: 0,
    extrabudgetary: 0,
  };
  for (const cell of entity.cells) amounts[cell.funding_source] += cell.amount;
  return amounts;
}

export function SecretariatEntitySidebar({
  entity,
  year,
  source,
  selectedPriority,
  onClose,
}: SecretariatEntitySidebarProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [displayed, setDisplayed] = useState<DisplayedEntity>({
    entity,
    year,
    source,
  });
  const [requestedYear, setRequestedYear] = useState<number | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);
  const [fundingTrend, setFundingTrend] = useState<
    FinancingInstrumentDataPoint[] | null
  >(null);
  const [trendIncomplete, setTrendIncomplete] = useState(false);
  const focusTrapRef = useFocusTrap(true);
  const years = useYearRanges().secretariatOverview.years;

  const priorities = useMemo(() => {
    const values = new Map(amountRows(displayed.entity, "priority_area"));
    for (const label of PRIORITY_AREA_DISPLAY_ORDER) {
      if (!values.has(label)) values.set(label, 0);
    }
    return [...values.entries()].sort(([a], [b]) => {
      const rank = (name: string) => {
        const index = PRIORITY_AREA_DISPLAY_ORDER.indexOf(name);
        return index < 0 ? PRIORITY_AREA_DISPLAY_ORDER.length : index;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    });
  }, [displayed.entity]);
  const maxPriorityAmount = Math.max(
    0,
    ...priorities.map(([, amount]) => amount),
  );
  const amounts = useMemo(
    () => fundingAmounts(displayed.entity),
    [displayed.entity],
  );
  const breakdownTotal = FUNDING_SOURCES.reduce(
    (sum, fundingSource) => sum + amounts[fundingSource],
    0,
  );
  const breakdownDifference = displayed.entity.total - breakdownTotal;
  const breakdownComplete = Math.abs(breakdownDifference) < 0.5;
  const selectedAmount = selectedPriority
    ? (priorities.find(([label]) => label === selectedPriority)?.[1] ?? 0)
    : null;

  useEffect(() => {
    if (requestedYear === null) return;
    let active = true;
    loadYearData<SecretariatOverviewData>("secretariat-overview", requestedYear)
      .then((data) => {
        if (!active) return;
        const match = data.entities.find((item) => item.code === entity.code);
        if (!match) {
          throw new Error(
            `${entity.code} is not available in the ${requestedYear} data.`,
          );
        }
        setDisplayed({
          entity: match,
          year: requestedYear,
          source: data.meta.source,
        });
        setYearError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setYearError(
          reason instanceof Error
            ? reason.message
            : `Failed to load ${requestedYear} data.`,
        );
      })
      .finally(() => {
        if (active) setRequestedYear(null);
      });
    return () => {
      active = false;
    };
  }, [entity.code, requestedYear]);

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((trendYear) =>
        loadYearData<SecretariatOverviewData>("secretariat-overview", trendYear)
          .then((data) => ({ year: trendYear, data, failed: false }))
          .catch(() => ({ year: trendYear, data: null, failed: true })),
      ),
    ).then((rows) => {
      if (!active) return;
      setTrendIncomplete(rows.some((row) => row.failed));
      setFundingTrend(
        rows.map(({ year: trendYear, data }) => {
          const match = data?.entities.find(
            (item) => item.code === entity.code,
          );
          return {
            year: String(trendYear),
            ...fundingAmounts(
              match ?? {
                ...entity,
                total: 0,
                cells: [],
              },
            ),
          };
        }),
      );
    });
    return () => {
      active = false;
    };
  }, [entity, years]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    const rootStyle = document.documentElement.style;
    const previousOverflow = rootStyle.overflow;
    const previousGutter = rootStyle.scrollbarGutter;
    rootStyle.overflow = "hidden";
    rootStyle.scrollbarGutter = "auto";
    return () => {
      cancelAnimationFrame(id);
      rootStyle.overflow = previousOverflow;
      rootStyle.scrollbarGutter = previousGutter;
    };
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const titleId = "secretariat-entity-sidebar-title";
  const hasTrend =
    fundingTrend !== null &&
    fundingTrend.length >= 2 &&
    FUNDING_SOURCE_TREND_SERIES.some((series) =>
      fundingTrend.some(
        (point) =>
          typeof point[series.key] === "number" &&
          Number(point[series.key]) > 0,
      ),
    );

  const fundingBreakdown: FinancialDetailPanelFundingBreakdown = {
    heading: "Funding sources",
    state:
      breakdownTotal === 0
        ? "empty"
        : breakdownComplete
          ? "ready"
          : "incomplete",
    status:
      breakdownTotal === 0
        ? `No funding-source breakdown is available for ${displayed.year}.`
        : breakdownComplete
          ? `Funding-source breakdown for ${displayed.year} is ready.`
          : `The funding-source breakdown differs from the displayed total by ${formatBudget(Math.abs(breakdownDifference))}.`,
    items: FUNDING_SOURCES.map((fundingSource) => ({
      id: fundingSource,
      label: (
        <FundingSourceLabel
          source={fundingSource}
          variant="inline"
          showMarker={false}
        />
      ),
      value: formatBudget(amounts[fundingSource]),
      marker: null,
      color: fundingSources[fundingSource].color,
      percent:
        (Math.max(0, amounts[fundingSource]) /
          Math.max(
            1,
            ...Object.values(amounts).map((amount) => Math.max(0, amount)),
          )) *
        100,
    })),
    content: (
      <div aria-busy={fundingTrend === null || undefined}>
        {hasTrend && fundingTrend && (
          <FinancingInstrumentChart
            data={fundingTrend}
            series={FUNDING_SOURCE_TREND_SERIES}
            compact
            showLegend={false}
          />
        )}
        <p
          aria-live="polite"
          className={
            hasTrend && !trendIncomplete
              ? "sr-only"
              : "mt-2 text-sm text-gray-500"
          }
        >
          {fundingTrend === null
            ? "Loading funding-source trend."
            : !hasTrend
              ? "No multi-year funding-source trend is available."
              : trendIncomplete
                ? "The trend is shown with one or more unavailable years."
                : "Funding-source trend is ready."}
        </p>
      </div>
    ),
    note: breakdownComplete
      ? undefined
      : `The published total and funding-source rows differ by ${formatBudget(Math.abs(breakdownDifference))}; the total is shown as published.`,
  };

  const notice: FinancialDetailPanelNotice | undefined = yearError
    ? {
        tone: "error",
        title: "Year unavailable",
        description: `${yearError} Showing ${displayed.year} instead.`,
      }
    : undefined;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-200 ${visible && !closing ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`h-full w-full bg-white shadow-2xl transition-transform duration-200 sm:w-[32rem] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <FinancialDetailPanel
          title={
            displayed.entity.code === "STA"
              ? "Staff Assessment"
              : displayed.entity.code
          }
          titleId={titleId}
          controls={
            <SidebarControls
              shareHash={`secretariat-entity=${encodeURIComponent(displayed.entity.code)}`}
              onClose={close}
              closeLabel="Close entity details"
            />
          }
          total={{
            label: "Total expenses",
            value: formatBudget(displayed.entity.total),
            details:
              selectedPriority && selectedAmount !== null ? (
                <>
                  {formatBudget(selectedAmount)} (
                  {displayed.entity.total > 0
                    ? ((selectedAmount / displayed.entity.total) * 100).toFixed(
                        1,
                      )
                    : "0.0"}
                  %) was spent on {selectedPriority}.
                </>
              ) : undefined,
          }}
          yearSelectorPlacement="header"
          yearSelector={{
            years: [...years].sort((a, b) => b - a),
            selected: displayed.year,
            label: "Select year",
            onChange: (nextYear) => {
              if (nextYear !== displayed.year) {
                setYearError(null);
                setRequestedYear(nextYear);
              }
            },
            pending: requestedYear !== null,
            pendingLabel:
              requestedYear === null ? undefined : `Loading ${requestedYear}…`,
          }}
          fundingBreakdown={fundingBreakdown}
          busy={requestedYear !== null}
          statusMessage={
            requestedYear === null
              ? undefined
              : `Loading ${requestedYear} data. Showing ${displayed.year} until it is ready.`
          }
          notice={notice}
          className="bg-white sm:w-full"
        >
          <FinancialPanelSection heading="Priority areas">
            <div className="space-y-3">
              {priorities.map(([label, amount]) => (
                <FinancialPanelRankedRow
                  key={label}
                  label={label}
                  labelClassName="w-1/2"
                  value={formatBudget(amount)}
                >
                  <FinancialPanelBar
                    percent={
                      maxPriorityAmount > 0
                        ? (amount / maxPriorityAmount) * 100
                        : 0
                    }
                    color={priorityAreaColor(label)}
                  />
                </FinancialPanelRankedRow>
              ))}
            </div>
          </FinancialPanelSection>
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
