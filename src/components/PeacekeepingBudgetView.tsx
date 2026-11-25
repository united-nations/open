"use client";
import { MapBoundaryDisclaimer } from "@/components/MapBoundaryDisclaimer";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { missionLocationLabel } from "@/lib/missionLocations";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { RankedDetailList } from "@/components/RankedDetailList";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FinancialBubbleMap,
  MapBubbleLegendCircle,
  mapBubbleLegendClassName,
} from "@/components/FinancialBubbleMap";
import { bubbleRadiusInput } from "@/lib/map-bubbles";
import { PeacekeepingMissionSidebar } from "@/components/PeacekeepingMissionSidebar";
import { PeacekeepingAccountSidebar } from "@/components/PeacekeepingAccountSidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { loadStaticData, loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { collectBudgetNodeSources } from "@/lib/budgetSourceCollection";
import {
  COST_CLASS_KEYS,
  COST_CLASS_SHORT,
  fiscalYearLabel,
  type CostClassKey,
} from "@/lib/budgetGroupings";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  BudgetData,
  BudgetNode,
  BudgetNodeSource,
  PeacekeepingBudgetAccount,
  SecretariatEntitiesData,
  SecretariatMissionLocation,
} from "@/types";

import {
  PEACEKEEPING_METRICS,
  PEACEKEEPING_SIDEBAR_HASH,
  parsePeacekeepingSidebarValue,
  peacekeepingSidebarValue,
  type PeacekeepingMetric,
} from "@/lib/peacekeepingBudget";

type PointKind = PeacekeepingBudgetAccount["category"];

const KIND_LABEL: Record<PointKind, string> = {
  pko: "Peacekeeping missions",
  support_office: "Support offices",
  support: "Service centres",
  support_account: "Peacekeeping support account",
};
const KIND_COLOR: Record<PointKind, string> = {
  pko: "#009edb",
  support_office: "var(--color-un-purple)",
  support: "#a0665c",
  support_account: "#287b69",
};
const GEOGRAPHIC_KINDS = ["pko", "support_office", "support"] as const;
const SUPPORT_ACCOUNT_CODE = "PK-SUPPORT";

const MAX_MISSION_RADIUS_PX = 28;
const DOLLARS_PER_RADIUS_PIXEL_SQUARED = 1_500_000;

function proportionalAreaRadiusInput(amount: number) {
  return bubbleRadiusInput(
    amount,
    DOLLARS_PER_RADIUS_PIXEL_SQUARED * MAX_MISSION_RADIUS_PX ** 2,
    MAX_MISSION_RADIUS_PX,
  );
}

function resolveLocation(
  code: string,
  entities: SecretariatEntitiesData,
): SecretariatMissionLocation | undefined {
  const byCode = new Map(
    entities.locations.map((location) => [location.code, location]),
  );
  if (byCode.has(code)) return byCode.get(code);
  const aliased = entities.aliases[code];
  if (aliased && byCode.has(aliased)) return byCode.get(aliased);
  return undefined;
}

function pointKind(
  code: string,
  location: SecretariatMissionLocation | undefined,
): PointKind {
  if (location?.budgetCategory === "field_mission") return "pko";
  if (location?.budgetCategory === "support_center") return "support";
  if (location?.budgetCategory === "support_office" || code === "UNSOS")
    return "support_office";
  if (location?.kind === "support") return "support";
  if (code === "RSCE" || code === "UNGSC" || code === "UNLB") {
    return "support";
  }
  return "pko";
}

interface CostItem {
  references: BudgetNodeSource[];
  label: string;
  amount: number;
}

interface MissionRow {
  metricLabel: string;
  references: BudgetNodeSource[];
  classReferences: Record<CostClassKey, BudgetNodeSource[]>;
  code: string;
  name: string;
  location: SecretariatMissionLocation | undefined;
  kind: PointKind;
  total: number;
  classes: Record<CostClassKey, number | null>;
  items: Record<CostClassKey, CostItem[]>;
  source: BudgetNode["source"];
  account?: PeacekeepingBudgetAccount;
}

interface MissionCostClassLeaf {
  mission: MissionRow;
}

