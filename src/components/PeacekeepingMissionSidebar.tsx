"use client";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";
import { FinancialBreakdownRow } from "@un-eosg/ui/components/financial-breakdown-row";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { SidebarControls } from "@/components/SidebarControls";
import { FiscalYearSelector } from "@/components/FiscalYearSelector";
import {
  SidebarStackedTrend,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/SidebarStackedTrend";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { useContributorSidebarYear } from "@/hooks/useContributorSidebarYear";
import {
  COST_CLASS_BAND_COLORS,
  COST_CLASS_KEYS,
  COST_CLASS_LABELS,
  COST_CLASS_SHORT,
  fiscalYearLabel,
  type CostClassKey,
} from "@/lib/budgetGroupings";
import { collectBudgetNodeSources } from "@/lib/budgetSourceCollection";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";
import type { BudgetData, BudgetNodeSource } from "@/types";

import {
  PEACEKEEPING_METRICS,
  peacekeepingSidebarHash,
  type PeacekeepingMetric,
} from "@/lib/peacekeepingBudget";

const COST_CLASS_TREND_SERIES: FinancingSeries[] = COST_CLASS_KEYS.map(
  (key) => ({
    key,
    label: COST_CLASS_SHORT[key] ?? COST_CLASS_LABELS[key] ?? key,
    color: COST_CLASS_BAND_COLORS[key]?.bg ?? "#6b7280",
  }),
);
const ADDITIONAL_AUTHORITY: FinancingSeries = {
  key: "commitment_authority",
  label: "Additional commitment authority",
  color: "#6b7280",
};

interface CostItem {
  references?: BudgetNodeSource[];
  label: string;
  amount: number;
}

export interface PeacekeepingMissionSidebarProps {
  metric: PeacekeepingMetric;
  code: string;
  name: string;
  locationLabel: string | null;
  fiscalYear: string;
  total: number | null;
  classes: Record<CostClassKey, number | null> | null;
  classReferences?: Partial<Record<CostClassKey, BudgetNodeSource[]>>;
  items: Record<CostClassKey, CostItem[]> | null;
  source?: BudgetNodeSource;
  references?: BudgetNodeSource[];
  onClose: () => void;
}

function missionTrendYear(data: BudgetData | null, code: string, year: number) {
  const account = data?.peacekeepingSupplement?.accounts.find(
    (row) => row.code === code,
  );
  const nodes = data?.nodes.filter((node) => node.mission === code) ?? [];
  const hasTotal = !!account || nodes.some((node) => node.tier === "mission");
  const point: FinancingInstrumentDataPoint = { year: fiscalYearLabel(year) };
  const sources: Record<string, BudgetNodeSource[]> = {};
  for (const key of COST_CLASS_KEYS) {
    const supplement = account?.breakdown.find(
      (row) => row.label === COST_CLASS_LABELS[key],
    );
    const node = nodes.find(
      (item) => item.tier === "class" && item.costClass === key,
    );
    point[key] = account
      ? (supplement?.amount ?? null)
      : (node?.amount ?? null);
    sources[key] = account
      ? supplement
        ? [supplement.source]
        : []
      : node
        ? collectBudgetNodeSources(node)
        : [];
  }
  const authority = account?.breakdown.find(
    (row) => row.label === ADDITIONAL_AUTHORITY.label,
  );
  point[ADDITIONAL_AUTHORITY.key] = authority?.amount ?? (hasTotal ? 0 : null);
  sources[ADDITIONAL_AUTHORITY.key] = authority ? [authority.source] : [];
  return { point, sources };
}

function CostClassBreakdownRow({
  metricLabel,
  label,
  amount,
  lines,
  maximum,
  color,
  references,
}: {
  metricLabel: string;
  references: BudgetNodeSource[];
  label: string;
  amount: number | null;
  lines: CostItem[];
  maximum: number;
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const bar = (value: number | null) => (
    <span
      aria-hidden="true"
      className="relative h-1.5 overflow-hidden rounded-sm bg-gray-100"
    >
      <span
        className="absolute inset-y-0 start-0 rounded-sm bg-un-blue"
        style={{
          backgroundColor: color,
          width: `${maximum > 0 ? Math.min(100, (Math.max(0, value ?? 0) / maximum) * 100) : 0}%`,
        }}
      />
    </span>
  );
  const tooltip = (
    title: string,
    value: number | null,
    kind: string,
    sources: BudgetNodeSource[],
  ) => (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{kind}</p>
      <p className="text-sm font-medium">{title}</p>
      <p>
        {metricLabel}: {value === null ? "Unavailable" : formatBudget(value)}
      </p>
      <SourceReferenceLinks references={sources} />
    </div>
  );
  return (
    <FinancialBreakdownRow
      interactiveTooltip
      label={label}
      value={amount === null ? "—" : formatBudget(amount)}
      bar={bar(amount)}
      tooltip={tooltip(label, amount, "Budget group", references)}
      expanded={expanded}
      onToggle={lines.length ? () => setExpanded(!expanded) : undefined}
    >
      <ul className="mt-1 space-y-1">
        {lines.map((line, index) => (
          <FinancialBreakdownRow
            interactiveTooltip
            key={`${line.label}-${index}`}
            label={line.label}
            value={formatBudget(line.amount)}
            bar={bar(line.amount)}
            tooltip={tooltip(
              line.label,
              line.amount,
              `Class · ${label}`,
              line.references ?? [],
            )}
            depth={1}
          />
        ))}
      </ul>
    </FinancialBreakdownRow>
  );
}

export function PeacekeepingMissionSidebar({
  metric,
  code,
  name,
  locationLabel,
  fiscalYear: initialFiscalYear,
  total: initialTotal,
  classes: initialClasses,
  classReferences: initialClassReferences,
  items: initialItems,
  source: initialSource,
  references: initialReferences,
  onClose,
}: PeacekeepingMissionSidebarProps) {
  const ranges = useYearRanges();
  const years = (
    metric === "approved"
      ? ranges.budgetPkoApproved
      : metric === "proposed"
        ? ranges.budgetPkoProposed
        : ranges.budgetPko
  ).years;
  const metricLabel = PEACEKEEPING_METRICS[metric];
  const selection = useContributorSidebarYear<BudgetData>(
    `budget-pko-${metric}`,
    Number.parseInt(initialFiscalYear, 10),
  );
  const missionNodes =
    selection.data?.nodes.filter((node) => node.mission === code) ?? [];
  const mission = selection.data?.nodes.find(
    (node) =>
      node.tier === "mission" &&
      (node.code === code || node.mission === code) &&
      node.costClass === "total",
  );
  const account = selection.data?.peacekeepingSupplement?.accounts.find(
    (row) => row.code === code,
  );
  const ready =
    !selection.loading &&
    !selection.error &&
    (selection.isInitialYear || !!mission || !!account);
  const fiscalYear = selection.isInitialYear
    ? initialFiscalYear
    : (selection.data?.meta.fiscalYear ?? fiscalYearLabel(selection.year));
  const total = ready
    ? selection.isInitialYear
      ? initialTotal
      : (account?.amount ?? mission?.amount ?? null)
    : null;
  const classes = selection.isInitialYear
    ? initialClasses
    : (Object.fromEntries(
        COST_CLASS_KEYS.map((key) => [
          key,
          missionNodes.find(
            (node) => node.tier === "class" && node.costClass === key,
          )?.amount ?? null,
        ]),
      ) as Record<CostClassKey, number | null>);
  const classReferences = selection.isInitialYear
    ? initialClassReferences
    : (Object.fromEntries(
        COST_CLASS_KEYS.map((key) => [
          key,
          missionNodes
            .filter((node) => node.tier === "class" && node.costClass === key)
            .flatMap((node) => collectBudgetNodeSources(node)),
        ]),
      ) as Partial<Record<CostClassKey, BudgetNodeSource[]>>);
  const items = selection.isInitialYear
    ? initialItems
    : (Object.fromEntries(
        COST_CLASS_KEYS.map((key) => [
          key,
          missionNodes
            .filter((node) => node.tier === "item" && node.costClass === key)
            .map((node) => ({
              label: node.label,
              amount: node.amount,
              references: collectBudgetNodeSources(node),
            }))
            .sort(
              (a, b) => b.amount - a.amount || a.label.localeCompare(b.label),
            ),
        ]),
      ) as Record<CostClassKey, CostItem[]>);
  const source = selection.isInitialYear
    ? initialSource
    : (account?.source ?? mission?.source);
  const references = selection.isInitialYear
    ? initialReferences
    : account
      ? [account.source, ...account.breakdown.map((row) => row.source)]
      : missionNodes.flatMap((node) => collectBudgetNodeSources(node));
  const [trendSources, setTrendSources] = useState<
    Record<string, Record<string, BudgetNodeSource[]>>
  >({});
  const [trend, setTrend] = useState<FinancingInstrumentDataPoint[] | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((trendYear) =>
        loadYearData<BudgetData>(`budget-pko-${metric}`, trendYear)
          .then((data) => ({ year: trendYear, data }))
          .catch(() => ({ year: trendYear, data: null })),
      ),
    ).then((rows) => {
      if (!active) return;
      const trendYears = rows.map(({ year, data }) =>
        missionTrendYear(data, code, year),
      );
      setTrendSources(
        Object.fromEntries(
          trendYears.map(({ point, sources }) => [point.year, sources]),
        ),
      );
      setTrend(trendYears.map(({ point }) => point));
    });
    return () => {
      active = false;
    };
  }, [code, years, metric]);

  const classRows = COST_CLASS_KEYS.map((key) => {
    const amount = classes?.[key] ?? null;
    const lines = items?.[key] ?? [];
    return { key, amount, lines };
  });
  const hasAdditionalAuthority = trend?.some(
    (point) => Number(point[ADDITIONAL_AUTHORITY.key]) > 0,
  );
  const trendSeries = hasAdditionalAuthority
    ? [...COST_CLASS_TREND_SERIES, ADDITIONAL_AUTHORITY]
    : COST_CLASS_TREND_SERIES;
  const titleId = "peacekeeping-mission-sidebar-title";

  return (
    <DetailDrawer titleId={titleId} onClose={onClose} className="sm:w-[32rem]">
      <FinancialDetailPanel
        title={<DrawerTitle>{code}</DrawerTitle>}
        titleId={titleId}
        busy={selection.loading}
        subtitle={
          <>
            {name}
            <br />
            {locationLabel ? `${locationLabel} · ` : ""}
            {fiscalYear}
          </>
        }
        controls={
          <>
            <FiscalYearSelector
              years={years}
              selected={selection.year}
              onChange={selection.setYear}
              label="Select fiscal year"
              pending={selection.loading}
              pendingLabel="Loading…"
            />
            <SidebarControls
              shareHash={peacekeepingSidebarHash(code, metric, selection.year)}
              onClose={onClose}
              closeLabel="Close mission details"
            />
          </>
        }
        total={
          total !== null
            ? {
                label: metricLabel,
                value: (
                  <Tooltip
                    interactive
                    width={380}
                    content={
                      <SourceReferenceLinks
                        references={
                          references?.length
                            ? references
                            : source
                              ? [source]
                              : []
                        }
                      />
                    }
                  >
                    <span tabIndex={0}>{formatBudget(total)}</span>
                  </Tooltip>
                ),
              }
            : undefined
        }
        notice={
          !ready || total === null
            ? {
                tone: selection.error ? "error" : "empty",
                description:
                  selection.error ??
                  (selection.loading
                    ? "Loading mission details…"
                    : `No published ${metricLabel.toLowerCase()} for ${fiscalYear}.`),
              }
            : undefined
        }
        className="bg-white sm:w-full"
      >
        {ready && (
          <>
            {account && account.breakdown.length > 0 && (
              <FinancialPanelSection heading="Cost breakdown">
                <ul className="mt-3 space-y-1">
                  {account.breakdown.map((row) => (
                    <CostClassBreakdownRow
                      key={row.label}
                      metricLabel={metricLabel}
                      label={row.label}
                      amount={row.amount}
                      lines={[]}
                      references={[row.source]}
                      color="var(--color-un-blue)"
                      maximum={account.amount}
                    />
                  ))}
                </ul>
              </FinancialPanelSection>
            )}
            {!account && classRows.length > 0 && (
              <FinancialPanelSection
                heading={`${metricLabel} by budget group and class`}
              >
                <ul className="mt-3 space-y-1">
                  {classRows.map(({ key, amount, lines }) => (
                    <CostClassBreakdownRow
                      metricLabel={metricLabel}
                      key={`${code}-${fiscalYear}-${key}`}
                      label={COST_CLASS_LABELS[key] ?? key}
                      amount={amount}
                      references={classReferences?.[key] ?? []}
                      color={
                        COST_CLASS_BAND_COLORS[key]?.bg ??
                        "var(--color-un-blue)"
                      }
                      lines={lines}
                      maximum={Math.max(
                        0,
                        ...classRows.flatMap((row) => [
                          row.amount ?? 0,
                          ...row.lines.map((line) => line.amount),
                        ]),
                      )}
                    />
                  ))}
                </ul>
              </FinancialPanelSection>
            )}
            <div className="mt-4">
              <SidebarStackedTrend
                accessibleTableLabel={`${metricLabel} by budget group`}
                tooltipSources={(year, visibleKeys) =>
                  visibleKeys.flatMap((key) => trendSources[year]?.[key] ?? [])
                }
                showLegend={Boolean(hasAdditionalAuthority)}
                data={trend}
                series={trendSeries}
              />
            </div>

            {Boolean(references?.length || (source?.url && source.symbol)) && (
              <details
                key={`${code}-${fiscalYear}`}
                className="group/sources mt-4"
              >
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                  <FinancialPanelHeading subheading>
                    Source references
                  </FinancialPanelHeading>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3 transition-transform group-open/sources:rotate-90"
                  />
                </summary>
                <div className="mt-3">
                  <SourceReferenceList
                    references={
                      references?.length
                        ? references
                        : source
                          ? [
                              {
                                ...source,
                                budgetItem: name,
                                label: metricLabel,
                              },
                            ]
                          : []
                    }
                  />
                </div>
              </details>
            )}
          </>
        )}
      </FinancialDetailPanel>
    </DetailDrawer>
  );
}
