"use client";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
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

const formatAccessibleBudget = sharedFormatBudget;

function CountryTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<string, never, CountryExpense, never>;
}) {
  const country = context.leaf.data;
  if (!country) return null;
  return <CountryFinancialTooltip country={country} />;
}

export function CountryFinancialTooltip({
  country,
}: {
  country: { name: string; region?: string; total: number };
}) {
  const region = getRegionStyle(country.region || "Unknown");
  return (
    <FinancialTooltip
      title={country.name}
      parents={[{ label: region.label, color: region.color }]}
      total={{
        label: "Spending",
        value: formatAccessibleBudget(country.total),
      }}
      actionHint="Click to explore details"
    />
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
      layout={{ rowOrder: "value-desc", consolidateSmallRows: true }}
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
