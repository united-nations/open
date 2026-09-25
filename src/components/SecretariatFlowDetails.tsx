"use client";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import type { SankeySelection } from "@un-eosg/ui/sankey";
import {
  selectionRows,
  sumRecords,
  positiveRecords,
  type SecretariatFlowModel,
  type SecretariatRecord,
} from "@/lib/secretariatFlows";
import { formatBudget } from "@/lib/entities";

export function SecretariatFlowDetails({
  model,
  selection,
  compact,
  within,
  onEntity,
}: {
  model: SecretariatFlowModel;
  selection: SankeySelection;
  compact: boolean;
  within?: SankeySelection;
  onEntity: (code: string, rows: SecretariatRecord[]) => void;
}) {
  const rows = selectionRows(model, selection, within);
  const label = (id: string) =>
    model.graph.nodes.find((n) => n.id === id)?.label;
  const title =
    selection.kind === "node"
      ? label(selection.id)
      : label(selection.source) + " → " + label(selection.target);
  const entities = new Map<string, SecretariatRecord[]>();
  const arrangements = new Map<string, SecretariatRecord[]>();
  for (const row of rows) {
    entities.set(row.code, [...(entities.get(row.code) ?? []), row]);
    arrangements.set(row.arrangement.id, [
      ...(arrangements.get(row.arrangement.id) ?? []),
      row,
    ]);
  }
  const ordered = [...entities].sort(
    (a, b) => Math.abs(sumRecords(b[1])) - Math.abs(sumRecords(a[1])),
  );
  return (
    <div className="space-y-3 text-sm">
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
      />
      {!compact && (
        <ul className="space-y-1">
          {ordered.map(([code, members]) => (
            <li key={code} className="flex justify-between gap-4">
              <button
                className="text-start underline underline-offset-2"
                onClick={() => onEntity(code, members)}
              >
                {members[0].name} ({code})
              </button>
              <span className="whitespace-nowrap">
                {formatBudget(sumRecords(members))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <details>
          <summary className="cursor-pointer">
            All arrangements and source records ({rows.length})
          </summary>
          <div className="mt-3 space-y-3">
            {[...arrangements].map(([id, members]) => (
              <section key={id}>
                <h5 className="font-medium">
                  {members[0].arrangement.label}:{" "}
                  {formatBudget(sumRecords(members))}
                </h5>
                <p>
                  {members[0].arrangement.subtype.replaceAll("_", " ")} ·{" "}
                  {members[0].arrangement.evidence}
                </p>
                <ul className="mt-1 space-y-1">
                  {members.map((row) => (
                    <li key={row.id}>
                      {row.code} · {row.priority_area} · {row.financial_year} ·{" "}
                      {row.reference} · {row.note || row.source_type}:{" "}
                      {formatBudget(row.amount)}
                      <span className="block text-gray-600">
                        {row.group_basis}
                        {row.budget_reporting_identity &&
                          row.budget_reporting_identity.id !== row.entity_id &&
                          " · PPB " +
                            row.budget_reporting_identity.edition +
                            " reporting label: " +
                            row.budget_reporting_identity.name +
                            ". " +
                            row.budget_reporting_identity.qualification}
                        {row.budgetary_spm === null &&
                          " · Budgetary SPM membership has no named same-year evidence."}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
