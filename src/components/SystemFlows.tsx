"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { SystemFlowDiagram } from "./SystemFlowDiagram";
import { YearSlider } from "./YearSlider";
import { ChartFooter } from "./ChartFooter";
import { loadStaticData, loadYearData } from "@/lib/data";
import {
  buildSystemFlows,
  type FlowChoices,
  type FlowSpendingData,
  type SystemFlowInput,
} from "@/lib/systemFlows";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { getRegionStyle } from "@/lib/regionGroupings";
import {
  FINANCING_INSTRUMENT_ORDER,
  getFinancingInstrumentColor,
} from "@/lib/financingInstruments";
import { UN_FUNCTIONS, type FunctionExpenses } from "@/lib/functions";
import { isGovernmentDonor, type ContributorData } from "@/lib/contributors";
import { SDG_COLORS, SDG_SHORT_TITLES } from "@/lib/sdgs";
import { formatBudget } from "@/lib/entities";
import type { CountryExpense, Entity } from "@/types";

interface Loaded {
  year: number;
  input: SystemFlowInput;
}
const options = {
  funding: [
    ["contributor", "Contributor"],
    ["category", "Contributor category"],
    ["instrument", "Financing instrument"],
  ],
  organization: [
    ["organization", "Organization"],
    ["category", "Organization category"],
  ],
  spending: [
    ["region", "Region"],
    ["country", "Country / area"],
    ["function", "Function"],
    ["goal", "Goal"],
  ],
} as const;

