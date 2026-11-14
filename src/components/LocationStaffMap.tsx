"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PersonnelMap } from "@/components/PersonnelMap";
import type { LocationView } from "@/components/LocationViewControl";
import {
  PersonnelSidebar,
  type PersonnelDetail,
} from "@/components/PersonnelSidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  OrganizationHierarchySelect,
  organizationHierarchyGroups,
} from "@/components/OrganizationHierarchySelect";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { useYearResource } from "@/hooks/useYearResource";
import { loadYearData } from "@/lib/data";
import type { PersonnelData } from "@/lib/personnel";
import { useYearRanges } from "@/lib/useYearRanges";
import type { Entity } from "@/types";

export function LocationStaffMap({
  active,
  controls,
  view,
  query,
  onQueryChange,
  metadata,
  year,
  onYearChange,
  organization,
  onOrganizationChange,
}: {
  active: boolean;
  controls: ReactNode;
  view: LocationView;
  query: string;
  onQueryChange: (value: string) => void;
  metadata: Entity[] | null;
  year: number;
  onYearChange: (year: number) => void;
  organization: string;
  onOrganizationChange: (value: string) => void;
}) {
  const { years } = useYearRanges().personnel;
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<{
    selection: PersonnelDetail;
    initialData: PersonnelData;
  } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "personnel",
    onNavigateAway: () => setDetail(null),
  });
  const load = useCallback(
    () => loadYearData<PersonnelData>("personnel", year),
    [year],
  );
  const {
    value: data,
    loading,
    error,
  } = useYearResource<PersonnelData | null>(
    `${year}-${retry}`,
    null,
    false,
    load,
    null,
  );
  const groupData = data ?? detail?.initialData;
  const groups = useMemo(
    () =>
      organizationHierarchyGroups(
        groupData?.dutyStations.map(({ org }) => org) ?? [],
        metadata ?? [],
      ),
    [groupData, metadata],
  );
  const group = groups.find(({ id }) => id === organization);
  const organizationCodes = group?.children;

  useEffect(() => {
    if (!active || !pending) return;
    const frame = requestAnimationFrame(() => {
      const [kind, key, scopeAndYear] = pending.split("|");
      const [scope, rawYear] = scopeAndYear?.split("@") ?? [];
      const requestedYear = Number(rawYear);
      if (kind === "duty" && key && scope && years.includes(requestedYear)) {
        if (year !== requestedYear) {
          onYearChange(requestedYear);
          return;
        }
        if (!data || metadata === null) return;
        // A shared link can point to a year where this scope has no records.
        // Keep the sidebar available to explain the missing coverage.
        onOrganizationChange(scope);
        setDetail({
          selection: { kind: "duty", key, scope },
          initialData: data,
        });
        setPending(null);
        return;
      }
      setDetail(null);
      setPending(null);
      clearSidebarHash();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    active,
    data,
    metadata,
    onOrganizationChange,
    onYearChange,
    pending,
    setPending,
    year,
    years,
  ]);

  const close = () => {
    setDetail(null);
    setPending(null);
    clearSidebarHash();
  };
  const changeYear = (next: number) => {
    onYearChange(next);
    if (detail)
      replaceToSidebar(
        "personnel",
        `duty|${detail.selection.key}|${detail.selection.scope}@${next}`,
      );
  };
  const retryLoad = () => setRetry((value) => value + 1);
  const yearControl = (
    <YearSlider years={years} selectedYear={year} onChange={changeYear} />
  );
  const organizationControl = (
    <OrganizationHierarchySelect
      allLabel="All organizations"
      groups={groups}
      selected={organization}
      onChange={onOrganizationChange}
    />
  );

  return (
    <div ref={container} className="space-y-3">
      <PersonnelMap
        data={data && metadata !== null ? data : null}
        year={year}
        loadError={error}
        onRetry={retryLoad}
        org={organization}
        controls={controls}
        view={view}
        query={query}
        onQueryChange={onQueryChange}
        organizationCodes={organizationCodes}
        organizationControl={organizationControl}
        yearControl={yearControl}
        onOpen={(key) => {
          if (!data) return;
          if (document.activeElement instanceof HTMLElement)
            opener.current = document.activeElement;
          setDetail({
            selection: { kind: "duty", key, scope: organization },
            initialData: data,
          });
          replaceToSidebar("personnel", `duty|${key}|${organization}@${year}`);
        }}
      />
      {active && detail && (
        <PersonnelSidebar
          data={data ?? detail.initialData}
          selectedYear={year}
          loading={loading}
          error={error}
          onRetry={retryLoad}
          detail={detail.selection}
          organizationCodes={organizationCodes}
          scopeLabel={
            group?.label ??
            (organization.startsWith("group:")
              ? organization.slice("group:".length)
              : undefined)
          }
          years={years}
          onYearChange={changeYear}
          onClose={close}
          onRestoreFocus={() => {
            const target = opener.current?.isConnected
              ? opener.current
              : container.current?.querySelector<HTMLElement>("button");
            target?.focus({ preventScroll: true });
            opener.current = null;
          }}
        />
      )}
    </div>
  );
}
