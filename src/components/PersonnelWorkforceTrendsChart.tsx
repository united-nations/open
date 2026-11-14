"use client";

import { useState } from "react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeading } from "@/components/ContentHeading";
import { FinancialFlowColumnSelect } from "@/components/FinancialFlowColumnSelect";
import {
  OrganizationHierarchySelect,
  organizationHierarchyGroups,
} from "@/components/OrganizationHierarchySelect";
import { PersonnelCompositionTrendsPlot } from "@/components/PersonnelCompositionTrendsChart";
import { PersonnelTrendsPlot } from "@/components/PersonnelTrendsChart";
import { usePersonnelTrends } from "@/hooks/usePersonnelTrends";
import { useYearResource } from "@/hooks/useYearResource";
import { loadStaticData } from "@/lib/data";
import type { PersonnelCompositionTrendKind } from "@/lib/personnel";
import type { Entity } from "@/types";

type WorkforceView = "overall" | PersonnelCompositionTrendKind;

const VIEWS = [
  { value: "overall", label: "Overall" },
  { value: "gender", label: "Gender" },
  { value: "age", label: "Age" },
  { value: "tenure", label: "Length of service" },
] as const satisfies readonly { value: WorkforceView; label: string }[];

const emptyMetadata: Entity[] = [];
const loadMetadata = () => loadStaticData<Entity[]>("entities.json");

const VIEW_DESCRIPTIONS: Record<WorkforceView, string> = {
  overall: "Headcount of reported staff at 31 December each year.",
  gender:
    "Shares of reported staff at 31 December each year, including staff whose sex was unreported.",
  age: "System-wide shares of reported staff by age group at 31 December each year, including staff whose age was unreported.",
  tenure:
    "System-wide shares of reported staff by length of service at 31 December each year, including staff whose length of service was unreported.",
};

export function PersonnelWorkforceTrendsChart() {
  const [view, setView] = useState<WorkforceView>("overall");
  const [org, setOrg] = useState("all");
  const trends = usePersonnelTrends();
  const supportsOrganization = view === "overall" || view === "gender";
  const { value: metadata, loading: loadingMetadata } = useYearResource(
    "workforce-organization-metadata",
    emptyMetadata,
    false,
    loadMetadata,
    emptyMetadata,
  );
  const groups = organizationHierarchyGroups(trends.organizations, metadata);
  const group = groups.find(({ id }) => id === org);
  const scope = supportsOrganization ? (group?.children ?? org) : "all";
  const population = supportsOrganization
    ? (group?.label ?? (org === "all" ? "all reporting organizations" : org))
    : "System-wide";

  return (
    <section
      id="workforce-trends"
      aria-labelledby="workforce-trends-heading"
      className="min-w-0 space-y-3"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ChartHeading id="workforce-trends-heading">
          Workforce trends
        </ChartHeading>
        <FinancialFlowColumnSelect
          compact
          label="Workforce trend view"
          value={view}
          options={VIEWS}
          onChange={(value) => {
            const option = VIEWS.find((option) => option.value === value);
            if (option) setView(option.value);
          }}
        />
        {supportsOrganization && !loadingMetadata && (
          <OrganizationHierarchySelect
            allLabel="All organizations"
            groups={groups}
            selected={org}
            onChange={setOrg}
          />
        )}
      </div>
      <p className="text-sm text-gray-600">{VIEW_DESCRIPTIONS[view]}</p>
      {supportsOrganization && group && (
        <p className="text-sm text-gray-600">
          Each year includes staff from organizations in this group with
          reported data.
        </p>
      )}
      <ChartFrame>
        {view === "overall" ? (
          <PersonnelTrendsPlot
            trends={trends}
            scope={scope}
            population={population}
          />
        ) : (
          <PersonnelCompositionTrendsPlot
            kind={view}
            trends={trends}
            scope={scope}
            population={population}
          />
        )}
      </ChartFrame>
    </section>
  );
}
