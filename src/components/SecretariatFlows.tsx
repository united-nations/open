"use client";

import { useEffect, useMemo, useState } from "react";
import { SankeyDiagram } from "@un-eosg/ui/components/sankey-diagram";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { YearSlider } from "./YearSlider";
import { SecretariatFlowDetails } from "./SecretariatFlowDetails";
import { SecretariatEntitySidebar } from "./SecretariatEntitySidebar";
import { ChartFooter } from "./ChartFooter";
import { DelayedChartLoading } from "./DelayedChartLoading";
import { useYearRanges } from "@/lib/useYearRanges";
import {
  buildSecretariatFlows,
  buildSecretariatFundingFlows,
  selectedLinkValue,
  selectionRows,
  sumRecords,
  positiveRecords,
  type SecretariatRecord,
} from "@/lib/secretariatFlows";
import { formatBudget } from "@/lib/entities";
import type {
  SecretariatOverviewData,
  SecretariatOverviewEntity,
} from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export function SecretariatFlows({
  view = "arrangements",
}: {
  view?: "arrangements" | "mechanisms";
}) {
  const mechanisms = view === "mechanisms";
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
    () =>
      current
        ? mechanisms
          ? buildSecretariatFundingFlows(current)
          : buildSecretariatFlows(
              current,
              current.records,
              new Set(["unitemized"]),
              Infinity,
            )
        : null,
    [current, mechanisms],
  );
  const total = current ? sumRecords(current.records) : 0;
  const positive = current ? positiveRecords(current.records) : 0;
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
      id={mechanisms ? "secretariat-funding-flows" : "secretariat-flows"}
      className="mt-12 space-y-4"
    >
      <h2 className="text-2xl font-bold">
        {mechanisms
          ? "Funding mechanisms and priority areas"
          : "Financial flows"}
      </h2>
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
          <ChartFooter
            hint="Hover for amounts; click a bar or connection to pin details."
            details={
              <div className="space-y-2">
                {current && (
                  <p>
                    Net expenditure ({current.meta.year}): {formatBudget(total)}
                    . Positive flows: {formatBudget(positive)}. Signed
                    adjustments: {formatBudget(total - positive)}.
                  </p>
                )}
                <p>
                  {mechanisms
                    ? "Annual-report expenditure by funding mechanism and priority area."
                    : "Annual-report expenditure by funding arrangement, entity category and priority area."}{" "}
                  All funding sources are included. Ribbons show gross positive
                  expenditure; signed corrections remain in net totals and
                  source details.
                </p>
                {!mechanisms && (
                  <p>
                    Unitemized extrabudgetary resources are shown by reporting
                    entity. These remain unitemized amounts, not identified
                    trust funds. Expansion preserves every source record and the
                    total. Trust funds are shown together.
                  </p>
                )}
                <p>
                  Calendar and peacekeeping periods differ. IRMCT includes
                  source-labelled budget substitutes. Staff Assessment follows
                  the source allocation. Treaty financing retains the original
                  Voluntary tag; unresolved convention rows retain their
                  original wording.
                </p>
              </div>
            }
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
            <SankeyDiagram
              graph={model.graph}
              linkOpacity={mechanisms ? 1 : undefined}
              linkGap={mechanisms ? 12 : undefined}
              endLabelWidth={mechanisms ? 480 : undefined}
              columnControls={
                mechanisms
                  ? ["Funding mechanisms", "Priority areas"]
                  : ["Funding arrangement", "Entity category", "Priority area"]
              }
              ariaLabel={
                mechanisms
                  ? "Annual-report expenditure from funding mechanisms to priority areas"
                  : "Annual-report expenditure from funding arrangements through entity categories to priority areas"
              }
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
          selectionScope={`Sankey selection · ${current.meta.year} · all funding sources`}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