export function SystemFlows() {
  const [sources, setSources] = useState<{
    spending: FlowSpendingData;
    functions: FunctionExpenses;
    entities: Entity[];
  } | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [choices, setChoices] = useState<FlowChoices>({
    funding: "instrument",
    organization: "category",
    spending: "function",
    limit: 12,
  });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadStaticData<FlowSpendingData>("system-flow-spending.json"),
      loadStaticData<FunctionExpenses>("function-expenses.json"),
      loadStaticData<Entity[]>("entities.json"),
    ])
      .then(([spending, functions, entities]) => {
        if (!cancelled) {
          setSources({ spending, functions, entities });
          setYear((current) => current ?? spending.meta.years.at(-1)!);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  useEffect(() => {
    if (!sources || year === null) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, 2000);
    Promise.all([
      loadYearData<SystemFlowInput["revenue"]>("entity-revenue", year),
      loadYearData<Record<string, ContributorData>>("donors", year),
      loadYearData<CountryExpense[]>("country-expenses", year),
    ])
      .then(([revenue, contributors, countries]) => {
        if (cancelled) return;
        const spending = sources.spending.data.find(
          (row) => row.year === year,
        )!;
        const functions = sources.functions.data.find(
          (row) => row.year === year,
        )!.entities;
        const entities = Object.fromEntries(
          sources.entities.map((entity) => {
            const category = entity.system_grouping || "Uncategorized";
            return [
              entity.entity,
              {
                category,
                label: entity.entity_long || entity.entity,
                color: getSystemGroupingStyle(category).hexColor || "#6b7280",
              },
            ];
          }),
        );
        setLoaded({
          year,
          input: {
            revenue,
            countries: Object.fromEntries(
              countries.map((country) => [
                country.name.toLowerCase(),
                country.iso3,
              ]),
            ),
            contributors: Object.fromEntries(
              Object.entries(contributors).map(([name, contributor]) => [
                name,
                {
                  ...contributor,
                  group:
                    name === "Unattributed"
                      ? "Unattributed"
                      : isGovernmentDonor(contributor.status)
                        ? "Government"
                        : "Non-Government",
                },
              ]),
            ),
            spending,
            functions,
            entities,
          },
        });
        setSlow(false);
        setError(false);
        window.clearTimeout(timer);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          window.clearTimeout(timer);
        }
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sources, year, retry]);
  const graph = useMemo(
    () =>
      loaded
        ? buildSystemFlows(loaded.input, choices, (column, key) => {
            if (column === 0)
              return {
                label: key,
                order:
                  choices.funding === "instrument"
                    ? (() => {
                        const index = FINANCING_INSTRUMENT_ORDER.findIndex(
                          (instrument) => instrument === key,
                        );
                        return index < 0
                          ? FINANCING_INSTRUMENT_ORDER.length
                          : index;
                      })()
                    : undefined,
                color:
                  choices.funding === "instrument"
                    ? getFinancingInstrumentColor(key)
                    : key === "Non-Government"
                      ? "var(--color-smoky)"
                      : key === "Unattributed"
                        ? "var(--color-dusty-gray)"
                        : "var(--color-un-blue)",
              };
            const fn = UN_FUNCTIONS.find((item) => item.key === key);
            return {
              label: fn?.label || key,
              fullLabel:
                choices.spending === "goal" && SDG_SHORT_TITLES[Number(key)]
                  ? `SDG ${key}: ${SDG_SHORT_TITLES[Number(key)]}`
                  : undefined,
              color:
                choices.spending === "function"
                  ? fn?.color || "#6b7280"
                  : choices.spending === "goal"
                    ? SDG_COLORS[Number(key)] || "#6b7280"
                    : getRegionStyle(key).color,
            };
          })
        : null,
    [loaded, choices],
  );
  const pending = loaded?.year !== year;
  const adjustments = graph?.links.filter((link) => link.value < -0.005) ?? [];
  return (
    <section id="system-flows" className="mt-12 space-y-4">
      <h2 className="text-2xl font-bold">Funding and spending flows</h2>
      <ChartHeader
        yearControl={
          sources && year !== null ? (
            <YearSlider
              years={sources.spending.meta.years}
              selectedYear={year}
              onChange={(value) => {
                setSlow(false);
                setError(false);
                setYear(value);
              }}
            />
          ) : undefined
        }
        summaries={
          loaded && !error && !(pending && slow)
            ? [
                {
                  key: "revenue",
                  label: "Total revenue",
                  value: formatBudget(
                    Object.values(loaded.input.revenue).reduce(
                      (sum, row) => sum + row.total,
                      0,
                    ),
                  ),
                },
                {
                  key: "expenditure",
                  label: "Total expenditure",
                  value: formatBudget(
                    Object.values(loaded.input.spending.entities).reduce(
                      (sum, row) => sum + (row.total ?? 0),
                      0,
                    ),
                  ),
                },
              ]
            : []
        }
      />
      {error ? (
        <p role="alert">
          The flows could not be loaded.{" "}
          <button
            className="underline"
            onClick={() => {
              setError(false);
              setSlow(false);
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </button>
        </p>
      ) : !graph || (pending && slow) ? (
        <div className="min-h-96 py-12" role="status">
          Loading flows{year ? ` for ${year}` : ""}…
        </div>
      ) : (
        <div aria-busy={pending}>
          {pending && (
            <p role="status" className="mb-2 text-sm">
              Loading {year}; showing {loaded?.year} until ready…
            </p>
          )}
          <SystemFlowDiagram
            graph={graph}
            year={loaded!.year}
            columnControls={(
              ["funding", "organization", "spending"] as const
            ).map((dimension) => (
              <label
                key={dimension}
                className={`relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-1 text-start text-xs text-black transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-un-blue hover:bg-gray-200`}
              >
                <span className="sr-only">
                  {dimension === "funding"
                    ? "Funding from"
                    : dimension === "organization"
                      ? "Through"
                      : "Spending by"}
                </span>
                <span
                  aria-hidden="true"
                  className="font-medium whitespace-nowrap text-black"
                >
                  {
                    options[dimension].find(
                      ([value]) => value === choices[dimension],
                    )?.[1]
                  }
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-black"
                />
                <select
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  value={choices[dimension]}
                  onChange={(event) =>
                    setChoices((current) => ({
                      ...current,
                      [dimension]: event.target.value,
                    }))
                  }
                >
                  {options[dimension].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          />
        </div>
      )}
      {adjustments.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">
            Signed adjustments ({adjustments.length})
          </summary>
          <p className="my-2">
            Ribbons show positive net connections. Filled node edges show totals
            after negative adjustments; dashed extensions show the difference.
            Negative entries below are included in the totals, not drawn as
            positive flows.
          </p>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2">From</th>
                  <th className="p-2">To</th>
                  <th className="p-2 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((link) => (
                  <tr
                    key={`${link.source}/${link.target}`}
                    className="border-t border-gray-200"
                  >
                    <td className="p-2">
                      {
                        graph?.nodes.find((node) => node.id === link.source)
                          ?.label
                      }
                    </td>
                    <td className="p-2">
                      {
                        graph?.nodes.find((node) => node.id === link.target)
                          ?.label
                      }
                    </td>
                    <td className="p-2 text-right">
                      {formatBudget(link.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <ChartFooter
        hint="Hover for amounts; click a bar or connection to pin details."
        details={
          <div className="space-y-2">
            <p>
              Detailed columns show the largest 12 items and combine the rest
              into an “other” group. Regional, subregional and unallocated
              spending remain included.
            </p>
            <p>
              CEB annual revenue and expenditure, including inter-agency
              transfers, which are not eliminated. Geography includes country,
              regional and subregional records. SDG spending includes amounts
              not allocated to a goal. These dimensions are alternative
              breakdowns, not additive totals.
            </p>
            <p>
              “Breakdown / total difference” is a calculated reconciliation
              amount, not an assigned destination. Known inconsistent geographic
              labels retain their source names under “Unresolved geographic
              classification.” The diagram uses CEB organization totals
              throughout, without substituting Secretariat sub-entities.
            </p>
            <p>
              <a
                href="https://unsceb.org/financial-statistics"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                CEB financial statistics
              </a>
            </p>
          </div>
        }
      />
    </section>
  );
}
