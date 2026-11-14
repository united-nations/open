"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { YearSlider } from "@/components/YearSlider";
import { PersonnelTreemap } from "@/components/PersonnelTreemap";
import {
  PersonnelSidebar,
  type PersonnelDetail,
} from "@/components/PersonnelSidebar";
import { loadStaticData, loadYearData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import { useYearResource } from "@/hooks/useYearResource";
import {
  useDeepLink,
  replaceToSidebar,
  clearSidebarHash,
} from "@/hooks/useDeepLink";
import { formatPeople, type PersonnelData } from "@/lib/personnel";
import type { Entity } from "@/types";

function detailHash(detail: PersonnelDetail, year: number) {
  return `${detail.kind}|${detail.key}|${detail.scope}@${year}`;
}

export function PersonnelDashboard({
  active,
  overviewControl,
}: {
  active: boolean;
  overviewControl?: React.ReactNode;
}) {
  const years = useYearRanges().personnel;
  const [year, setYear] = useState(years.default);
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<PersonnelDetail | null>(null);
  const dashboard = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [previousData, setPreviousData] = useState<PersonnelData | null>(null);
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
  const loadMetadata = useCallback(
    () => loadStaticData<Entity[]>("entities.json"),
    [],
  );
  const { value: metadata } = useYearResource<Entity[] | null>(
    "personnel-metadata",
    null,
    false,
    loadMetadata,
    null,
  );
  const displayedData = data ?? previousData;
  const total = data?.total ?? null;
  const close = () => {
    setDetail(null);
    setPending(null);
    clearSidebarHash();
  };
  const open = (next: PersonnelDetail) => {
    if (!detail && document.activeElement instanceof HTMLElement)
      opener.current = document.activeElement;
    setDetail(next);
    replaceToSidebar("personnel", detailHash(next, year));
  };
  const restoreFocus = () => {
    const target = opener.current;
    if (target?.isConnected && !target.closest("[inert]"))
      target.focus({ preventScroll: true });
    else dashboard.current?.focus({ preventScroll: true });
    opener.current = null;
  };
  const changeYear = (next: number) => {
    if (next === year) return;
    setPreviousData(data ?? previousData);
    setYear(next);
    if (detail) replaceToSidebar("personnel", detailHash(detail, next));
  };
  useEffect(() => {
    if (!active || !pending) return;
    const frame = requestAnimationFrame(() => {
      const [target, linkedYear] = pending.split("@");
      const [kind, key, scope] = target.split("|");
      const nextYear = Number(linkedYear);
      if (
        !years.years.includes(nextYear) ||
        (kind !== "org" && kind !== "entity") ||
        !key ||
        !scope
      ) {
        clearSidebarHash();
        setDetail(null);
        setPending(null);
        return;
      }
      if (nextYear !== year) {
        setPreviousData(data ?? previousData);
        setYear(nextYear);
        return;
      }
      if (!data) return;
      const validScope =
        scope === "all" ||
        data.organizations.some((item) => item.org === scope);
      const valid =
        validScope &&
        (kind === "org"
          ? data.organizations.some((item) => item.org === key)
          : data.organizations
              .find((item) => item.sourceOrg === "UN")
              ?.entities.some((item) => item.entity === key) === true &&
            (scope === "all" || scope === "UN Secretariat"));
      if (valid) {
        setDetail({ kind, key, scope });
      } else {
        clearSidebarHash();
        setDetail(null);
      }
      setPending(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pending, setPending, data, previousData, active, year, years.years]);
  const yearControl = (
    <YearSlider years={years.years} selectedYear={year} onChange={changeYear} />
  );
  return (
    <div
      ref={dashboard}
      tabIndex={-1}
      className="space-y-12"
      style={{ overflowAnchor: "none" }}
      data-testid="personnel-dashboard"
    >
      {(!displayedData || loading || error) && (
        <div className="space-y-3">
          <ChartFrame
            header={
              <ChartHeader
                yearControl={yearControl}
                controls={overviewControl}
                summaries={[
                  {
                    key: "staff",
                    label: `Staff at 31 December ${year}`,
                    value:
                      total === null
                        ? error
                          ? "Unavailable"
                          : "Loading…"
                        : formatPeople(total),
                  },
                ]}
              />
            }
          >
            <span className="sr-only">Select the personnel snapshot year.</span>
          </ChartFrame>
        </div>
      )}
      {loading && !displayedData ? (
        <div
          role="status"
          className="flex min-h-96 items-center justify-center text-sm text-gray-600"
        >
          Loading CEB personnel data for {year}…
        </div>
      ) : error && !displayedData ? (
        <div role="alert" className="py-12 text-sm">
          Personnel data could not be loaded for {year}.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}
      {displayedData && (
        <div className="relative">
          {loading && (
            <div role="status" className="absolute inset-0 z-10 bg-white/70">
              <p className="sticky top-40 py-6 text-center text-sm text-gray-600">
                Loading CEB personnel data for {year}…
              </p>
            </div>
          )}
          {error && (
            <div role="alert" className="absolute inset-0 z-10 bg-white">
              <p className="sticky top-40 py-6 text-center text-sm text-gray-600">
                Personnel data could not be loaded for {year}.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Try again
                </button>
              </p>
            </div>
          )}
          <div
            className="space-y-12"
            style={{ visibility: error ? "hidden" : undefined }}
            inert={loading || error}
            aria-hidden={loading || error}
          >
            <PersonnelTreemap
              yearControl={yearControl}
              controls={overviewControl}
              data={displayedData}
              metadata={metadata ?? []}
              onOpen={(key) => open({ kind: "org", key, scope: "all" })}
              onOpenEntity={(key) =>
                open({ kind: "entity", key, scope: "all" })
              }
            />
          </div>
          {active && detail && (
            <PersonnelSidebar
              data={displayedData}
              selectedYear={year}
              loading={loading}
              error={error}
              onRetry={() => setRetry((value) => value + 1)}
              detail={detail}
              years={years.years}
              onYearChange={changeYear}
              onClose={close}
              onRestoreFocus={restoreFocus}
              onOpenSecretariat={() =>
                open({
                  kind: "org",
                  key: "UN Secretariat",
                  scope: detail.scope,
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
