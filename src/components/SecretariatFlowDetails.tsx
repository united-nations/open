"use client";
import { FinancialFlowBreakdown } from "./FinancialFlowBreakdown";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import type { SankeySelection } from "@un-eosg/ui/sankey";
import {
  SECRETARIAT_FLOW_DIMENSIONS,
  selectionRows,
  sumRecords,
  positiveRecords,
  type SecretariatFlowDimension,
  type SecretariatFlowModel,
  type SecretariatRecord,
} from "@/lib/secretariatFlows";
import { formatBudget } from "@/lib/entities";

export function SecretariatFlowDetails({
  model,
  dimensions,
  selection,
  compact,
  within,
  onEntity,
}: {
  model: SecretariatFlowModel;
  dimensions: readonly SecretariatFlowDimension[];
  selection: SankeySelection;
  compact: boolean;
  within?: SankeySelection;
  onEntity: (code: string, rows: SecretariatRecord[]) => void;
}) {
  const rows = selectionRows(model, selection, within);
  const label = (id: string) =>
    model.graph.nodes.find((node) => node.id === id)?.label;
  const title =
    selection.kind === "node"
      ? label(selection.id)
      : label(selection.source) + " → " + label(selection.target);
  if (compact) {
    return (
      <FinancialTooltip
        title={(within ? "Selected portion: " : "") + title}
        total={{
          label: "Net expenditure",
          value: formatBudget(sumRecords(rows)),
        }}
        rows={[
          {
            label: "Positive flows",
            value: formatBudget(positiveRecords(rows)),
          },
          {
            label: "Signed adjustments",
            value: formatBudget(sumRecords(rows) - positiveRecords(rows)),
          },
        ]}
        actionHint="Click to open details"
      />
    );
  }
  const selectedIds = new Set(rows.map((row) => row.id));
  return (
    <div className="space-y-3 text-sm">
      <FinancialFlowBreakdown
        heading="Expenditure and adjustments"
        limit={Infinity}
        rows={[
          {
            id: "positive",
            label: "Positive flows",
            amount: positiveRecords(rows),
          },
          {
            id: "adjustments",
            label: "Signed adjustments",
            amount: sumRecords(rows) - positiveRecords(rows),
            color: "var(--color-dusty-gray)",
          },
        ]}
      />
      {dimensions.includes("category") && (
        <p role="note" className="text-gray-600">
          Entity categories are preliminary.
        </p>
      )}
      {dimensions.map((dimension) => {
        const { column, heading } = SECRETARIAT_FLOW_DIMENSIONS[dimension];
        const breakdown = model.graph.nodes
          .filter((node) => node.column === column)
          .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
          .flatMap((node) => {
            const members = (model.nodeRows.get(node.id) ?? []).filter((row) =>
              selectedIds.has(row.id),
            );
            if (!members.length) return [];
            return [
              {
                id: node.id,
                label: node.label,
                amount: sumRecords(members),
                color: node.color,
                onClick:
                  dimension === "entity" && !node.isAggregate
                    ? () => onEntity(members[0].code, members)
                    : undefined,
              },
            ];
          });
        return (
          <FinancialFlowBreakdown
            key={dimension}
            heading={heading}
            limit={Infinity}
            rows={breakdown}
          />
        );
      })}
    </div>
  );
}
