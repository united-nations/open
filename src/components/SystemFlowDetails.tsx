"use client";
import Link from "next/link";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatBudget } from "@/lib/entities";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import type { FlowNode } from "@/lib/systemFlowLayout";
import type { getFlowDetails } from "@/lib/systemFlowDetails";
type Details = NonNullable<ReturnType<typeof getFlowDetails>>;

function DetailLink({ node, year }: { node: FlowNode; year: number }) {
  if (!node.detail) return null;
  const { kind, value } = node.detail;
  const route = {
    entity: "organizations",
    donor: "contributors",
    country: "locations",
    sdg: "goals",
    function: "goals",
  }[kind];
  const noun = {
    entity: "organization",
    donor: "contributor",
    country: "location",
    sdg: "goal",
    function: "function",
  }[kind];
  return (
    <Link
      className="text-sm underline underline-offset-2"
      href={`/system/${route}/?year=${year}#${kind}=${encodeURIComponent(value)}`}
      onClick={(event) => {
        if (
          kind === "entity" &&
          window.location.pathname
            .replace(/\/$/, "")
            .endsWith("/system/organizations") &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          const url = new URL(window.location.href);
          url.searchParams.set("year", String(year));
          window.history.replaceState(
            null,
            "",
            url.pathname + url.search + url.hash,
          );
          navigateToSidebar(kind, value);
        }
      }}
    >
      Open {noun} details
      {node.fullLabel || node.label ? `: ${node.fullLabel || node.label}` : ""}
    </Link>
  );
}
export function SystemFlowDetails({
  details,
  compact = false,
  year,
}: {
  details: Details;
  compact?: boolean;
  year: number;
}) {
  return (
    <div
      className={
        compact
          ? "space-y-3 text-sm"
          : "grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3"
      }
    >
      <FinancialTooltip
        title={details.title}
        parents={
          details.category
            ? [{ label: details.category, color: details.color }]
            : []
        }
        rows={details.totals.map((row) => ({
          label: row.label,
          value: formatBudget(row.amount),
        }))}
        notes={details.note}
      />
      {details.sections.map((section) => {
        const rows = section.rows.map((row) => ({
          label: row.label,
          value: formatBudget(row.amount),
          color: row.color,
          share: row.share,
        }));
        const limit = section.canonical ? rows.length : compact ? 3 : 6;
        return (
          <div key={section.label} className="space-y-1">
            <p className="font-semibold">
              {section.label}
              {rows.length > limit ? " · largest connections" : ""}
            </p>
            <FinancialTooltip rows={rows.slice(0, limit)} />
            {!compact && rows.length > limit && (
              <details>
                <summary className="cursor-pointer py-2">
                  Show all {rows.length} connections
                </summary>
                <FinancialTooltip rows={rows.slice(limit)} />
              </details>
            )}
          </div>
        );
      })}
      {details.adjustments.length > 0 && (
        <FinancialTooltip
          rows={details.adjustments.map((row) => ({
            label: row.label,
            value: formatBudget(row.amount),
          }))}
        />
      )}
      {details.percentages.length > 0 && (
        <FinancialTooltip
          rows={details.percentages.map((row) => ({
            label: row.label,
            value: `${(row.share * 100).toFixed(1)}%`,
          }))}
        />
      )}
      {compact ? (
        <FinancialTooltip actionHint="Click to pin details" />
      ) : (
        <div className="space-y-3 md:col-span-2 lg:col-span-3">
          <div className="flex flex-col items-start gap-2">
            {details.nodes.map((node) => (
              <DetailLink key={node.id} node={node} year={year} />
            ))}
          </div>
          {details.nodes
            .filter((node) => node.members?.length)
            .map((node) => (
              <details key={node.id}>
                <summary className="cursor-pointer font-semibold">
                  Show included items ({node.members!.length})
                </summary>
                <div className="mt-2 max-h-80 overflow-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="py-2 pr-3">Item</th>
                        {node.column !== 2 && (
                          <th className="p-2 text-right">
                            {node.column === 1 ? "Revenue" : "Funding"}
                          </th>
                        )}
                        {node.column !== 0 && (
                          <th className="p-2 text-right">Expenditure</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {[...node.members!]
                        .sort(
                          (a, b) =>
                            Math.max(b.revenue, b.spending) -
                            Math.max(a.revenue, a.spending),
                        )
                        .map((member) => (
                          <tr
                            key={member.node.id}
                            className="border-t border-gray-200"
                          >
                            <td className="py-2 pr-3">
                              <span>
                                {member.node.fullLabel || member.node.label}
                              </span>
                              {member.node.note && (
                                <p className="mt-1 text-xs">
                                  {member.node.note}
                                </p>
                              )}
                              <div>
                                <DetailLink node={member.node} year={year} />
                              </div>
                            </td>
                            {node.column !== 2 && (
                              <td className="p-2 text-right tabular-nums">
                                {formatBudget(member.revenue)}
                              </td>
                            )}
                            {node.column !== 0 && (
                              <td className="p-2 text-right tabular-nums">
                                {formatBudget(member.spending)}
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
        </div>
      )}
    </div>
  );
}
