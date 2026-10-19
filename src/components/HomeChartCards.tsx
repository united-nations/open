import { FEATURES } from "@/lib/featureFlags";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LINK_DESCRIPTIONS } from "@/components/SectionLinkCards";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { layoutGroups, squarifyDense } from "@/lib/treemapLayout";
import { HOME_MAP_LAND_PATH, projectHomeMapPoint } from "@/lib/home-map";
import { getFinancingInstrumentColor } from "@/lib/financingInstruments";
import { SDG_COLORS } from "@/lib/sdgs";
import {
  PALETTE,
  PART_BAND_COLORS,
  budgetPartStyles,
  priorityAreaColor,
} from "@/lib/secretariatGroupings";
import type {
  BudgetData,
  Entity,
  SecretariatEntitiesData,
  SecretariatOverviewData,
} from "@/types";

type Tile = { label: string; value: number; color?: string };
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
type Preview = {
  tiles?: Tile[];
  countries?: Country[];
  goals?: boolean;
  funding?: FundingYear[];
  bands?: "categories" | "programme" | "entities";
};
type Rect = Tile & { x: number; y: number; width: number; height: number };

// Read the existing exports on the server so these navigation thumbnails add
// neither chart-library JavaScript nor multi-megabyte data fetches to the home page.
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
        )
      : null,
    FEATURES.peacekeepingBudget
      ? readData<SecretariatEntitiesData>("secretariat-entities.json")
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
  const budgetTiles = (data: BudgetData, tier: string) =>
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
          value: node.amount,
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
  return {
    "/system/organizations": {
      bands: "categories",
      tiles: [...categories].map(([category, value]) => ({
        label: getSystemGroupingStyle(category).label,
        value,
        color: getSystemGroupingStyle(category).hexColor,
      })),
    },
    "/system/contributors": {
      funding: [...contributorTrends.aggregates.all].sort(
        (a, b) => a.year - b.year,
      ),
    },
    "/system/locations": { countries },
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
      tiles: programme ? budgetTiles(programme, "part") : [],
    },
    "/secretariat/peacekeeping-budget": {
      countries: peacekeepingPoints,
    },
    "/secretariat/trust-funds": {
      bands: "entities",
      tiles: (funds?.nodes ?? [])
        .filter((node) => node.tier === "budget_unit")
        .map((node) => ({
          label: node.entity?.acronym ?? node.code ?? node.label,
          color: "var(--color-un-blue)",
          value: node.amount,
        })),
    },
  };
});

// A balanced binary treemap keeps small previews readable without a client-side
// layout engine. Areas reflect positive amounts; signed corrections stay in the
// full destination charts. These decorative previews intentionally show no totals.
function layoutTiles(
  tiles: Tile[],
  x = 0,
  y = 0,
  width = 320,
  height = 168,
): Rect[] {
  if (!tiles.length) return [];
  if (tiles.length === 1) return [{ ...tiles[0], x, y, width, height }];
  const total = tiles.reduce((sum, tile) => sum + tile.value, 0);
  let split = 1;
  let first = tiles[0].value;
  while (
    split < tiles.length - 1 &&
    Math.abs(first + tiles[split].value - total / 2) <
      Math.abs(first - total / 2)
  ) {
    first += tiles[split].value;
    split++;
  }
  const fraction = first / total;
  return width >= height
    ? [
        ...layoutTiles(tiles.slice(0, split), x, y, width * fraction, height),
        ...layoutTiles(
          tiles.slice(split),
          x + width * fraction,
          y,
          width * (1 - fraction),
          height,
        ),
      ]
    : [
        ...layoutTiles(tiles.slice(0, split), x, y, width, height * fraction),
        ...layoutTiles(
          tiles.slice(split),
          x,
          y + height * fraction,
          width,
          height * (1 - fraction),
        ),
      ];
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
    bands === "programme"
      ? positiveTiles
      : positiveTiles.sort((a, b) => b.value - a.value);
  const rects =
    bands === "entities"
      ? squarifyDense(
          orderedTiles.map((tile) => ({ value: tile.value, data: tile })),
          0,
          0,
          100,
          100,
        ).map(
          (rect): Rect => ({
            ...rect.data,
            x: rect.x * 3.2,
            y: rect.y * 1.68,
            width: rect.width * 3.2,
            height: rect.height * 1.68,
          }),
        )
      : bands === "programme"
        ? layoutProgrammeBands(orderedTiles)
        : bands
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
          : layoutTiles(orderedTiles);
  return (
    <svg
      viewBox="0 0 320 168"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {rects.map((tile) => (
        <g key={tile.label}>
          <rect
            x={tile.x + 1}
            y={tile.y + 1}
            width={Math.max(0, tile.width - 2)}
            height={Math.max(0, tile.height - 2)}
            rx="1.5"
            fill={tile.color}
          />
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

function MiniFundingTrend({ years }: { years: FundingYear[] }) {
  if (years.length < 2) return null;
  const totals = years.map((row) =>
    FUNDING_SERIES.reduce((sum, series) => sum + row[series.key], 0),
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
  const paths = FUNDING_SERIES.map((series) => {
    const lower = baseline.map((amount, index) => [
      x(years[index].year),
      y(amount),
    ]);
    years.forEach((row, index) => {
      baseline[index] += row[series.key];
    });
    const upper = baseline.map((amount, index) => [
      x(years[index].year),
      y(amount),
    ]);
    const points = [...upper, ...lower.reverse()];
    return {
      label: series.label,
      color: getFinancingInstrumentColor(series.label),
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
}: {
  links: readonly { href: string; label: string }[];
}) {
  const previews = await loadPreviews();
  return (
    <ul className="mt-5 grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 md:row-span-4 md:grid-cols-1 md:grid-rows-subgrid lg:row-span-2 lg:grid-cols-2">
      {links.map((link) => {
        const preview = previews[link.href];
        return (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              className="group flex h-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white transition-colors hover:border-un-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-un-blue"
            >
              {preview && (
                <div
                  className={`relative aspect-[320/184] overflow-hidden bg-[#f6fafb] p-2 ${preview.countries ? "" : "border-b border-gray-100"}`}
                  aria-hidden="true"
                >
                  {preview.funding ? (
                    <MiniFundingTrend years={preview.funding} />
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
              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-un-blue-dark">
                    {link.label}
                  </span>
                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-gray-400 group-hover:text-un-blue"
                    aria-hidden="true"
                  />
                </div>
                <span className="mt-1 text-sm leading-5 text-gray-600">
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
