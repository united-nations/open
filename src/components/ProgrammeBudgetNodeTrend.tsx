"use client";

import { useEffect, useState } from "react";
import {
  FUNDING_SOURCE_TREND_SERIES,
  SidebarStackedTrend,
  type FinancingInstrumentDataPoint,
} from "@/components/SidebarStackedTrend";
import { budgetFundingPoint, formatChf } from "@/lib/budgetFunding";
import { budgetTrendSources } from "@/lib/budgetTrendSources";
import { loadYearData } from "@/lib/data";
import type { BudgetData, BudgetNode } from "@/types";

function matchBudgetNode(
  nodes: BudgetNode[],
  target: BudgetNode,
): BudgetNode | undefined {
  const exact = nodes.find((node) => node.id === target.id);
  if (exact) return exact;

  if (target.tier === "whole") {
    return nodes.find((node) => node.tier === "whole");
  }
  if (target.tier === "part" && target.code) {
    return nodes.find(
      (node) => node.tier === "part" && node.code === target.code,
    );
  }
  if (target.tier === "section" && target.code) {
    return nodes.find(
      (node) => node.tier === "section" && node.code === target.code,
    );
  }

  const entityId = target.entity?.id;
  if (entityId) {
    const sameTier = nodes.filter(
      (node) => node.entity?.id === entityId && node.tier === target.tier,
    );
    if (sameTier.length === 1) return sameTier[0];
    const sameParent = sameTier.find(
      (node) => node.parentId === target.parentId,
    );
    if (sameParent) return sameParent;
  }

  const acronym = target.entity?.acronym;
  if (acronym) {
    const sameAcronym = nodes.filter(
      (node) =>
        node.entity?.acronym === acronym &&
        node.tier === target.tier &&
        node.parentId === target.parentId,
    );
    if (sameAcronym.length === 1) return sameAcronym[0];
  }

  return undefined;
}

export function ProgrammeBudgetNodeTrend({
  node,
  dataset,
  years,
}: {
  node: BudgetNode;
  dataset: string;
  years: number[];
}) {
  const [data, setData] = useState<FinancingInstrumentDataPoint[] | null>(null);
  const [sourceFiles, setSourceFiles] = useState<
    Record<string, { file: BudgetData; node: BudgetNode }>
  >({});
  const yearKey = years.join(",");

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((year) =>
        loadYearData<BudgetData>(dataset, year)
          .then((file) => ({ year, file }))
          .catch(() => ({ year, file: null })),
      ),
    ).then((rows) => {
      if (!active) return;
      const sources: Record<string, { file: BudgetData; node: BudgetNode }> =
        {};
      setData(
        rows.flatMap(({ year, file }) => {
          if (!file) return [budgetFundingPoint(year)];
          const match = matchBudgetNode(file.nodes, node);
          if (!match) return [budgetFundingPoint(year)];
          sources[String(year)] = { file, node: match };
          return [budgetFundingPoint(year, match)];
        }),
      );
      setSourceFiles(sources);
    });
    return () => {
      active = false;
    };
    // years is represented by yearKey so the effect does not rerun on a new array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataset,
    node.id,
    node.entity?.id,
    node.entity?.acronym,
    node.tier,
    node.parentId,
    yearKey,
  ]);

  const hasChf = Object.values(sourceFiles).some((row) => row.node.chf);
  const usdData = hasChf
    ? (data?.map((point) => {
        const chf = sourceFiles[point.year]?.node.chf;
        const value = point.extrabudgetary;
        return chf && typeof value === "number"
          ? {
              ...point,
              extrabudgetary:
                Math.abs(value - chf.usdForLayout) < 0.005
                  ? null
                  : value - chf.usdForLayout,
            }
          : point;
      }) ?? null)
    : data;
  return (
    <>
      <SidebarStackedTrend
        key={`${dataset}-${node.id}`}
        tooltipSources={(year, keys) => {
          const row = sourceFiles[year];
          if (!row) return [];
          const metric =
            row.file.meta.measure === "approved" ||
            row.file.meta.measure === "proposed"
              ? row.file.meta.measure
              : "expenditure";
          return budgetTrendSources(
            row.file.nodes,
            row.node,
            metric,
            keys,
          ).filter((source) => !source.label?.includes("printed in CHF"));
        }}
        allowNegative
        showLegend={false}
        heading={hasChf ? "Funding reported in USD" : undefined}
        data={usdData}
        series={
          hasChf
            ? FUNDING_SOURCE_TREND_SERIES.filter((series) =>
                usdData?.some((point) => typeof point[series.key] === "number"),
              )
            : FUNDING_SOURCE_TREND_SERIES
        }
      />
      {hasChf && (
        <SidebarStackedTrend
          heading="Extrabudgetary resources (CHF)"
          data={
            data?.map((point) => ({
              year: point.year,
              extrabudgetary: sourceFiles[point.year]?.node.chf?.amount ?? null,
            })) ?? null
          }
          series={FUNDING_SOURCE_TREND_SERIES.filter(
            (series) => series.key === "extrabudgetary",
          )}
          valueFormatter={formatChf}
          currencyLabel="nominal Swiss francs"
          showLegend={false}
          allowNegative
          tooltipSources={(year) => {
            const source = sourceFiles[year]?.node.chf?.source;
            return source ? [source] : [];
          }}
        />
      )}
    </>
  );
}
