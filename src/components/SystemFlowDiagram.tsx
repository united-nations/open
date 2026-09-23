"use client";
import type { ReactNode } from "react";
import { SankeyDiagram } from "@un-eosg/ui/components/sankey-diagram";
import { SystemFlowDetails } from "./SystemFlowDetails";
import { getFlowDetails } from "@/lib/systemFlowDetails";
import { formatBudget } from "@/lib/entities";
import type { FlowGraph } from "@/lib/systemFlowLayout";

export function SystemFlowDiagram({ graph, columnControls = [], year }: {
  graph: FlowGraph; year: number; columnControls?: readonly ReactNode[];
}) {
  const label = (id: string) => {
    const node = graph.nodes.find(n => n.id === id)!;
    return node.fullLabel || node.label;
  };
  return <SankeyDiagram graph={graph} columnControls={columnControls}
    ariaLabel="Funding into organizations and expenditure by destination. Organization left edges show revenue; right edges show expenditure."
    selectionLabel="Selected flow" clearLabel="Clear selection" formatValue={formatBudget}
    describeNode={id => {
      const details = getFlowDetails(graph, { kind: "node", id });
      return label(id) + ": " + details?.totals.map(t => t.label + " " + formatBudget(t.amount)).join(", ");
    }}
    describeLink={(source, target, value) => label(source) + " to " + label(target) + ": " + formatBudget(value)}
    renderDetails={(selection, compact) => {
      const details = getFlowDetails(graph, selection);
      return details ? <SystemFlowDetails details={details} compact={compact} year={year} /> : null;
    }} />;
}
