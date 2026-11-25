import { ChartHeading } from "@/components/ContentHeading";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  FinancingInstrumentChart,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import {
  SDG_COLORS,
  SDG_EXTRA_GROUPS,
  SDG_SHORT_TITLES,
  SDG_TITLES,
  type SDGExpensesData,
} from "@/lib/sdgs";
import manifest from "../../public/data/manifest.json";

const series: FinancingSeries[] = [
  ...Array.from({ length: 17 }, (_, index) => {
    const number = index + 1;
    return {
      key: String(number),
      label: `SDG ${number}: ${SDG_SHORT_TITLES[number]}`,
      legendLabel: String(number),
      color: SDG_COLORS[number],
      tooltip: `SDG ${number}: ${SDG_SHORT_TITLES[number]}. ${SDG_TITLES[number]}.`,
    };
  }),
  ...[0, -1].map((number) => {
    const group = SDG_EXTRA_GROUPS[number];
    return {
      key: group.key,
      label: group.label,
      color: group.color,
      tooltip: group.description,
    };
  }),
];

// Aggregate at build time, as on the homepage: only these small annual totals
// are sent to the browser, rather than fetching every full entity breakdown.
export async function SDGsTrendsChart() {
  const years = [...manifest.sdgExpenses.years].sort((a, b) => a - b);
  const data = await Promise.all(
    years.map(async (year) => {
      const expenses = JSON.parse(
        await readFile(
          path.join(process.cwd(), "public/data", `sdg-expenses-${year}.json`),
          "utf8",
        ),
      ) as SDGExpensesData;
      return {
        year: String(year),
        ...Object.fromEntries(
          Array.from({ length: 17 }, (_, index) => [
            String(index + 1),
            expenses[String(index + 1)].total,
          ]),
        ),
        non_sdg: expenses.non_sdg.total,
        sdg_not_specified: expenses.sdg_not_specified.total,
      };
    }),
  );

  return (
    <section
      aria-labelledby="sdg-trends-heading"
      className="mt-12 min-w-0 space-y-3 lg:w-1/2"
    >
      <ChartHeading id="sdg-trends-heading">
        Expenditure by SDG classification over time
      </ChartHeading>
      <FinancingInstrumentChart
        accessibleTableLabel="Annual expenditure by SDG classification"
        data={data}
        series={series}
        height={240}
        filterable
        showTooltipTotal
        allowNegative
        omitNegativeFromPlot
        showShareToggle
        stackOffset="none"
      />
      <p className="text-sm text-gray-500">
        Annual snapshots are not directly comparable because reporting coverage
        and allocations can change.
      </p>
    </section>
  );
}
