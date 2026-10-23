import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  FinancingInstrumentChart,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import { SDG_EXTRA_GROUPS, type SDGExpensesData } from "@/lib/sdgs";
import { formatBudget } from "@/lib/entities";
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
        data={data}
        series={series}
        height={240}
        filterable
        showTooltipTotal
        allowNegative
      />
      <table className="sr-only">
        <caption>Annual expenditure by SDG classification, US dollars</caption>
        <thead>
          <tr>
            <th>Year</th>
            <th>SDG</th>
            <th>Non-SDG</th>
            <th>Not specified</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              <td>{formatBudget(row.sdg)}</td>
              <td>{formatBudget(row.non_sdg)}</td>
              <td>{formatBudget(row.sdg_not_specified)}</td>
              <td>
                {formatBudget(row.sdg + row.non_sdg + row.sdg_not_specified)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
