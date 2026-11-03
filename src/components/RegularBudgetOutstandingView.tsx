"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GroupedTreemap,
  type GroupedTreemapRow,
} from "@un-eosg/ui/components/grouped-treemap";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { TableHead } from "@un-eosg/ui/components/data-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { HierarchicalMultiSelect } from "@/components/ui/hierarchical-multi-select";
import { TREND_CHART_HEIGHT } from "@/components/charts/trendLayout";
import { YearSlider } from "@/components/YearSlider";
import {
  RegularBudgetOutstandingTrendsChart,
  outstandingMetricRows,
  type AssessmentFiles,
} from "@/components/RegularBudgetOutstandingTrendsChart";
import { useRegularBudgetOutstanding } from "@/hooks/useRegularBudgetOutstanding";
import { useYearRanges } from "@/lib/useYearRanges";
import { loadYearData } from "@/lib/data";
import {
  formatAssessmentCurrency as money,
  formatAssessmentDate as date,
} from "@/lib/regularBudgetContributors";
import {
  formatOutstandingPercent as percent,
  outstandingAmount,
  outstandingChange,
  outstandingSourceUrl,
  percentageOf,
  OUTSTANDING_TOTAL_COLOR,
  assignOutstandingCountryColors,
} from "@/lib/regularBudgetOutstanding";
import type {
  RegularBudgetContributorsData,
  RegularBudgetOutstandingContributor,
} from "@/types";

type SortKey = "name" | "amount" | "share" | "relative" | "change" | "percent";
const TABLE_COLUMNS = "28% 13% 14% 21% 12% 12%";

