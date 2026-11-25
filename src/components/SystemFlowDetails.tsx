"use client";
import { formatPercent } from "@un-eosg/ui/format-budget";
import Link from "next/link";
import { FinancialFlowBreakdown } from "./FinancialFlowBreakdown";
import {
  FinancialPanelBreakdownRow,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatBudget } from "@/lib/entities";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import type { FlowNode } from "@/lib/systemFlowLayout";
import type { getFlowDetails } from "@/lib/systemFlowDetails";
type Details = NonNullable<ReturnType<typeof getFlowDetails>>;

function DetailLink({
  node,
  year,
  onNavigate,
}: {
  node: FlowNode;
  year: number;
  onNavigate?: () => void;
}) {
  if (!node.detail) return null;
  const { kind, value } = node.detail;
  const route = {
    entity: "organizations",
    donor: "contributors",
    country: "locations",
    sdg: "goals",
    function: "functions",
  }[kind];
  const noun =
    kind === "sdg" && (value === "0" || value === "-1")
      ? "expenditure group"
      : {
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
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        )
          onNavigate?.();
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
  onNavigate,
}: {
  details: Details;
  compact?: boolean;
  year: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      {compact ? (
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
      ) : (
        <>
          {details.note && <p>{details.note}</p>}
          {details.totals.length > 1 && (
            <FinancialFlowBreakdown
              heading="Revenue and expenditure"
              limit={Infinity}
              rows={details.totals.map((row) => ({
                id: row.label,
                ...row,
                color: details.color,
              }))}
            />
          )}
          {details.sections.map((section) => (
            <FinancialFlowBreakdown
              key={section.label}
              heading={section.label}
              limit={section.canonical ? Infinity : 8}
              rows={section.rows.map((row, index) => ({
                id: String(index),
                ...row,
              }))}
            />
          ))}
        </>
      )}
      {details.adjustments.length > 0 &&
        (compact ? (
          <FinancialTooltip
            rows={details.adjustments.map((row) => ({
              label: row.label,
              value: formatBudget(row.amount),
            }))}
          />
        ) : (
          <FinancialFlowBreakdown
            heading="Included signed adjustments"
            rows={details.adjustments.map((row) => ({ id: row.label, ...row }))}
          />
        ))}
      {details.percentages.length > 0 &&
        (compact ? (
          <FinancialTooltip
            rows={details.percentages.map((row) => ({
              label: row.label,
              value: formatPercent(row.share * 100),
            }))}
          />
        ) : (
          <FinancialPanelSection heading="Shares of reported totals">
            <div className="space-y-3">
              {details.percentages.map((row) => (
                <FinancialPanelBreakdownRow
                  key={row.label}
                  label={row.label}
                  value={formatPercent(row.share * 100)}
                  percent={row.share * 100}
                  color={details.color}
                />
              ))}
            </div>
          </FinancialPanelSection>
        ))}
      {compact ? (
        <FinancialTooltip actionHint="Click to open details" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col items-start gap-2">
            {details.nodes.map((node) => (
              <DetailLink
                key={node.id}
                node={node}
                year={year}
                onNavigate={onNavigate}
              />
            ))}
          </div>
          {details.nodes
            .filter((node) => node.members?.length)
            .map((node) => (
              <details key={node.id}>
                <summary className="cursor-pointer font-semibold">
                  Show included items ({node.members!.length})
                </summary>
                <div className="mt-2 space-y-3">
                  {[...node.members!]
                    .sort(
                      (a, b) =>
                        Math.max(b.revenue, b.spending) -
                        Math.max(a.revenue, a.spending),
                    )
                    .map((member) => (
                      <div key={member.node.id}>
                        <FinancialFlowBreakdown
                          heading={member.node.fullLabel || member.node.label}
                          rows={[
                            ...(node.column !== 2
                              ? [
                                  {
                                    id: "revenue",
                                    label: "Revenue",
                                    amount: member.revenue,
                                    color: member.node.color,
                                  },
                                ]
                              : []),
                            ...(node.column !== 0
                              ? [
                                  {
                                    id: "expenditure",
                                    label: "Expenditure",
                                    amount: member.spending,
                                    color: member.node.color,
                                  },
                                ]
                              : []),
                          ]}
                        />
                        {member.node.note && (
                          <p className="mt-1 text-xs">{member.node.note}</p>
                        )}
                        <DetailLink
                          node={member.node}
                          year={year}
                          onNavigate={onNavigate}
                        />
                      </div>
                    ))}
                </div>
              </details>
            ))}
        </div>
      )}
    </div>
  );
}
