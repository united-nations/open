"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { EntitiesTreemap } from "@/components/EntitiesTreemap";
import { PersonnelDashboard } from "@/components/PersonnelDashboard";
import { clearSidebarHash } from "@/hooks/useDeepLink";

export function OrganizationsOverview({ children }: { children: ReactNode }) {
  const [view, setView] = useState("financing");
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncView = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#personnel=")) setView("staff");
      if (hash.startsWith("#entity=")) setView("financing");
    };
    const frame = requestAnimationFrame(syncView);
    window.addEventListener("hashchange", syncView);
    window.addEventListener("popstate", syncView);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncView);
      window.removeEventListener("popstate", syncView);
    };
  }, []);

  const measureControl = (
    <div data-organization-measure>
      <BinaryToggle
        variant="segmented"
        label="Organization overview"
        options={[
          { value: "financing", label: "Financing" },
          { value: "staff", label: "Staff" },
        ]}
        value={view}
        onValueChange={(next) => {
          if (next === view) return;
          if (/^#(?:entity|personnel)=/.test(window.location.hash)) {
            clearSidebarHash();
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
          setView(next);
          requestAnimationFrame(() => {
            container.current
              ?.querySelector<HTMLInputElement>(
                ":scope > div:not([hidden]) [data-organization-measure] input:checked",
              )
              ?.focus({ preventScroll: true });
          });
        }}
      />
    </div>
  );
  return (
    <div ref={container}>
      <div hidden={view !== "financing"}>
        <EntitiesTreemap
          active={view === "financing"}
          overviewControl={measureControl}
        >
          {children}
        </EntitiesTreemap>
      </div>
      <div hidden={view !== "staff"}>
        <PersonnelDashboard
          active={view === "staff"}
          overviewControl={measureControl}
        />
      </div>
    </div>
  );
}
