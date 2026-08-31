"use client";

import { useEffect, useState } from "react";
import {
  FUNDING_SOURCE_TREND_SERIES,
  SidebarStackedTrend,
  type FinancingInstrumentDataPoint,
} from "@/components/SidebarStackedTrend";
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

function fundingPoint(year: number, node: BudgetNode): FinancingInstrumentDataPoint {
  return {
    year: String(year),
    regular_budget: node.values?.regular_budget ?? 0,
    other_assessed: node.values?.other_assessed ?? 0,
    extrabudgetary: node.values?.extrabudgetary ?? 0,
  };
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
      setData(
        rows.flatMap(({ year, file }) => {
          if (!file) return [];
          const match = matchBudgetNode(file.nodes, node);
          if (!match) return [];
          return [fundingPoint(year, match)];
        }),
      );
    });
    return () => {
      active = false;
    };
    // years is represented by yearKey so the effect does not rerun on a new array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, node.id, node.entity?.id, node.entity?.acronym, node.tier, node.parentId, yearKey]);

  return (
    <SidebarStackedTrend
      heading="Trend by funding source"
      headingClassName="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase"
      data={data}
      series={FUNDING_SOURCE_TREND_SERIES}
    />
  );
}
