"use client";
import { formatPercent } from "@un-eosg/ui/format-budget";

import { useState } from "react";
import {
  GroupedTreemap,
  type GroupedTreemapRow,
} from "@un-eosg/ui/components/grouped-treemap";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
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
  onOpen,
  onOpenEntity,
  yearControl,
  controls,
}: {
  data: PersonnelData;
  metadata: Entity[];
  onOpen: (org: string) => void;
  onOpenEntity: (entity: string) => void;
  yearControl: React.ReactNode;
  controls?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const organizations = data.organizations;
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
    <section
      aria-label="Staff by organization"
      className="space-y-3"
      id="personnel-organizations"
    >
      <GroupedTreemap<string, string, PersonnelTile>
        yearControl={yearControl}
        leadingControls={controls}
        rows={rows}
        plotClassName={SYSTEM_TREEMAP_HEIGHT_CLASS}
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
              ? `Personnel data is unavailable for ${data.year}.`
              : query.trim()
                ? "No organizations or UN entities match this search."
                : "No staff are recorded for this selection."}
          </p>
        }
        renderTooltip={({ leaf, row }) => (
          <FinancialTooltip
            title={leaf.label}
            actionHint="Click to explore personnel"
            parents={[{ label: row.label }]}
            total={{ label: "Staff", value: formatPeople(leaf.value) }}
            rows={[
              {
                label: "Share of chart",
                value:
                  matchingTotal > 0
                    ? formatPercent((100 * leaf.value) / matchingTotal)
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
