"use client";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { ClickHint } from "@/components/ui/ClickHint";
import { formatBudget } from "@/lib/entities";
import { getRegionStyle } from "@/lib/regionGroupings";

interface CountryExpense {
  iso3: string;
  name: string;
  region: string;
  lat: number;
  long: number;
  total: number;
  entities: Record<string, number>;
}

interface CountryTreemapProps {
  data: CountryExpense[];
  hideHeader?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCountryClick: (country: CountryExpense) => void;
}

function matchesCountry(country: CountryExpense, query: string): boolean {
  const term = query.trim().toLocaleLowerCase();
  return (
    !term ||
    country.name.toLocaleLowerCase().includes(term) ||
    country.region.toLocaleLowerCase().includes(term) ||
    country.iso3.toLocaleLowerCase().includes(term)
  );
}

function formatAccessibleBudget(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CountryTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<string, never, CountryExpense, never>;
}) {
  const country = context.leaf.data;
  if (!country) return null;
  const region = getRegionStyle(country.region || "Unknown");

  return (
    <div className="space-y-1 text-center">
      <p className="text-sm font-semibold">{country.name}</p>
      <div className="flex items-center justify-center gap-1.5 text-xs opacity-75">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: region.color }}
        />
        <span>{region.label}</span>
      </div>
      <p className="text-xs font-semibold">
        {formatAccessibleBudget(country.total)}
      </p>
      <ClickHint />
    </div>
  );
}

export function CountryTreemap({
  data,
  hideHeader,
  searchQuery,
  onSearchChange,
  onCountryClick,
}: CountryTreemapProps) {
  const positiveCountries = data.filter(
    (country) => Number.isFinite(country.total) && country.total > 0,
  );
  const countriesByName = new Map(
    positiveCountries.map((country) => [country.name, country]),
  );
  const regionGroups = positiveCountries.reduce<
    Record<string, CountryExpense[]>
  >((groups, country) => {
    const region = country.region || "Unknown";
    (groups[region] ??= []).push(country);
    return groups;
  }, {});
  const rows = Object.entries(regionGroups)
    .sort(([regionA], [regionB]) => {
      const orderDifference =
        getRegionStyle(regionA).order - getRegionStyle(regionB).order;
      return orderDifference || regionA.localeCompare(regionB);
    })
    .map(([region, countries]) => {
      const style = getRegionStyle(region);
      return {
        key: region,
        label: style.label,
        color: style.color,
        data: region,
        leaves: countries
          .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
          .map((country) => ({
            key: country.iso3,
            label: country.name,
            value: country.total,
            color: style.color,
            data: country,
            onActivate: () => onCountryClick(country),
          })),
      } satisfies GroupedTreemapRow<string, never, CountryExpense, never>;
    });
  const visibleTotal = positiveCountries
    .filter((country) => matchesCountry(country, searchQuery))
    .reduce((sum, country) => sum + country.total, 0);

  return (
    <GroupedTreemap<string, never, CountryExpense, never>
      rows={rows}
      hideHeader={hideHeader}
      search={{
        value: searchQuery,
        onChange: onSearchChange,
        label: "Search countries",
        placeholder: "Search by country or region...",
        predicate: (leafLabel, _subgroupLabel, _rowLabel, query) => {
          const country = countriesByName.get(leafLabel);
          return country ? matchesCountry(country, query) : false;
        },
      }}
      summaries={[
        {
          key: "visible-total",
          label: searchQuery.trim() ? "Matching total" : "Total",
          value: formatBudget(visibleTotal),
        },
      ]}
      totalLabel="Total"
      layout={{ rowOrder: "input" }}
      plotClassName="h-[650px]"
      formatValue={formatBudget}
      formatAccessibleValue={formatAccessibleBudget}
      renderTooltip={(context) => <CountryTooltip context={context} />}
      emptyContent={
        <div className="flex h-full items-center justify-center text-lg text-gray-500">
          No countries match the search criteria
        </div>
      }
    />
  );
}
