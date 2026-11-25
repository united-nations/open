"use client";
import { SectionHeading } from "@/components/ContentHeading";

import { useEffect, useMemo, useState } from "react";
import { FinancialFlowDiagram } from "./FinancialFlowDiagram";
import { FinancialFlowColumnSelect } from "./FinancialFlowColumnSelect";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { useNearViewport } from "@/hooks/useNearViewport";
import { YearSlider } from "./YearSlider";
import { DelayedChartLoading } from "./DelayedChartLoading";
import { useYearRanges } from "@/lib/useYearRanges";
import {
  buildSecretariatColumnFlows,
  SECRETARIAT_FLOW_DIMENSIONS,
  secretariatFlowDimensions,
  type SecretariatFlowChoices,
  selectedLinkValue,
  selectionRows,
  sumRecords,
} from "@/lib/secretariatFlows";
import { formatBudget } from "@/lib/entities";
import type { SecretariatOverviewData } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const columnOptions = {
  funding: [
    { value: "mechanism", label: "Funding mechanism" },
    { value: "arrangement", label: "Funding arrangement" },
  ],
  entity: [
    { value: "category", label: "Entity category" },
    { value: "entity", label: "Entity" },
    { value: "none", label: "None" },
  ],
  priority: [{ value: "priority", label: "Priority area" }],
} as const;
export function SecretariatFlows() {
  const { ref, ready, activate } = useNearViewport<HTMLElement>();
  const [choices, setChoices] = useState<SecretariatFlowChoices>({
    funding: "mechanism",
    entity: "none",
    priority: "priority",
  });
  const dimensions = secretariatFlowDimensions(choices);
  const years = useYearRanges().secretariatOverview;
  const [year, setYear] = useState(years.default);
  const [data, setData] = useState<SecretariatOverviewData | null>(null);
  const [failure, setFailure] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    fetch(`${basePath}/data/secretariat-overview-${year}.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Unable to load expenditure");
        return r.json();
      })
      .then((d: SecretariatOverviewData) => {
        if (!controller.signal.aborted) {
          setData(d);
          setFailure(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailure(year);
      });
    return () => controller.abort();
  }, [ready, year, retry]);
  const error = failure === year;
  const current = error ? null : data;
  const pending = !error && data?.meta.year !== year;
  const model = useMemo(
    () => (current ? buildSecretariatColumnFlows(current, choices, 12) : null),
    [current, choices],
  );
  const total = current ? sumRecords(current.records) : 0;
  return (
    <section
      ref={ref}
      tabIndex={-1}
      id="secretariat-flows"
      aria-labelledby="secretariat-flows-title"
      className="mt-12 scroll-mt-40 space-y-3"
    >
      <SectionHeading id="secretariat-flows-title" anchor="secretariat-flows">
        Financial flows
      </SectionHeading>
      {!ready && (
        <button
          type="button"
          onClick={activate}
          data-deferred-chart-trigger=""
          className="min-h-11 rounded-sm border border-gray-300 px-3 text-sm font-medium"
        >
          Load financial flows
        </button>
      )}
      {ready && (
        <ChartFrame
          header={
            <ChartHeader
              yearControl={
                <YearSlider
                  years={years.years}
                  selectedYear={year}
                  onChange={setYear}
                />
              }
              summaries={[
                {
                  key: "expenditure",
                  label:
                    pending && current
                      ? `Total expenditure · ${current.meta.year}`
                      : "Total expenditure",
                  value: current
                    ? formatBudget(total)
                    : error
                      ? "Unavailable"
                      : "Loading…",
                },
              ]}
            />
          }
        >
          {/* The shared chart already sizes solid bars by net expenditure.
            Show those bars without the additional gross-flow outline. */}
          <div
            className="relative min-h-96 [&_polygon[stroke-dasharray]]:stroke-none"
            aria-busy={pending}
          >
            <DelayedChartLoading
              pending={pending}
              requestKey={`${year}-${retry}`}
            />
            {pending && current && (
              <p
                role="status"
                className="absolute end-0 top-0 z-10 bg-white px-2 text-xs text-gray-600"
              >
                Loading {year}; showing {current.meta.year} until ready…
              </p>
            )}
            {error ? (
              <p role="alert" className="py-12">
                The flows could not be loaded.{" "}
                <button
                  className="underline"
                  onClick={() => {
                    setFailure(null);
                    setRetry((value) => value + 1);
                  }}
                >
                  Try again
                </button>
              </p>
            ) : current && model ? (
              <FinancialFlowDiagram
                graph={model.graph}
                columnControls={(
                  ["funding", "entity", "priority"] as const
                ).map((column, index) => (
                  <FinancialFlowColumnSelect
                    key={column}
                    compact
                    label={`${["Left", "Middle", "Right"][index]} column`}
                    value={choices[column]}
                    options={columnOptions[column]}
                    onChange={(value) => {
                      setChoices((previous) => ({
                        ...previous,
                        [column]: value,
                      }));
                    }}
                  />
                ))}
                columnNotes={
                  choices.entity === "category"
                    ? [null, "Entity categories are preliminary.", null]
                    : undefined
                }
                ariaLabel={`Annual-report expenditure by ${dimensions.map((dimension) => SECRETARIAT_FLOW_DIMENSIONS[dimension].label.toLowerCase()).join(" through ")}`}
                selectionLabel="Selected flow"
                clearLabel="Clear selection"
                formatValue={formatBudget}
                describeNode={(id) =>
                  (model.graph.nodes.find((n) => n.id === id)?.label ?? "") +
                  ": " +
                  formatBudget(sumRecords(model.nodeRows.get(id) ?? []))
                }
                describeLink={(source, target, value, within) =>
                  (model.graph.nodes.find((n) => n.id === source)?.label ??
                    "") +
                  " to " +
                  (model.graph.nodes.find((n) => n.id === target)?.label ??
                    "") +
                  (within ? " selected portion: " : ": ") +
                  formatBudget(
                    within
                      ? sumRecords(
                          selectionRows(
                            model,
                            { kind: "edge", source, target },
                            within,
                          ),
                        )
                      : value,
                  )
                }
                highlightedValue={(selection, source, target) =>
                  selectedLinkValue(model, selection, source, target)
                }
              />
            ) : (
              <p role="status" className="py-12">
                Loading flows…
              </p>
            )}
          </div>
        </ChartFrame>
      )}
    </section>
  );
}