function buildRows(data: BudgetData, entities: SecretariatEntitiesData) {
  const metricLabel =
    data.meta.measure === "appropriation"
      ? "Approved budget"
      : data.meta.measure === "proposed"
        ? "Proposed budget"
        : "Expenditure";
  const accounts = data.peacekeepingSupplement?.accounts ?? [];
  const supplementalCodes = new Set(accounts.map(({ code }) => code));
  const missions = data.nodes.filter(
    (node) =>
      node.tier === "mission" &&
      node.costClass === "total" &&
      !supplementalCodes.has(node.code ?? node.mission ?? node.id),
  );
  const classNodes = data.nodes.filter((node) => node.tier === "class");
  const itemNodes = data.nodes.filter((node) => node.tier === "item");
  const rows: MissionRow[] = missions.map((mission) => {
    const code = mission.code ?? mission.mission ?? mission.id;
    const location = resolveLocation(code, entities);
    const classes = Object.fromEntries(
      COST_CLASS_KEYS.map((key) => {
        const match = classNodes.find(
          (node) => node.mission === code && node.costClass === key,
        );
        return [key, match ? match.amount : null];
      }),
    ) as Record<CostClassKey, number | null>;
    const classReferences = Object.fromEntries(
      COST_CLASS_KEYS.map((key) => [
        key,
        classNodes
          .filter((node) => node.mission === code && node.costClass === key)
          .flatMap((node) => collectBudgetNodeSources(node)),
      ]),
    ) as Record<CostClassKey, BudgetNodeSource[]>;
    const items = Object.fromEntries(
      COST_CLASS_KEYS.map((key) => {
        const lines = itemNodes
          .filter((node) => node.mission === code && node.costClass === key)
          .map((node) => ({
            label: node.label,
            amount: node.amount,
            references: collectBudgetNodeSources(node),
          }))
          .sort(
            (a, b) => b.amount - a.amount || a.label.localeCompare(b.label),
          );
        return [key, lines];
      }),
    ) as Record<CostClassKey, CostItem[]>;
    return {
      code,
      metricLabel,
      references: collectBudgetNodeSources(mission),
      classReferences,
      name: mission.label,
      location,
      kind: pointKind(code, location),
      total: mission.amount,
      classes,
      items,
      source: mission.source,
    };
  });
  for (const account of accounts) {
    rows.push({
      code: account.code,
      name: account.label,
      metricLabel,
      kind: account.category,
      location: resolveLocation(account.code, entities),
      total: account.amount,
      source: account.source,
      references: [account.source],
      classReferences: {
        military_police_personnel: [],
        civilian_personnel: [],
        operational_costs: [],
      },
      classes: {
        military_police_personnel: null,
        civilian_personnel: null,
        operational_costs: null,
      },
      items: {
        military_police_personnel: [],
        civilian_personnel: [],
        operational_costs: [],
      },
      account,
    });
  }
  rows.sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  return rows;
}

interface MapPoint {
  lat: number;
  long: number;
  radius: number;
  color: PointKind;
  label: string;
  data: MissionRow;
}

function MissionTooltip({ mission }: { mission: MissionRow }) {
  const color = KIND_COLOR[mission.kind];
  const account = mission.account;
  return (
    <FinancialTooltip
      title={mission.name}
      parents={
        mission.kind === "support_account"
          ? []
          : [
              { label: KIND_LABEL[mission.kind], color },
              { label: mission.code },
            ]
      }
      context={account?.note ?? missionLocationLabel(mission.location)}
      total={{ label: mission.metricLabel, value: formatBudget(mission.total) }}
      rows={
        account
          ? account.breakdown.map(({ label, amount }) => ({
              label,
              value: formatBudget(amount),
              color,
            }))
          : COST_CLASS_KEYS.map((key) => ({
              label: COST_CLASS_SHORT[key] ?? key,
              value:
                mission.classes[key] === null
                  ? "Not published"
                  : formatBudget(mission.classes[key]!),
              color,
              share:
                mission.classes[key] !== null &&
                mission.classes[key]! >= 0 &&
                mission.total > 0
                  ? mission.classes[key]! / mission.total
                  : undefined,
            }))
      }
      notes={
        <SourceReferenceLinks
          references={[
            ...mission.references,
            ...Object.values(mission.classReferences).flat(),
          ]}
        />
      }
      actionHint="Click to explore details"
    />
  );
}

