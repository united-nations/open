"use client";
import type { ReactNode } from "react";
import { FinancialFlowDiagram } from "./FinancialFlowDiagram";
import { getFlowDetails } from "@/lib/systemFlowDetails";
import { formatBudget } from "@/lib/entities";
import type { FlowGraph } from "@/lib/systemFlowLayout";

export function SystemFlowDiagram({
  graph,
  columnControls = [],
}: {
  graph: FlowGraph;
  columnControls?: readonly ReactNode[];
}) {
  const label = (id: string) => {
    const node = graph.nodes.find((n) => n.id === id)!;
    return node.fullLabel || node.label;
  };
  return (
    <FinancialFlowDiagram
      graph={graph}
      columnControls={columnControls}
      ariaLabel="Revenue into organizations and expenditure by destination. Organization left edges show revenue; right edges show expenditure."
      selectionLabel="Selected flow"
      clearLabel="Clear selection"
      formatValue={formatBudget}
      describeNode={(id) => {
        const details = getFlowDetails(graph, { kind: "node", id });
        return (
          label(id) +
          ": " +
          details?.totals
            .map((t) => t.label + " " + formatBudget(t.amount))
            .join(", ")
        );
      }}
      describeLink={(source, target, value) =>
        label(source) + " to " + label(target) + ": " + formatBudget(value)
      }
    />
  );
}
