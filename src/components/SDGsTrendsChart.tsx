import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  FinancingInstrumentChart,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import { SDG_EXTRA_GROUPS, type SDGExpensesData } from "@/lib/sdgs";
import manifest from "../../public/data/manifest.json";

const series: FinancingSeries[] = [
  {
    key: "sdg",
    label: "SDG",
    color: "var(--color-un-blue)",
    tooltip: "Reported actual expenditure allocated to SDGs 1–17.",
  },
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
        sdg: Array.from(
          { length: 17 },
          (_, index) => expenses[String(index + 1)].total,
        ).reduce((sum, value) => sum + value, 0),
        non_sdg: expenses.non_sdg.total,
        sdg_not_specified: expenses.sdg_not_specified.total,
      };
    }),
  );

  return (
    <section
      aria-labelledby="sdg-trends-heading"
      className="mt-12 min-w-0 space-y-4 lg:w-1/2"
    >
      <h2 id="sdg-trends-heading" className="text-xl font-bold text-gray-900">
        Expenditure by SDG classification over time
      </h2>
      <FinancingInstrumentChart
        accessibleTableLabel="Annual expenditure by SDG classification"
        data={data}
        series={series}
        height={240}
        filterable
        showTooltipTotal
        allowNegative
      />
    </section>
  );
}