function MissionCostClassTreemap({
  rows,
  onOpen,
}: {
  rows: MissionRow[];
  onOpen: (code: string) => void;
}) {
  const treemapRows = rows.flatMap((mission) => {
    if (mission.total <= 0) return [];
    const color = KIND_COLOR[mission.kind];
    const groups =
      mission.account?.breakdown.map(({ label, amount }) => ({
        label,
        amount,
        key: label,
      })) ??
      COST_CLASS_KEYS.flatMap((costClass) => {
        const amount = mission.classes[costClass];
        return amount === null
          ? []
          : [
              {
                key: costClass,
                label: COST_CLASS_SHORT[costClass] ?? costClass,
                amount,
              },
            ];
      });
    const leaves = groups
      .filter(({ amount }) => amount > 0)
      .map(({ key, label, amount }) => ({
        key,
        label,
        value: amount,
        color,
        data: { mission },
        onActivate: () => onOpen(mission.code),
      }));
    if (leaves.length === 0) {
      leaves.push({
        key: "total",
        label: mission.name,
        value: mission.total,
        color,
        data: { mission },
        onActivate: () => onOpen(mission.code),
      });
    }
    return [
      {
        key: mission.code,
        label:
          mission.kind === "support_account" ? "Support account" : mission.code,
        value: mission.total,
        color,
        data: mission,
        leaves,
      } satisfies GroupedTreemapRow<
        MissionRow,
        never,
        MissionCostClassLeaf,
        never
      >,
    ];
  });

  return (
    <div>
      <GroupedTreemap<MissionRow, never, MissionCostClassLeaf, never>
        hideHeader
        hideList
        rows={treemapRows}
        totalLabel="Total"
        plotClassName="h-[34rem] sm:h-[42rem] lg:h-[48rem]"
        formatValue={(value) => formatBudget(value)}
        formatAccessibleValue={(value) => formatBudget(value)}
        showLeafValues
        renderTooltip={(context) => (
          <MissionTooltip mission={context.row.data!} />
        )}
      />
    </div>
  );
}

