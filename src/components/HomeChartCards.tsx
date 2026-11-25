import {
  assessmentsForDisplay,
  assessmentTotals,
  CEB_ASSESSMENT_COLORS,
} from "@/lib/cebAssessments";
import { CEB_ASSESSMENT_YEAR_RANGE } from "@/lib/useYearRanges";
import { UN_FUNCTIONS, type FunctionExpenses } from "@/lib/functions";
import {
  TRUST_FUND_CONTRIBUTOR_GROUP_STYLES,
  trustFundReportingData,
} from "@/lib/trustFundReporting";
import { FEATURES } from "@/lib/featureFlags";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LINK_DESCRIPTIONS } from "@/components/SectionLinkCards";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { SYSTEM_ASSESSMENTS_PATH } from "@/lib/navigation";
import {
  layoutGroups,
  squarifyDense,
  type Rect as TreemapBounds,
} from "@/lib/treemapLayout";
import { HOME_MAP_LAND_PATH, projectHomeMapPoint } from "@/lib/home-map";
import { getFinancingInstrumentColor } from "@/lib/financingInstruments";
import { FUNDING_SHADE_OPACITY } from "@/lib/budgetGroupings";
import { SDG_COLORS } from "@/lib/sdgs";
import {
  REGULAR_BUDGET_STATUS_ORDER,
  REGULAR_BUDGET_STATUS_STYLES,
} from "@/lib/regularBudgetContributors";
import { PEACEKEEPING_ASSESSMENT_COLOR } from "@/lib/peacekeepingBudget";
import { buildFieldMissionModel } from "@/lib/fieldMissions";
import {
  PALETTE,
  PART_BAND_COLORS,
  budgetPartStyles,
  priorityAreaColor,
  TRUST_FUND_SOURCE_COLORS,
} from "@/lib/secretariatGroupings";
import type {
  BudgetData,
  CebAssessmentsData,
  BudgetFundingSource,
  Entity,
  SecretariatEntitiesData,
  SecretariatOverviewData,
  RegularBudgetContributorsData,
  PeacekeepingContributorsData,
  TrustFundContributorsData,
} from "@/types";

type Tile = {
  label: string;
  value: number;
  color?: string;
  borderColor?: string;
  children?: Tile[];
  assessment?: {
    assessed: number;
    current: number;
    unknown: number;
  };
};
type Country = { lat: number; long: number; total: number };
type FundingYear = {
  year: number;
  assessed: number;
  voluntary_unearmarked: number;
  voluntary_earmarked: number;
  other: number;
};
const FUNDING_SERIES = [
  { key: "assessed", label: "Assessed" },
  { key: "voluntary_unearmarked", label: "Voluntary un-earmarked" },
  { key: "voluntary_earmarked", label: "Voluntary earmarked" },
  { key: "other", label: "Other" },
] as const;
type Trend = {
  years: { year: number; values: number[] }[];
  series: { label: string; color: string }[];
};
type Preview = {
  tiles?: Tile[];
  countries?: Country[];
  goals?: boolean;
  trend?: Trend;
  bands?:
    | "categories"
    | "programme"
    | "entities"
    | "trust-funds"
    | "payment-status"
    | "contributor-groups";
};
type Rect = Tile & TreemapBounds & { key?: string };

// Read the existing exports on the server so these navigation thumbnails add
// neither chart-library JavaScript nor multi-megabyte data fetches to the page.
// A static export freezes the previews alongside the rest of the site.
async function readData<T>(filename: string): Promise<T> {
  return JSON.parse(
    await readFile(path.join(process.cwd(), "public/data", filename), "utf8"),
  ) as T;
}

