"use client";

import { useEffect, useRef, useState } from "react";
import {
  GroupedTreemap,
  type GroupedTreemapRow,
} from "@un-eosg/ui/components/grouped-treemap";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { ChartHeading } from "@/components/ContentHeading";
import { ChartFooter } from "@/components/ChartFooter";
import { PersonnelScaleLegend } from "@/components/PersonnelScaleLegend";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import {
  createUncategorizedEntity,
  normalizeEntityForDisplay,
} from "@/lib/entities";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { formatPeople, type PersonnelData } from "@/lib/personnel";
import type { Entity } from "@/types";

type PersonnelTile = {
  key: string;
  label: string;
  org: string;
  entity?: string;
  count: number;
  search: string;
};
export function PersonnelTreemap({
  data,
  metadata,
  org,
  onOpen,
  onOpenEntity,
  yearControl,
  organizationControl,
}: {
  data: PersonnelData;
  metadata: Entity[];
  org: string;
  onOpen: (org: string) => void;
  onOpenEntity: (entity: string) => void;
  yearControl: React.ReactNode;
  organizationControl: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const container = useRef<HTMLElement>(null);
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const plot = container.current?.querySelector(".personnel-treemap-plot");
    if (!plot) return;
    const observer = new ResizeObserver(([entry]) => {
      setPlotSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);
  const organizations = data.organizations.filter(
    (item) => org === "all" || item.org === org,
  );
  const available = organizations.length > 0;
  const entityFor = (code: string) =>
    normalizeEntityForDisplay(
      metadata.find((item) => item.entity === code) ??
        createUncategorizedEntity(code),
    );
  const groups = new Map<string, PersonnelTile[]>();
  const tiles: PersonnelTile[] = [];
  const add = (group: string, tile: PersonnelTile) => {
    groups.set(group, [...(groups.get(group) ?? []), tile]);
    tiles.push(tile);
  };
  for (const item of organizations) {
    const meta = entityFor(item.org);
    if (item.sourceOrg === "UN") {
      for (const child of item.entities) {
        add(meta.system_grouping, {
          key: `UN:${child.entity}`,
          label: child.entity === "NA" ? "Entity not reported" : child.entity,
          org: item.org,
          entity: child.entity,
          count: child.count,
          search: `${child.entity} ${item.org}`,
        });
      }
    } else {
      add(meta.system_grouping, {
        key: item.org,
        label: item.org,
        org: item.org,
        count: item.total,
        search: `${item.org} ${meta.entity_long}`,
      });
    }
  }
  const matches = (tile: PersonnelTile) =>
    tile.search.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const rows: GroupedTreemapRow<string, string, PersonnelTile>[] = [
    ...groups.entries(),
  ]
    .sort(
      ([a], [b]) =>
        getSystemGroupingStyle(a).order - getSystemGroupingStyle(b).order ||
        a.localeCompare(b),
    )
    .map(([group, members]) => {
      const style = getSystemGroupingStyle(group);
      return {
        key: group,
        label: style.label,
        color: style.hexColor,
        data: group,
        subgroups: [
          {
            key: "Organizations",
            label: "Organizations",
            data: "Organizations",
            labelVisibility: "tooltip-only",
            leaves: members
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((item) => ({
                key: item.key,
                label: item.label,
                value: item.count,
                data: item,
                color: style.hexColor,
                paleFill: style.textColor === "text-black",
                textColor:
                  style.textColor === "text-black"
                    ? "var(--color-un-black)"
                    : "var(--color-un-white)",
                onActivate: () =>
                  item.entity !== undefined
                    ? onOpenEntity(item.entity)
                    : onOpen(item.org),
              })),
          },
        ],
      };
    });
  const matchingTotal = tiles
    .filter(matches)
    .reduce((sum, item) => sum + item.count, 0);
  const secretariat = organizations.find((item) => item.sourceOrg === "UN");
  return (
    <section ref={container} className="space-y-4" id="personnel-organizations">
      <ChartHeading>People across the UN System</ChartHeading>
      <GroupedTreemap<string, string, PersonnelTile>
        yearControl={yearControl}
        controls={organizationControl}
        rows={rows}
        plotClassName={`${SYSTEM_TREEMAP_HEIGHT_CLASS} personnel-treemap-plot`}
        layout={{ rowGap: 0, subgroupGap: 0, leafGap: 0 }}
        totalLabel="Staff"
        showLeafValues
        formatValue={formatPeople}
        formatAccessibleValue={(value) => `${formatPeople(value)} staff`}
        search={{
          value: query,
          onChange: setQuery,
          label: "Search organizations and UN entities",
          placeholder: "Search organizations or entities…",
          predicate: (label, _subgroup, _row, search) =>
            tiles.some(
              (tile) =>
                tile.label === label &&
                tile.search
                  .toLocaleLowerCase()
                  .includes(search.trim().toLocaleLowerCase()),
            ),
        }}
        summaries={[
          {
            key: "staff",
            label: query.trim()
              ? "Matching staff"
              : `Staff at 31 December ${data.year}`,
            value: available ? formatPeople(matchingTotal) : "Unavailable",
          },
        ]}
        emptyContent={
          <p
            role="status"
            className="flex h-full items-center justify-center text-sm text-gray-600"
          >
            {!available
              ? `${org === "all" ? "Personnel data is" : `${org} personnel data is`} unavailable for ${data.year}.`
              : query.trim()
                ? "No organizations or UN entities match this search."
                : "No staff are recorded for this selection."}
          </p>
        }
        footer={
          available && matchingTotal > 0 ? (
            <>
              <ChartFooter hint="Click on an organization, department or mission to explore its personnel" />
              <details
                className="mt-3 text-xs text-gray-600"
                data-personnel-scale-expander
              >
                <summary className="w-fit cursor-pointer underline underline-offset-2">
                  Understand the people scale
                </summary>
                <PersonnelScaleLegend
                  total={matchingTotal}
                  plotWidth={plotSize.width}
                  plotHeight={plotSize.height}
                />
              </details>
            </>
          ) : undefined
        }
        renderTooltip={({ leaf, row }) => (
          <FinancialTooltip
            title={leaf.label}
            parents={[{ label: row.label }]}
            total={{ label: "Staff", value: formatPeople(leaf.value) }}
            rows={[
              {
                label: "Share of chart",
                value:
                  matchingTotal > 0
                    ? `${((100 * leaf.value) / matchingTotal).toFixed(1)}%`
                    : "Unavailable",
              },
            ]}
          />
        )}
      />
      <p className="max-w-3xl text-sm text-gray-600">
        {secretariat && (
          <button
            type="button"
            className="underline underline-offset-2 hover:text-un-blue"
            onClick={() => onOpen(secretariat.org)}
          >
            Explore UN Secretariat details
          </button>
        )}
      </p>
    </section>
  );
}