export function PeacekeepingBudgetView() {
  const ranges = useYearRanges();
  const [selectedMetric, setMetric] =
    useState<PeacekeepingMetric>("expenditure");
  const [selectedYear, setYear] = useState(ranges.budgetPko.default);
  const [openedCode, setSelectedCode] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: PEACEKEEPING_SIDEBAR_HASH,
    transform: parsePeacekeepingSidebarValue,
    onNavigateAway: () => setSelectedCode(null),
  });
  const metricYears = {
    expenditure: ranges.budgetPko,
    approved: ranges.budgetPkoApproved,
    proposed: ranges.budgetPkoProposed,
  };
  const linkedLens =
    pending?.lens &&
    metricYears[pending.lens.metric].years.includes(pending.lens.year)
      ? pending.lens
      : null;
  const metric = linkedLens?.metric ?? selectedMetric;
  const year = linkedLens?.year ?? selectedYear;
  const allYears = [
    ...new Set(Object.values(metricYears).flatMap((range) => range.years)),
  ].sort((a, b) => a - b);
  const budgetCache = useRef(new Map<string, BudgetData>());
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [entities, setEntities] = useState<SecretariatEntitiesData | null>(
    null,
  );
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const requestKey = `${metric}-${year}`;
  const error =
    failure?.key === requestKey || failure?.key === "locations"
      ? failure.message
      : null;
  const [view, setView] = useState("map");
  const showMap = view === "map";
  const [query, setQuery] = useState("");
  const [hiddenKinds, setHiddenKinds] = useState<PointKind[]>([]);
  const [mapTooltip, setMapTooltip] = useState<{
    mission: MissionRow;
    x: number;
    y: number;
  } | null>(null);
  const changeMetric = (next: PeacekeepingMetric) => {
    if (!metricYears[next].years.includes(year)) return;
    setMetric(next);
    setMapTooltip(null);
  };
  const changeYear = (next: number) => {
    setYear(next);
    if (!metricYears[metric].years.includes(next)) {
      setMetric(
        metricYears.expenditure.years.includes(next)
          ? "expenditure"
          : metricYears.approved.years.includes(next)
            ? "approved"
            : "proposed",
      );
    }
    setMapTooltip(null);
  };
  const mapPointer = useRef({ x: 0, y: 0 });
  const tooltipCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepMapTooltip = () => {
    if (tooltipCloseTimer.current) clearTimeout(tooltipCloseTimer.current);
  };
  const closeMapTooltipSoon = () => {
    keepMapTooltip();
    tooltipCloseTimer.current = setTimeout(() => setMapTooltip(null), 180);
  };
  useEffect(() => {
    return () => {
      if (tooltipCloseTimer.current) clearTimeout(tooltipCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadStaticData<SecretariatEntitiesData>("secretariat-entities.json")
      .then((data) => {
        if (active) setEntities(data);
      })
      .catch(() => {
        if (active)
          setFailure({
            key: "locations",
            message: "Failed to load mission locations.",
          });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const cached = budgetCache.current.get(requestKey);
    (cached
      ? Promise.resolve(cached)
      : loadYearData<BudgetData>(`budget-pko-${metric}`, year)
    )
      .then((data) => {
        budgetCache.current.set(requestKey, data);
        if (active) {
          setFailure(null);
          setBudget(data);
        }
      })
      .catch(() => {
        if (active)
          setFailure({
            key: requestKey,
            message: `Failed to load ${PEACEKEEPING_METRICS[metric].toLowerCase()} for ${fiscalYearLabel(year)}.`,
          });
      });
    return () => {
      active = false;
    };
  }, [year, metric, requestKey]);

  const waitingForData =
    budget?.meta.year !== year ||
    budget?.meta.measure !== (metric === "approved" ? "appropriation" : metric);
  // Keep the loaded measure attached to its data until the replacement arrives.
  const current = error ? null : budget;
  const displayedMetric =
    current?.meta.measure === "appropriation"
      ? "approved"
      : current?.meta.measure === "proposed"
        ? "proposed"
        : "expenditure";
  const metricLabel = PEACEKEEPING_METRICS[current ? displayedMetric : metric];
  const displayedYear = current?.meta.year ?? year;
  const openMission = useCallback(
    (code: string) => {
      setMapTooltip(null);
      setPending(null);
      setSelectedCode(code);
      replaceToSidebar(
        PEACEKEEPING_SIDEBAR_HASH,
        peacekeepingSidebarValue(code, displayedMetric, displayedYear),
      );
    },
    [setPending, displayedMetric, displayedYear],
  );
  const closeSidebar = () => {
    setMetric(metric);
    setYear(year);
    setPending(null);
    setSelectedCode(null);
    clearSidebarHash();
  };
  const rows = useMemo(() => {
    if (!current || !entities) return [];
    return buildRows(current, entities);
  }, [current, entities]);

  const selectedCode =
    linkedLens && waitingForData ? null : (pending?.code ?? openedCode);

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          !hiddenKinds.includes(row.kind) &&
          `${row.code} ${row.name}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [rows, hiddenKinds, query],
  );
  const missionFilters = (
    [...GEOGRAPHIC_KINDS, "support_account"] as const
  ).map((kind) => (
    <LegendLabel
      key={kind}
      label={KIND_LABEL[kind]}
      color={KIND_COLOR[kind]}
      selected={!hiddenKinds.includes(kind)}
      onToggle={() => {
        setMapTooltip(null);
        setHiddenKinds((current) =>
          current.includes(kind)
            ? current.filter((item) => item !== kind)
            : [...current, kind],
        );
      }}
    />
  ));

  const points = useMemo<MapPoint[]>(() => {
    return visibleRows
      .filter((row) => row.location)
      .map((row) => ({
        lat: row.location!.lat,
        long: row.location!.long,
        radius: proportionalAreaRadiusInput(row.total),
        color: row.kind,
        label: row.code,
        data: row,
      }));
  }, [visibleRows]);

  if (!entities) {
    return (
      <div className="flex h-[36rem] items-center justify-center bg-gray-50 text-gray-500">
        {error ?? "Loading peacekeeping budget…"}
      </div>
    );
  }

  const selectedRow = rows.find((row) => row.code === selectedCode);
  const supportAccount = visibleRows.find(
    (row) => row.kind === "support_account",
  );
  const visibleTotal = visibleRows.reduce((sum, row) => sum + row.total, 0);
  const inKind = current?.peacekeepingSupplement?.inKind;
  const selectedLocation =
    selectedCode && entities
      ? resolveLocation(selectedCode, entities)
      : undefined;

  return (
    <div className="relative flex w-full flex-col">
      <ChartFrame
        header={
          <div className="space-y-4">
            <div
              className="flex flex-wrap items-center gap-3"
              data-testid="peacekeeping-primary-controls"
            >
              <SegmentedControl
                label="Budget metric"
                value={metric}
                onValueChange={(value) => {
                  if (
                    value === "proposed" ||
                    value === "approved" ||
                    value === "expenditure"
                  )
                    changeMetric(value);
                }}
                options={(
                  [
                    {
                      value: "proposed",
                      label: "Proposed",
                      description:
                        "Proposed resources for the selected July–June financial year.",
                    },
                    {
                      value: "approved",
                      label: "Approved",
                      description:
                        "Approved appropriations printed in the mission budget reports.",
                    },
                    {
                      value: "expenditure",
                      label: "Expenditure",
                      description:
                        "Actual expenditure for the selected July–June financial year.",
                    },
                  ] as const
                ).map((option) => ({
                  ...option,
                  disabled: !metricYears[option.value].years.includes(year),
                  description: metricYears[option.value].years.includes(year)
                    ? option.description
                    : `${option.label} data is not available for ${fiscalYearLabel(year)}.`,
                }))}
              />
              <div
                role="group"
                aria-label="Peacekeeping budget categories"
                className="flex flex-wrap gap-2"
              >
                {missionFilters}
              </div>
            </div>
            <ChartHeader
              controls={
                <SegmentedControl
                  label="Peacekeeping view"
                  options={[
                    { value: "treemap", label: "Chart" },
                    { value: "map", label: "Map" },
                    { value: "list", label: "List" },
                  ]}
                  value={view}
                  onValueChange={(value) => {
                    setView(value);
                    setMapTooltip(null);
                  }}
                />
              }
              yearControl={
                <YearSlider
                  years={allYears}
                  selectedYear={year}
                  onChange={changeYear}
                  formatLabel={fiscalYearLabel}
                />
              }
              search={
                <ChartSearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search peacekeeping budget..."
                  label="Search peacekeeping budget"
                />
              }
              summaries={[
                {
                  key: "total",
                  label:
                    waitingForData && current
                      ? `${metricLabel} · ${current.meta.fiscalYear}`
                      : query || hiddenKinds.length
                        ? `Matching ${metricLabel.toLowerCase()}`
                        : metricLabel,
                  value: current ? (
                    <Tooltip
                      interactive
                      width={380}
                      content={
                        <div className="space-y-2 text-start font-normal">
                          <p className="font-medium">
                            {metricLabel} · {current.meta.fiscalYear}
                          </p>
                          <p>
                            Sum of the peacekeeping accounts
                            {query || hiddenKinds.length
                              ? " matching the current filters"
                              : " in this view"}
                            . The source pages show the individual amounts.
                          </p>
                          {inKind && (
                            <p>
                              Voluntary contributions in kind are reported
                              separately ({formatBudget(inKind.amount)}).
                            </p>
                          )}
                          <SourceReferenceLinks
                            references={[
                              ...visibleRows.flatMap((row) => row.references),
                              ...(inKind ? [inKind.source] : []),
                              ...(current.peacekeepingSupplement
                                ? [
                                    current.peacekeepingSupplement
                                      .publishedTotal.source,
                                    ...(
                                      current.peacekeepingSupplement
                                        .adjustments ?? []
                                    ).flatMap(({ previous, source }) => [
                                      previous,
                                      source,
                                    ]),
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      }
                    >
                      <span tabIndex={0}>{formatBudget(visibleTotal)}</span>
                    </Tooltip>
                  ) : (
                    "Unavailable"
                  ),
                },
              ]}
            />
          </div>
        }
      >
        <div className="relative" aria-busy={waitingForData && !error}>
          <DelayedChartLoading
            pending={waitingForData && !error}
            requestKey={requestKey}
          />
          {waitingForData && current && (
            <p
              role="status"
              className="absolute end-0 top-0 z-10 bg-white px-2 text-xs text-gray-600"
            >
              Loading {PEACEKEEPING_METRICS[metric].toLowerCase()}{" "}
              {fiscalYearLabel(year)}; showing {current.meta.fiscalYear} until
              ready…
            </p>
          )}
          {!current && (
            <p role="status" className="p-6">
              {error ?? "Loading peacekeeping budget…"}
            </p>
          )}
          {view === "treemap" && (
            <section className="order-1">
              <MissionCostClassTreemap
                rows={visibleRows}
                onOpen={openMission}
              />
            </section>
          )}
          {view === "list" && (
            <section className="order-1">
              <RankedDetailList
                label="Peacekeeping budget accounts"
                items={visibleRows.map((row) => ({
                  id: row.code,
                  label: row.name,
                  description: row.account?.note ?? row.code,
                  amount: row.total,
                  value: formatBudget(row.total),
                  group: { key: row.kind, label: KIND_LABEL[row.kind] },
                  color: KIND_COLOR[row.kind],
                  onOpen: () => openMission(row.code),
                }))}
              />
            </section>
          )}
          <section className="order-3" hidden={!showMap}>
            <div className="relative">
              <FinancialBubbleMap
                className="pko-dot-map relative border border-gray-200 bg-white"
                onPointerMoveCapture={(event) => {
                  mapPointer.current = { x: event.clientX, y: event.clientY };
                }}
                data={points}
                colorDomain={[...GEOGRAPHIC_KINDS]}
                colors={GEOGRAPHIC_KINDS.map((kind) => KIND_COLOR[kind])}
                radius={MAX_MISSION_RADIUS_PX}
                height={520}
                highlightedDataPoints={selectedCode ? [selectedCode] : []}
                onSeriesMouseClick={(point: MapPoint | undefined) => {
                  const code =
                    point?.data?.code ??
                    (typeof point?.label === "string"
                      ? point.label
                      : undefined);
                  if (code) openMission(code);
                }}
                ariaLabel={`Map of peacekeeping ${metricLabel.toLowerCase()} in ${current?.meta.fiscalYear}`}
                onSeriesMouseOver={(point: MapPoint | undefined) => {
                  if (!point) {
                    closeMapTooltipSoon();
                    return;
                  }
                  keepMapTooltip();
                  setMapTooltip({ mission: point.data, ...mapPointer.current });
                }}
              />
              {supportAccount && (
                <Tooltip
                  content={<MissionTooltip mission={supportAccount} />}
                  interactive
                  width={320}
                >
                  <button
                    type="button"
                    className={`${mapBubbleLegendClassName} flex min-h-11 items-center gap-2 focus-visible:outline-2 focus-visible:outline-un-blue`}
                    onClick={() => openMission(supportAccount.code)}
                  >
                    <MapBubbleLegendCircle
                      color={KIND_COLOR.support_account}
                      radius={Math.sqrt(
                        Math.max(0, supportAccount.total) /
                          DOLLARS_PER_RADIUS_PIXEL_SQUARED,
                      )}
                    />
                    Support account
                  </button>
                </Tooltip>
              )}
            </div>
            <div
              className="mt-3 max-w-2xl space-y-2 text-xs leading-relaxed text-gray-500"
              data-map-notes
            >
              <p>
                Geographic dots show representative locations. The support
                account marker represents shared support for peacekeeping
                operations.
              </p>
              <MapBoundaryDisclaimer />
            </div>
          </section>
        </div>
      </ChartFrame>

      {mapTooltip &&
        showMap &&
        !selectedCode &&
        createPortal(
          <div
            role="dialog"
            aria-label={`${mapTooltip.mission.code} expenditure and sources`}
            className="fixed z-[100] max-h-[min(32rem,80vh)] w-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-3 shadow-lg"
            style={{
              left: Math.max(
                8,
                Math.min(mapTooltip.x + 12, window.innerWidth - 328),
              ),
              top: Math.max(
                8,
                Math.min(mapTooltip.y + 12, window.innerHeight - 440),
              ),
            }}
            onMouseEnter={keepMapTooltip}
            onMouseLeave={closeMapTooltipSoon}
            onFocusCapture={keepMapTooltip}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                closeMapTooltipSoon();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setMapTooltip(null);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <MissionTooltip mission={mapTooltip.mission} />
          </div>,
          document.body,
        )}
      {selectedCode &&
        current &&
        (selectedRow?.account || selectedCode === SUPPORT_ACCOUNT_CODE ? (
          <PeacekeepingAccountSidebar
            key={`${selectedCode}-${displayedMetric}-${current.meta.fiscalYear}`}
            code={selectedCode}
            metric={displayedMetric}
            initialData={current}
            onClose={closeSidebar}
          />
        ) : (
          <div className="order-4">
            <PeacekeepingMissionSidebar
              key={`${selectedCode}-${displayedMetric}-${current.meta.fiscalYear}`}
              metric={displayedMetric}
              code={selectedCode}
              name={selectedRow?.name ?? selectedLocation?.name ?? selectedCode}
              locationLabel={
                missionLocationLabel(
                  selectedRow?.location ?? selectedLocation,
                ) ?? null
              }
              fiscalYear={current.meta.fiscalYear}
              total={selectedRow ? selectedRow.total : null}
              classes={selectedRow ? selectedRow.classes : null}
              items={selectedRow ? selectedRow.items : null}
              classReferences={selectedRow?.classReferences}
              source={selectedRow?.source}
              references={current.nodes
                .filter((node) => node.mission === selectedCode)
                .flatMap((node) => collectBudgetNodeSources(node))}
              onClose={closeSidebar}
            />
          </div>
        ))}
    </div>
  );
}