const loadPreviews = cache(async (): Promise<Record<string, Preview>> => {
  const manifest =
    await readData<Record<string, { default: number }>>("manifest.json");
  const year = (key: string) => manifest[key].default;
  const [
    entities,
    spending,
    contributorTrends,
    countries,
    overview,
    programme,
    peacekeeping,
    funds,
    missionMetadata,
    functions,
    assessments,
    regularContributors,
    peacekeepingContributors,
    trustFundContributors,
  ] = await Promise.all([
    readData<Entity[]>("entities.json"),
    readData<{ entity: string; amount: number }[]>(
      `entity-spending-${year("entitySpending")}.json`,
    ),
    readData<{ aggregates: { all: FundingYear[] } }>("contributor-trends.json"),
    readData<Country[]>(`country-expenses-${year("countryExpenses")}.json`),
    readData<SecretariatOverviewData>(
      `secretariat-overview-${year("secretariatOverview")}.json`,
    ),
    FEATURES.programmeBudget
      ? readData<BudgetData>(`budget-ppb-${year("budgetPpb")}.json`)
      : null,
    FEATURES.peacekeepingBudget
      ? readData<BudgetData>(`budget-pko-${year("budgetPko")}.json`)
      : null,
    FEATURES.trustFunds
      ? readData<BudgetData>(
          `budget-trust-funds-${year("budgetTrustFunds")}.json`,
        ).then((data) => trustFundReportingData(data))
      : null,
    FEATURES.peacekeepingBudget
      ? readData<SecretariatEntitiesData>("secretariat-entities.json")
      : null,
    readData<FunctionExpenses>("function-expenses.json"),
    readData<CebAssessmentsData>(
      `ceb-assessments-${CEB_ASSESSMENT_YEAR_RANGE.default}.json`,
    ).then(assessmentsForDisplay),
    FEATURES.programmeBudget
      ? readData<RegularBudgetContributorsData>(
          `regular-budget-contributors-${year("regularBudgetContributors")}.json`,
        )
      : null,
    FEATURES.peacekeepingBudget
      ? readData<PeacekeepingContributorsData>(
          `peacekeeping-contributors-${year("peacekeepingContributors")}.json`,
        )
      : null,
    FEATURES.trustFunds
      ? readData<TrustFundContributorsData>(
          `trust-fund-contributors-${year("trustFundContributors")}.json`,
        )
      : null,
  ]);
  const entityGroups = new Map(
    entities.map((entity) => [entity.entity, entity.system_grouping]),
  );
  const categories = new Map<string, number>();
  for (const row of spending) {
    const category = entityGroups.get(row.entity) ?? "Uncategorized";
    categories.set(category, (categories.get(category) ?? 0) + row.amount);
  }
  const budgetTiles = (
    data: BudgetData,
    tier: string,
    source?: BudgetFundingSource,
  ) =>
    data.nodes
      .filter((node) => node.tier === tier)
      .sort((a, b) =>
        tier === "part"
          ? (budgetPartStyles[a.code ?? ""]?.order ?? 999) -
            (budgetPartStyles[b.code ?? ""]?.order ?? 999)
          : b.amount - a.amount,
      )
      .map(
        (node, index): Tile => ({
          label: node.entity?.acronym ?? node.code ?? node.label,
          value: source ? (node.values?.[source] ?? 0) : node.amount,
          color:
            (tier === "part"
              ? PART_BAND_COLORS[node.code ?? ""]?.bg
              : undefined) ??
            `var(--color-${PALETTE[index % PALETTE.length].bgColor.slice(3)})`,
        }),
      );
  const priorities = new Map<string, number>();
  for (const entity of overview.entities) {
    for (const cell of entity.cells) {
      const priority = entity.split_across_priorities
        ? cell.priority_area
        : entity.primary_priority;
      priorities.set(priority, (priorities.get(priority) ?? 0) + cell.amount);
    }
  }
  const missionLocations = new Map(
    (missionMetadata?.locations ?? []).map((location) => [
      location.code,
      location,
    ]),
  );
  const peacekeepingPoints = (peacekeeping?.nodes ?? [])
    .filter((node) => node.tier === "mission")
    .flatMap((node): Country[] => {
      const code = node.code ?? node.id;
      const location = missionLocations.get(
        missionMetadata?.aliases[code] ?? code,
      );
      return location
        ? [{ lat: location.lat, long: location.long, total: node.amount }]
        : [];
    });
  const trustFundFlows = (trustFundContributors?.contributors ?? []).flatMap(
    (contributor) =>
      (contributor.flows ?? []).map((flow) => ({
        label: contributor.name,
        value: flow.amount_usd,
        group: flow.group,
      })),
  );
  return {
    "/system/organizations": {
      bands: "categories",
      tiles: [...categories].map(([category, value]) => ({
        label: getSystemGroupingStyle(category).label,
        value,
        color: getSystemGroupingStyle(category).hexColor,
        children: spending
          .filter(
            (row) =>
              (entityGroups.get(row.entity) ?? "Uncategorized") === category &&
              Number.isFinite(row.amount) &&
              row.amount > 0,
          )
          .map((row) => ({ label: row.entity, value: row.amount }))
          .sort((a, b) => b.value - a.value),
      })),
    },
    "/system/contributors": {
      trend: {
        years: [...contributorTrends.aggregates.all]
          .sort((a, b) => a.year - b.year)
          .map((row) => ({
            year: row.year,
            values: FUNDING_SERIES.map((series) => row[series.key]),
          })),
        series: FUNDING_SERIES.map((series) => ({
          label: series.label,
          color: getFinancingInstrumentColor(series.label),
        })),
      },
    },
    [SYSTEM_ASSESSMENTS_PATH]: {
      bands: "entities",
      tiles: assessmentPreviewTiles(assessments),
    },
    "/system/locations": { countries },
    "/system/functions": {
      trend: {
        years: functions.data
          .filter((row) => row.year >= functions.meta.classificationStartYear)
          .sort((a, b) => a.year - b.year)
          .map((row) => ({
            year: row.year,
            values: UN_FUNCTIONS.map((item) => row.functions[item.key] ?? 0),
          })),
        series: UN_FUNCTIONS.map((item) => ({
          label: item.label,
          color: item.color,
        })),
      },
    },
    "/system/goals": {
      goals: true,
    },
    "/secretariat": {
      bands: "categories",
      tiles: [...priorities].map(([priority, value]) => ({
        label: priority,
        value,
        color: priorityAreaColor(priority),
      })),
    },
    "/secretariat/programme-budget": {
      bands: "programme",
      tiles: programme ? budgetTiles(programme, "part", "regular_budget") : [],
    },
    "/secretariat/programme-budget/contributors": {
      bands: "payment-status",
      tiles: REGULAR_BUDGET_STATUS_ORDER.map((status) =>
        contributorBand(
          REGULAR_BUDGET_STATUS_STYLES[status],
          (regularContributors?.contributors ?? [])
            .filter((contributor) => contributor.payment_status === status)
            .map((contributor) => ({
              label: contributor.name,
              value: contributor.assessment_amount,
            })),
        ),
      ),
    },
    "/secretariat/peacekeeping-budget": {
      countries: peacekeepingPoints,
    },
    "/secretariat/peacekeeping-budget/contributors": {
      bands: "entities",
      tiles: (peacekeepingContributors?.contributors ?? [])
        .map((contributor) => ({
          label: contributor.name,
          value: contributor.net_assessment,
          color: PEACEKEEPING_ASSESSMENT_COLOR,
        }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    },
    "/secretariat/peacekeeping-budget/peace-operations": {
      countries: missionMetadata
        ? buildFieldMissionModel(overview, missionMetadata, [
            "pko",
            "spm",
          ]).locatedMissions.map(({ location, amount }) => ({
            lat: location.lat,
            long: location.long,
            total: amount,
          }))
        : [],
    },
    "/secretariat/trust-funds": {
      bands: "trust-funds",
      tiles: trustFundTiles(funds),
    },
    "/secretariat/trust-funds/contributors": {
      bands: "contributor-groups",
      tiles: Object.entries(TRUST_FUND_CONTRIBUTOR_GROUP_STYLES).map(
        ([group, style]) =>
          contributorBand(
            style,
            trustFundFlows.filter((flow) => flow.group === group),
          ),
      ),
    },
  };
});

function contributorBand(
  style: { label: string; color: string; borderColor?: string },
  tiles: Pick<Tile, "label" | "value">[],
): Tile {
  const children = tiles
    .filter((tile) => Number.isFinite(tile.value) && tile.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .map(({ label, value }) => ({
      label,
      value,
      color: style.color,
      borderColor: style.borderColor,
    }));
  return {
    label: style.label,
    value: children.reduce((sum, tile) => sum + tile.value, 0),
    children,
  };
}

function assessmentPreviewTiles(data: CebAssessmentsData): Tile[] {
  const tiles = data.contributors
    .map((contributor): Tile => {
      const totals = assessmentTotals([contributor]);
      const assessed = Math.max(0, totals.assessed.value ?? 0);
      const unknown = Math.min(assessed, totals.unknownCurrent);
      const current = Math.min(assessed - unknown, totals.paidWithinAssessment);
      return {
        label: contributor.name,
        value: assessed,
        color: "white",
        assessment: { assessed, current, unknown },
      };
    })
    .filter((tile) => tile.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = tiles.reduce((sum, tile) => sum + tile.value, 0);
  const minimumIndividualValue = total * 0.001;
  const large = tiles.filter((tile) => tile.value >= minimumIndividualValue);
  const small = tiles.filter((tile) => tile.value < minimumIndividualValue);
  if (!small.length) return large;

  // Keep the combined tail last so the thumbnail's corner stays simple.
  const assessment = small.reduce(
    (sum, tile) => ({
      assessed: sum.assessed + tile.assessment!.assessed,
      current: sum.current + tile.assessment!.current,
      unknown: sum.unknown + tile.assessment!.unknown,
    }),
    { assessed: 0, current: 0, unknown: 0 },
  );
  return [
    ...large,
    {
      label: "Other contributors",
      value: assessment.assessed,
      color: "white",
      assessment,
    },
  ];
}

function trustFundTiles(data: BudgetData | null): Tile[] {
  if (!data) return [];
  const shade = Math.round(FUNDING_SHADE_OPACITY.extrabudgetary * 100);
  const children = new Map<string, BudgetData["nodes"]>();
  for (const node of data.nodes) {
    if (node.parentId) {
      const siblings = children.get(node.parentId) ?? [];
      siblings.push(node);
      children.set(node.parentId, siblings);
    }
  }
  const groups = data.meta.sourceGroups ?? [
    {
      id: "volume_i" as const,
      label: "UN Secretariat trust-fund schedules",
      amount: data.meta.total,
    },
  ];
  return groups.flatMap((group) => {
    if (group.amount === null || group.amount <= 0) return [];
    const color = `color-mix(in srgb, ${TRUST_FUND_SOURCE_COLORS[group.id]} ${shade}%, white)`;
    return [
      {
        label: group.label,
        value: group.amount,
        color,
        children: data.nodes
          .filter(
            (node) =>
              node.tier === "budget_unit" &&
              (node.sourceGroup ?? "volume_i") === group.id &&
              node.amount > 0,
          )
          .map((node) => ({
            label: node.entity?.acronym ?? node.code ?? node.label,
            value: node.amount,
            color,
            // Gross detail shares subdivide the net entity area; they are never
            // added to the entity/source amounts used by the preview layout.
            children: (children.get(node.id) ?? [])
              .filter((child) => child.tier === "detail" && child.amount > 0)
              .sort((a, b) => b.amount - a.amount)
              .map((child) => ({ label: child.label, value: child.amount })),
          })),
      },
    ];
  });
}

function layoutTrustFundBands(groups: Tile[]): Rect[] {
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  if (total <= 0) return [];
  let y = 0;
  return groups.flatMap((group) => {
    const height = (group.value / total) * 168;
    const rects = squarifyDense(
      [...(group.children ?? [])]
        .sort((a, b) => b.value - a.value)
        .map((tile) => ({ value: tile.value, data: tile })),
      0,
      y,
      320,
      height,
    ).map(
      (rect): Rect => ({
        ...rect.data,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }),
    );
    y += height;
    return rects;
  });
}

function layoutDensePreview(
  tiles: Tile[],
  { x, y, width, height }: TreemapBounds,
): Rect[] {
  if (width <= 0 || height <= 0) return [];
  return squarifyDense(
    tiles.map((tile) => ({ value: tile.value, data: tile })),
    x,
    y,
    width,
    height,
  ).map((rect) => ({
    ...rect.data,
    x: rect.x * 3.2,
    y: rect.y * 1.68,
    width: rect.width * 3.2,
    height: rect.height * 1.68,
  }));
}

function layoutContributorBands(
  groups: Tile[],
  preserveOrder: boolean,
): Rect[] {
  const groupsByLabel = new Map(groups.map((group) => [group.label, group]));
  // Payment statuses stay in legend order. Trust-fund categories follow their
  // positive amounts, with small categories sharing the bottom band.
  const rows = layoutGroups(
    groups.map((group) => ({ key: group.label, total: group.value })),
    100,
    100,
    0.4,
    preserveOrder ? 0 : 5,
  );
  return rows.flatMap((row) =>
    layoutDensePreview(groupsByLabel.get(row.key)?.children ?? [], row).map(
      (tile) => ({ ...tile, key: `${row.key}:${tile.label}` }),
    ),
  );
}

// Reproduce the programme page's orderedBands/minBandHeight rule at thumbnail
// scale: retain part order, combine adjacent small parts, and merge a short tail.
function layoutProgrammeBands(tiles: Tile[]): Rect[] {
  const total = tiles.reduce((sum, tile) => sum + tile.value, 0);
  if (total <= 0) return [];
  const minimum = (total * (28 + 3)) / 720;
  const bands: Tile[][] = [];
  for (let start = 0; start < tiles.length; ) {
    const band: Tile[] = [];
    let value = 0;
    do {
      band.push(tiles[start]);
      value += tiles[start].value;
      start++;
    } while (start < tiles.length && value < minimum);
    if (value < minimum && bands.length) bands[bands.length - 1].push(...band);
    else bands.push(band);
  }
  let y = 0;
  return bands.flatMap((band) => {
    const value = band.reduce((sum, tile) => sum + tile.value, 0);
    const height = (value / total) * 168;
    let x = 0;
    const rects = band.map((tile): Rect => {
      const width = (tile.value / value) * 320;
      const rect = { ...tile, x, y, width, height };
      x += width;
      return rect;
    });
    y += height;
    return rects;
  });
}

function MiniTreemap({
  tiles,
  bands,
}: {
  tiles: Tile[];
  bands?: Preview["bands"];
}) {
  const positiveTiles = tiles.filter(
    (tile) => Number.isFinite(tile.value) && tile.value > 0,
  );
  // Organization pages use descending category strips with a compact bottom
  // corner for small groups; programme parts preserve their semantic order.
  // Reuse the existing percentage-coordinate band layout for these silhouettes.
  const orderedTiles =
    bands === "programme" ||
    bands === "trust-funds" ||
    bands === "entities" ||
    bands === "payment-status"
      ? positiveTiles
      : positiveTiles.sort((a, b) => b.value - a.value);
  const rects =
    bands === "trust-funds"
      ? layoutTrustFundBands(orderedTiles)
      : bands === "payment-status" || bands === "contributor-groups"
        ? layoutContributorBands(orderedTiles, bands === "payment-status")
        : bands === "programme"
          ? layoutProgrammeBands(orderedTiles)
          : bands === "categories"
            ? layoutGroups(
                orderedTiles.map((tile) => ({
                  key: tile.label,
                  total: tile.value,
                })),
                100,
                100,
                0,
                5,
              ).map(
                (rect): Rect => ({
                  ...orderedTiles.find((tile) => tile.label === rect.key)!,
                  x: rect.x * 3.2,
                  y: rect.y * 1.68,
                  width: rect.width * 3.2,
                  height: rect.height * 1.68,
                }),
              )
            : layoutDensePreview(orderedTiles, {
                x: 0,
                y: 0,
                width: 100,
                height: 100,
              });
  return (
    <svg
      viewBox="0 0 320 168"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {rects.map((tile) => (
        <g key={tile.key ?? tile.label}>
          <rect
            x={tile.x + 1}
            y={tile.y + 1}
            width={Math.max(0, tile.width - 2)}
            height={Math.max(0, tile.height - 2)}
            rx="1.5"
            fill={tile.color}
            stroke={tile.borderColor}
            strokeWidth={tile.borderColor ? 2 : undefined}
          />
          {tile.assessment &&
            (() => {
              // Leave room for the thicker outline on every edge at thumbnail scale.
              const width = Math.max(0, tile.width - 4);
              const height = Math.max(0, tile.height - 4);
              const assessment = tile.assessment;
              let top = tile.y + 2;
              return (
                <>
                  {(["current", "unknown"] as const).map((key) => {
                    const segmentHeight =
                      (height * assessment[key]) / tile.value;
                    const y = top;
                    top += segmentHeight;
                    return (
                      <rect
                        key={key}
                        x={tile.x + 2}
                        y={y}
                        width={width}
                        height={segmentHeight}
                        fill={CEB_ASSESSMENT_COLORS[key]}
                      />
                    );
                  })}
                  <rect
                    x={tile.x + 2}
                    y={tile.y + 2}
                    width={width}
                    height={(height * assessment.assessed) / tile.value}
                    fill="none"
                    stroke={CEB_ASSESSMENT_COLORS.current}
                    strokeWidth="3"
                  />
                </>
              );
            })()}
          {tile.children &&
            squarifyDense(
              tile.children.map((child) => ({
                value: child.value,
                data: child.label,
              })),
              tile.x + 1,
              tile.y + 1,
              Math.max(0, tile.width - 2),
              Math.max(0, tile.height - 2),
            ).map((organization) => (
              <rect
                key={organization.data}
                x={organization.x}
                y={organization.y}
                width={organization.width}
                height={organization.height}
                fill="none"
                stroke="white"
                strokeWidth="0.75"
                strokeOpacity="0.5"
              />
            ))}
        </g>
      ))}
    </svg>
  );
}

function MiniMap({ countries }: { countries: Country[] }) {
  const points = countries.flatMap((country) => {
    const position = projectHomeMapPoint(country.long, country.lat);
    return position && Number.isFinite(country.total) && country.total > 0
      ? [{ ...country, position }]
      : [];
  });
  const max = Math.max(...points.map((country) => country.total));
  return (
    <svg
      viewBox="0 0 320 184"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <path d={HOME_MAP_LAND_PATH} fill="#cbd9df" />
      {points
        .sort((a, b) => b.total - a.total)
        .map((country, index) => (
          <circle
            key={index}
            cx={country.position[0]}
            cy={country.position[1]}
            r={Math.max(1.4, Math.sqrt(country.total / max) * 10)}
            fill="#009edb"
            fillOpacity="0.35"
            stroke="#009edb"
            strokeWidth="0.7"
          />
        ))}
    </svg>
  );
}

function MiniTrend({ years, series }: Trend) {
  if (years.length < 2) return null;
  const totals = years.map((row) =>
    row.values.reduce((sum, value) => sum + value, 0),
  );
  const max = Math.max(...totals);
  if (max <= 0) return null;
  const firstYear = years[0].year;
  const span = years[years.length - 1].year - firstYear;
  // Share the treemap's viewport and one-unit inset so its bottom edge and
  // this baseline stay aligned even when SVGs letterbox at different widths.
  const x = (year: number) => 1 + ((year - firstYear) / span) * 318;
  const y = (amount: number) => 167 - (amount / max) * 166;
  const baseline = years.map(() => 0);
  const paths = series.map((item, seriesIndex) => {
    const lower = baseline.map((amount, index) => [
      x(years[index].year),
      y(amount),
    ]);
    years.forEach((row, index) => {
      baseline[index] += row.values[seriesIndex];
    });
    const upper = baseline.map((amount, index) => [
      x(years[index].year),
      y(amount),
    ]);
    const points = [...upper, ...lower.reverse()];
    return {
      label: item.label,
      color: item.color,
      d: `M${points.map((point) => point.map((value) => value.toFixed(2)).join(",")).join("L")}Z`,
    };
  });
  return (
    <svg
      viewBox="0 0 320 168"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {[41, 83, 125, 167].map((height) => (
        <path
          key={height}
          d={`M1 ${height}H319`}
          stroke="#dbe9ee"
          strokeWidth="0.5"
        />
      ))}
      {paths.map((series) => (
        <path
          key={series.label}
          d={series.d}
          fill={series.color}
          stroke="white"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function MiniGoals() {
  return (
    <svg
      viewBox="0 0 320 168"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {Object.entries(SDG_COLORS).map(([goal, color], index) => {
        const x = 13 + (index % 6) * 50;
        const y = 11 + Math.floor(index / 6) * 50;
        return (
          <g key={goal}>
            <rect x={x} y={y} width="44" height="44" rx="2" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

export async function HomeChartCards({
  links,
  layout = "home",
}: {
  links: readonly { href: string; label: string; scope?: string }[];
  layout?: "home" | "related";
}) {
  const previews = await loadPreviews();
  const compact = layout === "related";
  return (
    <ul
      className={
        compact
          ? "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
          : "grid grid-cols-1 gap-3 md:row-span-[var(--card-rows)] md:grid-rows-subgrid"
      }
    >
      {links.map((link) => {
        const preview = previews[link.href];
        return (
          <li key={link.href} className="flex min-w-0 flex-col">
            <Link
              href={link.href}
              className="group flex flex-1 flex-row overflow-hidden border border-gray-200 bg-white transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-un-blue"
            >
              {preview && (
                <div
                  className={`relative ${compact ? "w-20" : "w-1/3"} shrink-0 overflow-hidden border-r border-gray-100 bg-[#f6fafb] p-2 [&>svg]:opacity-60 [&>svg]:saturate-50 [&>svg]:transition-[opacity,filter] [&>svg]:duration-200 group-hover:[&>svg]:opacity-100 group-hover:[&>svg]:saturate-100 group-focus-visible:[&>svg]:opacity-100 group-focus-visible:[&>svg]:saturate-100`}
                  aria-hidden="true"
                >
                  {preview.trend ? (
                    <MiniTrend {...preview.trend} />
                  ) : preview.goals ? (
                    <MiniGoals />
                  ) : preview.countries ? (
                    <MiniMap countries={preview.countries} />
                  ) : (
                    <MiniTreemap
                      tiles={preview.tiles ?? []}
                      bands={preview.bands}
                    />
                  )}
                </div>
              )}
              <div
                className={`flex min-w-0 flex-1 flex-col ${compact ? "p-2" : "p-3"}`}
              >
                {link.scope && (
                  <span className="mb-1 text-xs font-medium text-gray-500">
                    {link.scope}
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`${compact ? "text-base leading-5" : "text-lg"} font-semibold text-gray-900 group-hover:text-un-blue-dark`}
                  >
                    {link.label}
                  </span>
                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-gray-400 group-hover:text-un-blue"
                    aria-hidden="true"
                  />
                </div>
                <span
                  className={`mt-1 ${compact ? "text-xs" : "text-sm leading-5"} text-gray-600`}
                >
                  {LINK_DESCRIPTIONS[link.href]}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
