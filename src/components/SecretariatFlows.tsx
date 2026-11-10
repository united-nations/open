"use client";
import { SectionHeading } from "@/components/ContentHeading";

import { useEffect, useMemo, useState } from "react";
import { FinancialFlowDiagram } from "./FinancialFlowDiagram";
import { FinancialFlowColumnSelect } from "./FinancialFlowColumnSelect";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { YearSlider } from "./YearSlider";
import { SecretariatFlowDetails } from "./SecretariatFlowDetails";
import { SecretariatEntitySidebar } from "./SecretariatEntitySidebar";
import { ChartFooter } from "./ChartFooter";
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
  type SecretariatRecord,
} from "@/lib/secretariatFlows";
import { formatBudget } from "@/lib/entities";
import type {
  SecretariatOverviewData,
  SecretariatOverviewEntity,
} from "@/types";

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
  const [selected, setSelected] = useState<SecretariatOverviewEntity | null>(
    null,
  );
  useEffect(() => {
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
  }, [year, retry]);
  const error = failure === year;
  const current = error ? null : data;
  const pending = !error && data?.meta.year !== year;
  const model = useMemo(
    () => (current ? buildSecretariatColumnFlows(current, choices, 12) : null),
    [current, choices],
  );
  const total = current ? sumRecords(current.records) : 0;
  const openEntity = (code: string, members: SecretariatRecord[]) => {
    const entity = current?.entities.find((e) => e.code === code);
    if (!entity) return;
    const ids = new Set(members.map((r) => r.id));
    const cells = entity.cells
      .map((cell) => ({
        ...cell,
        amount: sumRecords(
          members.filter((r) => cell.record_ids.includes(r.id)),
        ),
        record_ids: cell.record_ids.filter((id) => ids.has(id)),
      }))
      .filter((c) => c.record_ids.length);
    setSelected({ ...entity, cells, total: sumRecords(members) });
  };
  return (
    <section
      id="secretariat-flows"
      aria-labelledby="secretariat-flows-title"
      className="mt-12 scroll-mt-40 space-y-4"
    >
      <SectionHeading id="secretariat-flows-title" anchor="secretariat-flows">
        Financial flows
      </SectionHeading>
      <ChartFrame
        header={
          <ChartHeader
            yearControl={
              <YearSlider
                years={years.years}
                selectedYear={year}
                onChange={(next) => {
                  setYear(next);
                  setSelected(null);
                }}
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
        footer={
          <ChartFooter hint="Hover for amounts; click a bar or connection to open details." />
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
              columnControls={(["funding", "entity", "priority"] as const).map(
                (column, index) => (
                  <FinancialFlowColumnSelect
                    key={column}
                    label={`${["Left", "Middle", "Right"][index]} column`}
                    value={choices[column]}
                    options={columnOptions[column]}
                    onChange={(value) => {
                      setChoices((previous) => ({
                        ...previous,
                        [column]: value,
                      }));
                      setSelected(null);
                    }}
                  />
                ),
              )}
              columnNotes={
                choices.entity === "category"
                  ? [null, "Entity categories are preliminary.", null]
                  : undefined
              }
              ariaLabel={`Annual-report expenditure by ${dimensions.map((dimension) => SECRETARIAT_FLOW_DIMENSIONS[dimension].label.toLowerCase()).join(" through ")}`}
              sidebarDetails={(selection, onClose) => {
                const rows = selectionRows(model, selection);
                const label = (id: string) =>
                  model.graph.nodes.find((node) => node.id === id)?.label ?? "";
                return {
                  title:
                    selection.kind === "node"
                      ? label(selection.id)
                      : `${label(selection.source)} → ${label(selection.target)}`,
                  year: current.meta.year,
                  eyebrow: "Selected expenditure",
                  subtitle: "All funding sources · selected source records",
                  total: {
                    label: "Net expenditure",
                    value: formatBudget(sumRecords(rows)),
                  },
                  children: (
                    <SecretariatFlowDetails
                      model={model}
                      dimensions={dimensions}
                      selection={selection}
                      compact={false}
                      onEntity={(code, members) => {
                        onClose();
                        openEntity(code, members);
                      }}
                    />
                  ),
                };
              }}
              selectionLabel="Selected flow"
              clearLabel="Clear selection"
              formatValue={formatBudget}
              describeNode={(id) =>
                (model.graph.nodes.find((n) => n.id === id)?.label ?? "") +
                ": " +
                formatBudget(sumRecords(model.nodeRows.get(id) ?? []))
              }
              describeLink={(source, target, value, within) =>
                (model.graph.nodes.find((n) => n.id === source)?.label ?? "") +
                " to " +
                (model.graph.nodes.find((n) => n.id === target)?.label ?? "") +
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
              renderDetails={(selection, compact, within) => (
                <SecretariatFlowDetails
                  within={within}
                  model={model}
                  dimensions={dimensions}
                  selection={selection}
                  compact={compact}
                  onEntity={openEntity}
                />
              )}
            />
          ) : (
            <p role="status" className="py-12">
              Loading flows…
            </p>
          )}
        </div>
      </ChartFrame>
      {selected && current && (
        <SecretariatEntitySidebar
          key={selected.code + current.meta.year}
          entity={selected}
          year={current.meta.year}
          source={current.meta.source}
          selectedPriority={null}
          selectionScope={`Sankey selection · ${current.meta.year} · ${dimensions.map((dimension) => SECRETARIAT_FLOW_DIMENSIONS[dimension].label).join(" → ")}`}
          showFundingBreakdown={choices.funding === "mechanism"}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
