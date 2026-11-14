"use client";

import { useEffect, useRef, useState } from "react";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { CountryMap } from "@/components/CountryMap";
import { LocationStaffMap } from "@/components/LocationStaffMap";
import {
  LocationViewControl,
  type LocationView,
} from "@/components/LocationViewControl";
import { clearSidebarHash } from "@/hooks/useDeepLink";
import { loadStaticData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import type { Entity } from "@/types";

const emptyMetadata: Entity[] = [];

export function LocationsMap() {
  const [measure, setMeasure] = useState<"expenditure" | "staff">(
    "expenditure",
  );
  const [metadata, setMetadata] = useState<Entity[] | null>(null);
  const [expenditureOrg, setExpenditureOrg] = useState("all");
  const [staffOrg, setStaffOrg] = useState("all");
  const [view, setView] = useState<LocationView>("map");
  const [expenditureQuery, setExpenditureQuery] = useState("");
  const [staffQuery, setStaffQuery] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const yearRanges = useYearRanges();
  const [expenditureYear, setExpenditureYear] = useState(
    yearRanges.geographicExpenses.default,
  );
  const [staffYear, setStaffYear] = useState(yearRanges.personnel.default);

  useEffect(() => {
    let active = true;
    loadStaticData<Entity[]>("entities.json").then(
      (entities) => {
        if (active) setMetadata(entities);
      },
      () => {
        if (active) setMetadata(emptyMetadata);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const restoreMeasure = () => {
      const hash = window.location.hash;
      if (/^#personnel=duty(?:%7c|\|)/i.test(hash)) setMeasure("staff");
      if (hash.startsWith("#country=")) setMeasure("expenditure");
    };
    const frame = requestAnimationFrame(restoreMeasure);
    window.addEventListener("hashchange", restoreMeasure);
    window.addEventListener("popstate", restoreMeasure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", restoreMeasure);
      window.removeEventListener("popstate", restoreMeasure);
    };
  }, []);

  const controls = (
    <>
      <div data-location-measure>
        <BinaryToggle
          label="Location measure"
          variant="segmented"
          options={[
            { value: "expenditure", label: "Expenditure" },
            { value: "staff", label: "Staff" },
          ]}
          value={measure}
          onValueChange={(value) => {
            const next = value === "staff" ? "staff" : "expenditure";
            if (next === measure) return;
            const hash = window.location.hash;
            if (hash.startsWith("#personnel=") || hash.startsWith("#country="))
              clearSidebarHash();
            window.dispatchEvent(new HashChangeEvent("hashchange"));
            setMeasure(next);
            requestAnimationFrame(() => {
              container.current
                ?.querySelector<HTMLInputElement>(
                  ":scope > div:not([hidden]) [data-location-measure] input:checked",
                )
                ?.focus({ preventScroll: true });
            });
          }}
        />
      </div>
      <LocationViewControl view={view} onViewChange={setView} />
    </>
  );

  return (
    <div ref={container}>
      <div hidden={measure !== "expenditure"}>
        <CountryMap
          active={measure === "expenditure"}
          controls={controls}
          view={view}
          searchQuery={expenditureQuery}
          setSearchQuery={setExpenditureQuery}
          entityMetadata={metadata ?? emptyMetadata}
          entityFilter={expenditureOrg}
          setEntityFilter={setExpenditureOrg}
          selectedYear={expenditureYear}
          setSelectedYear={setExpenditureYear}
        />
      </div>
      <div hidden={measure !== "staff"}>
        <LocationStaffMap
          active={measure === "staff"}
          controls={controls}
          view={view}
          query={staffQuery}
          onQueryChange={setStaffQuery}
          metadata={metadata}
          year={staffYear}
          onYearChange={setStaffYear}
          organization={staffOrg}
          onOrganizationChange={setStaffOrg}
        />
      </div>
    </div>
  );
}
