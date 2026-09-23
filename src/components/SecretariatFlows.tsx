"use client";
import { useEffect, useMemo, useState } from "react";
import { SankeyDiagram } from "@un-eosg/ui/components/sankey-diagram";
import { FundingSourcePills, toggleFundingSource } from "./FundingSourcePills";
import { YearSlider } from "./YearSlider";
import { SecretariatFlowDetails } from "./SecretariatFlowDetails";
import { SecretariatEntitySidebar } from "./SecretariatEntitySidebar";
import { ChartFooter } from "./ChartFooter";
import { useYearRanges } from "@/lib/useYearRanges";
import { buildSecretariatFlows, selectedLinkValue, selectionRows, sumRecords, positiveRecords, type SecretariatRecord } from "@/lib/secretariatFlows";
import { BUDGET_FUNDING_SOURCES, type BudgetFundingSource } from "@/lib/budgetGroupings";
import { formatBudget } from "@/lib/entities";
import type { SecretariatOverviewData, SecretariatOverviewEntity } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export function SecretariatFlows() {
  const years = useYearRanges().secretariatOverview;
  const [year, setYear] = useState(years.default);
  const [data, setData] = useState<SecretariatOverviewData | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [funding, setFunding] = useState<BudgetFundingSource[]>([...BUDGET_FUNDING_SOURCES]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SecretariatOverviewEntity | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(basePath + "/data/secretariat-overview-" + year + ".json", { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error("Unable to load expenditure"); return r.json(); })
      .then((d: SecretariatOverviewData) => { setData(d); setError(""); })
      .catch((e: Error) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, [year]);
  const current = data?.meta.year === year ? data : null;
  const rows = useMemo(() => (current?.records ?? []).filter(r =>
    funding.includes(r.funding_source) && (r.code + " " + r.name).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ), [current, funding, query]);
  const model = useMemo(() => current ? buildSecretariatFlows(current, rows, expanded) : null, [current, rows, expanded]);
  const openEntity = (code: string, members: SecretariatRecord[]) => {
    const entity = current?.entities.find(e => e.code === code);
    if (!entity) return;
    const ids = new Set(members.map(r => r.id));
    const cells = entity.cells.map(cell => ({ ...cell, amount: sumRecords(members.filter(r => cell.record_ids.includes(r.id))),
      record_ids: cell.record_ids.filter(id => ids.has(id)) })).filter(c => c.record_ids.length);
    setSelected({ ...entity, cells, total: sumRecords(members) });
  };
  return <section id="secretariat-flows" className="mt-12 space-y-4">
    <h2 className="text-xl font-semibold">How does Secretariat funding reach priority areas?</h2>
    <p className="text-sm">Annual-report expenditure by funding arrangement, operational entity category and priority area. This chart has its own controls.</p>
    <YearSlider years={years.years} selectedYear={year} onChange={y => { setYear(y); setSelected(null); }} />
    <div className="flex flex-wrap items-center gap-4">
      <FundingSourcePills neutral selected={funding} onToggle={f => { setFunding(old => toggleFundingSource(old, f)); setSelected(null); }} />
      <label className="text-sm">Search entities <input className="ms-2 rounded border border-gray-300 px-3 py-2" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }} placeholder="Code or full name" /></label>
    </div>
    {current && model ? <>
      <p className="text-sm">Net expenditure ({year}): <strong>{formatBudget(sumRecords(rows))}</strong> · Positive flows: {formatBudget(positiveRecords(rows))} · Signed adjustments: {formatBudget(sumRecords(rows) - positiveRecords(rows))}</p>
      <fieldset className="flex flex-wrap gap-3 text-sm"><legend className="mb-2">Expand funding arrangements</legend>
        {Object.entries(current.meta.funding_families).filter(([family]) => rows.some(r => r.arrangement.family === family && r.arrangement.id !== family)).map(([family, label]) =>
          <label key={family} className="flex items-center gap-2"><input type="checkbox" checked={expanded.has(family)} onChange={() => setExpanded(old => {
            const next = new Set(old); if (next.has(family)) next.delete(family); else next.add(family); return next;
          })} />{label}</label>)}
      </fieldset>
      <SankeyDiagram graph={model.graph} columnControls={["Funding arrangement", "Entity category", "Priority area"]}
        ariaLabel="Annual-report expenditure from funding arrangements through entity categories to priority areas"
        selectionLabel="Selected expenditure" clearLabel="Clear selection" formatValue={formatBudget}
        describeNode={id => (model.graph.nodes.find(n => n.id === id)?.label ?? "") + ": " + formatBudget(sumRecords(model.nodeRows.get(id) ?? []))}
        describeLink={(source, target, value, within) => (model.graph.nodes.find(n => n.id === source)?.label ?? "") + " to " + (model.graph.nodes.find(n => n.id === target)?.label ?? "") + (within ? " selected portion: " : ": ") + formatBudget(within ? sumRecords(selectionRows(model, { kind: "edge", source, target }, within)) : value)}
        highlightedValue={(selection, source, target) => selectedLinkValue(model, selection, source, target)}
        renderDetails={(selection, compact, within) => <SecretariatFlowDetails within={within} model={model} selection={selection} compact={compact} onEntity={openEntity} />} />
      <ChartFooter hint="Select a node or connection to inspect its source records"
        details={<p>Ribbons show gross positive expenditure; signed corrections remain in net totals and source details. Expanded families replace their parent; further identified arrangements remain selectable together. Calendar and peacekeeping periods differ. IRMCT includes source-labelled budget substitutes. Staff Assessment follows the source allocation. Treaty financing retains the original Voluntary tag; the three unresolved convention rows retain their original wording.</p>} />
      {selected && <SecretariatEntitySidebar key={selected.code + year} entity={selected} year={year} source={current.meta.source} selectedPriority={null} selectionScope={"Sankey selection · " + year + " · current funding and entity filters"} onClose={() => setSelected(null)} />}
    </> : <p role="status">{error || "Loading expenditure…"}</p>}
  </section>;
}