export function RegularBudgetOutstandingView({
  onSelect,
}: {
  onSelect: (name: string, year: number) => void;
}) {
  const { rows, error } = useRegularBudgetOutstanding();
  const range = useYearRanges().regularBudgetOutstanding;
  const assessmentYears = useYearRanges().regularBudgetContributors.years;
  const [year, setYear] = useState(range.default);
  const [view, setView] = useState("treemap");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(["all"]));
  const selectedCountries = [...selected].filter((name) => name !== "all");
  const [countryColors, setCountryColors] = useState<Record<string, string>>(
    {},
  );
  const [assessments, setAssessments] = useState<AssessmentFiles>({});
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({
    key: "amount",
    ascending: false,
  });
  useEffect(() => {
    let active = true;
    Promise.all(
      assessmentYears.map(async (value) => {
        try {
          return [
            value,
            await loadYearData<RegularBudgetContributorsData>(
              "regular-budget-contributors",
              value,
            ),
          ] as const;
        } catch {
          return [value, null] as const;
        }
      }),
    ).then((entries) => {
      if (active) setAssessments(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [assessmentYears]);
  const snapshot = rows?.find((row) => row.meta.year === year);
  const previous = rows?.find((row) => row.meta.year === year - 1);
  const tableRows = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.contributors
      .filter((row) =>
        row.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
      .map((row) => {
        const change = outstandingChange(
          row.outstanding_amount,
          outstandingAmount(previous, [row.name]),
        );
        const assessment =
          assessments[year]?.contributors.find((item) => item.name === row.name)
            ?.assessment_amount ?? null;
        return {
          ...row,
          amount: row.outstanding_amount,
          share: percentageOf(
            row.outstanding_amount,
            snapshot.meta.total_outstanding,
          ),
          relative: percentageOf(row.outstanding_amount, assessment),
          change: change.amount,
          percent: change.percent,
          newBalance: change.newBalance,
        };
      })
      .sort((a, b) => {
        if (sort.key === "name")
          return a.name.localeCompare(b.name) * (sort.ascending ? 1 : -1);
        const left = a[sort.key];
        const right = b[sort.key];
        if (left === null)
          return right === null ? a.name.localeCompare(b.name) : 1;
        if (right === null) return -1;
        return (
          (left - right) * (sort.ascending ? 1 : -1) ||
          a.name.localeCompare(b.name)
        );
      });
  }, [snapshot, previous, assessments, year, query, sort]);
  if (error)
    return (
      <section className="mt-12" role="alert">
        {error}
      </section>
    );
  if (!rows || !snapshot)
    return (
      <section className="mt-12" role="status">
        Loading outstanding contributions…
      </section>
    );
  const treemapRows: GroupedTreemapRow<
    string,
    never,
    RegularBudgetOutstandingContributor,
    never
  >[] = tableRows
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((row) => ({
      key: row.name,
      label: row.name,
      color: "var(--color-au-chico)",
      leaves: [
        {
          key: row.name,
          label: row.name,
          value: row.amount,
          color: "var(--color-au-chico)",
          data: row,
          accessibleDescription: `${percent(row.share)} of total outstanding; autumn snapshot ${snapshot.meta.as_of}`,
          onActivate: () => onSelect(row.name, year),
        },
      ],
    }));
  const sortColumn = (key: SortKey, label: string) => (
    <TableHead
      numeric={key !== "name"}
      className="py-3"
      aria-sort={
        sort.key === key
          ? sort.ascending
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        className="inline-flex items-center gap-0.5 whitespace-nowrap transition-colors hover:text-foreground"
        aria-label={`Sort ${label} ${sort.key === key ? (sort.ascending ? "descending" : "ascending") : key === "name" ? "ascending" : "descending"}`}
        title={
          {
            name: "Sort by Member State",
            amount:
              "Remaining unpaid contributions, including prior-year arrears, at the displayed reporting date",
            share:
              "Country balance divided by all Member States’ outstanding balances at this snapshot",
            relative:
              "Accumulated outstanding balance divided by the annual assessment; can exceed 100%",
            change:
              "Balance minus the preceding year’s autumn balance; not cash paid",
            percent:
              "Change divided by the preceding year’s balance; undefined when that balance was zero",
          }[key]
        }
        onClick={() =>
          setSort({
            key,
            ascending: sort.key === key ? !sort.ascending : key === "name",
          })
        }
      >
        {label}
        {sort.key === key && sort.ascending ? (
          <ChevronUp
            aria-hidden="true"
            className="size-3.5 shrink-0 text-un-blue-text"
          />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 shrink-0 ${sort.key === key ? "text-un-blue-text" : "opacity-40"}`}
          />
        )}
      </button>
    </TableHead>
  );
  const sourceLink = (
    <a
      href={outstandingSourceUrl(snapshot)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-un-blue underline"
    >
      Financial situation presentation,{" "}
      {snapshot.meta.source.format === "pdf" ? "page" : "slide"}{" "}
      {snapshot.meta.source.page}
    </a>
  );
  return (
    <section
      className="mt-12 space-y-5 border-t border-gray-200 pt-8"
      aria-labelledby="outstanding-heading"
      id="regular-budget-outstanding"
    >
      <div>
        <h2 id="outstanding-heading" className="text-2xl font-medium">
          Outstanding contributions
        </h2>
        <p className="mt-2 text-gray-600">
          Amounts still owed to the regular budget, including previous years’
          arrears, after partial payments and credits. Annual autumn snapshots.
        </p>
      </div>
      <ChartFrame
        header={
          <div
            className="flex flex-wrap items-center gap-4"
            data-outstanding-controls
          >
            <BinaryToggle
              variant="segmented"
              label="Outstanding contributions display"
              options={[
                { value: "treemap", label: "Treemap" },
                { value: "table", label: "Table" },
              ]}
              value={view}
              onValueChange={setView}
            />
            <div className="flex flex-wrap items-center gap-2">
              <YearSlider
                years={range.years}
                selectedYear={year}
                onChange={setYear}
              />
              <span
                className="text-sm whitespace-nowrap text-gray-600"
                title={date(snapshot.meta.as_of)}
              >
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${snapshot.meta.as_of}T00:00:00Z`))}
              </span>
            </div>
            <div className="w-full sm:w-56">
              <SearchInput
                variant="border-bottom"
                aria-label="Search Member States"
                placeholder="Search Member States..."
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                showClear
                onClear={() => setQuery("")}
              />
            </div>
            <dl
              className="ml-auto flex items-center gap-6 text-right"
              data-outstanding-summary
            >
              <div>
                <dt className="text-sm text-gray-600">Member States</dt>
                <dd className="text-2xl font-medium">
                  {tableRows.filter((row) => row.amount > 0).length}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">
                  {query ? "Matching outstanding balance" : "Total outstanding"}
                </dt>
                <dd className="text-2xl font-medium">
                  {money(tableRows.reduce((sum, row) => sum + row.amount, 0))}
                </dd>
              </div>
            </dl>
          </div>
        }
        footer={
          <ChartFooter
            hint="Click a country in the treemap or table to open its assessment and outstanding-balance history"
            sourceSuffix="Outstanding regular-budget contributions"
            details={
              <>
                <p>
                  Balances come from complete autumn debtor lists in the UN
                  financial situation presentations. Countries absent from a
                  validated complete list have a zero balance at that cutoff.
                  This is independent of the honour roll’s later reporting date.
                </p>
                <p>
                  {sourceLink} · Snapshot {date(snapshot.meta.as_of)}.
                </p>
                <p>
                  Table totals sum country balances; no adjustment is made to
                  match rounded headline totals.
                </p>
                {rows
                  .filter((row) => row.meta.reconciliation_note)
                  .map((row) => (
                    <p key={row.meta.year}>
                      {row.meta.year}: {row.meta.reconciliation_note}
                    </p>
                  ))}
              </>
            }
          />
        }
      >
        {view === "treemap" ? (
          <GroupedTreemap<
            string,
            never,
            RegularBudgetOutstandingContributor,
            never
          >
            rows={treemapRows}
            plotClassName="h-[460px] sm:h-[560px]"
            showLeafValues
            totalLabel="Outstanding"
            formatValue={money}
            formatAccessibleValue={money}
            hideHeader
            showRowLabels={false}
            layout={{ rowGap: 2, leafGap: 2 }}
            renderTooltip={({ leaf }) =>
              leaf.data ? (
                <FinancialTooltip
                  title={leaf.data.name}
                  total={{
                    label: "Outstanding contributions",
                    value: money(leaf.data.outstanding_amount),
                  }}
                  rows={outstandingMetricRows(
                    snapshot,
                    previous,
                    [leaf.data.name],
                    assessments,
                    true,
                    true,
                  )}
                  notes={`At ${date(snapshot.meta.as_of)}; includes previous years’ arrears.`}
                  actionHint="Click to explore details"
                />
              ) : null
            }
            emptyContent={
              <p className="p-6 text-sm text-gray-600">
                No positive outstanding balances match this search. Use the
                table to see zero balances.
              </p>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200">
            <table
              className="block w-full min-w-[60rem] text-sm"
              data-outstanding-table
            >
              <caption className="sr-only">
                Outstanding contributions at {date(snapshot.meta.as_of)}.
                Includes previous years’ arrears; balance relative to assessment
                can exceed 100%.
              </caption>
              <thead className="block overflow-y-hidden bg-gray-50 [scrollbar-gutter:stable]">
                <tr
                  className="grid"
                  style={{ gridTemplateColumns: TABLE_COLUMNS }}
                >
                  {sortColumn("name", "Member State")}
                  {sortColumn("amount", "Outstanding")}
                  {sortColumn("share", "Share of total (%)")}
                  {sortColumn("relative", "Balance / assessment (%)")}
                  {sortColumn("change", "Change ($)")}
                  {sortColumn("percent", "Change (%)")}
                </tr>
              </thead>
              <tbody className="block max-h-[560px] overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
                {tableRows.map((row) => (
                  <tr
                    key={row.name}
                    className="grid border-t border-gray-100"
                    style={{ gridTemplateColumns: TABLE_COLUMNS }}
                  >
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <button
                        type="button"
                        className="text-left text-un-blue hover:underline"
                        onClick={() => onSelect(row.name, year)}
                      >
                        {row.name}
                      </button>
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {money(row.amount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {percent(row.share)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {percent(row.relative)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.change === null
                        ? "Unavailable"
                        : `${row.change > 0 ? "+" : ""}${money(row.change)}`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.newBalance
                        ? "New balance"
                        : row.percent === null && row.change === 0
                          ? "–"
                          : percent(row.percent, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tableRows.length && (
              <p className="p-4 text-sm">No Member States match this search.</p>
            )}
          </div>
        )}
      </ChartFrame>
      <div className="grid grid-cols-1 gap-8 pt-4 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 space-y-3" data-outstanding-comparison>
          <h3 className="text-lg font-medium">
            Outstanding contributions over time
          </h3>
          <HierarchicalMultiSelect
            groups={[
              {
                id: "all",
                label: "All Member States",
                bgColor: "bg-au-chico",
                children: snapshot.contributors.map((row) => row.name),
              },
            ]}
            selected={selected}
            onChange={(next) => {
              setSelected(next);
              setCountryColors((current) =>
                assignOutstandingCountryColors(
                  current,
                  [...next].filter((name) => name !== "all"),
                ),
              );
            }}
            getItemColor={(id) =>
              id === "all" ? OUTSTANDING_TOTAL_COLOR : countryColors[id]
            }
            addLabel="Add"
          />
          {selected.size > 0 ? (
            <RegularBudgetOutstandingTrendsChart
              rows={rows}
              names={selectedCountries}
              includeTotal={selected.has("all")}
              countryColors={countryColors}
              assessments={assessments}
              variant="line"
              showLegend={false}
            />
          ) : (
            <div
              className="flex items-center justify-center text-sm text-gray-500"
              style={{ height: TREND_CHART_HEIGHT }}
            >
              Select Member States to view the trend.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
