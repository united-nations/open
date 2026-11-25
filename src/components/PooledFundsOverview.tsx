"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { usePooledFunds } from "@/hooks/usePooledFunds";
import {
  useDeepLink,
  clearSidebarHash,
  navigateToSidebar,
} from "@/hooks/useDeepLink";
import { parsePooledFundHash, POOLED_FUND_METRICS } from "@/lib/pooledFunds";
import { YearSlider } from "@/components/YearSlider";
import { PooledFundsTreemap } from "@/components/PooledFundsTreemap";
import { PooledFundsTrendsChart } from "@/components/PooledFundsTrendsChart";
import { PooledFundsSidebar } from "@/components/PooledFundsSidebar";
import type { PooledFundMetric } from "@/types";

export function PooledFundsOverview() {
  const { value: data, error } = usePooledFunds();
  const [year, setYear] = useState<number | null>(null);
  const [metric, setMetric] = useState<PooledFundMetric>("deposits");
  const [search, setSearch] = useState("");
  const [typology, setTypology] = useState("all");
  const [pending, setPending] = useDeepLink({
    hashPrefix: "fund",
    onNavigateAway: (): void => setPending(null),
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const requested = new URLSearchParams(window.location.search).get("year");
      if (requested && /^\d{4}$/.test(requested)) setYear(Number(requested));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!data)
    return (
      <p role="status" className="min-h-96 py-12 text-sm text-gray-600">
        {error
          ? "Pooled fund data could not be loaded. Please reload to try again."
          : "Loading pooled funds…"}
      </p>
    );
  const selectedYear = year ?? data.meta.years.at(-1)!;
  const annual = data.annual.find((row) => row.year === selectedYear);
  const selected = pending ? parsePooledFundHash(pending) : null;
  const close = () => {
    setPending(null);
    clearSidebarHash();
  };
  const changeYear = (value: number) => {
    setYear(value);
    const url = new URL(window.location.href);
    url.searchParams.set("year", String(value));
    window.history.replaceState(null, "", url);
  };
  return (
    <>
      <div className="mb-3">
        <SegmentedControl
          label="Pooled fund measure"
          value={metric}
          onValueChange={(value) => setMetric(value as PooledFundMetric)}
          options={Object.entries(POOLED_FUND_METRICS).map(([value, item]) => ({
            value,
            label: item.shortLabel,
            description: item.note,
          }))}
        />
      </div>
      {annual ? (
        <PooledFundsTreemap
          data={data}
          annual={annual}
          metric={metric}
          search={search}
          onSearch={setSearch}
          typology={typology}
          onTypology={setTypology}
          onYear={changeYear}
          onFund={(id) => navigateToSidebar("fund", `${id}@${selectedYear}`)}
        />
      ) : (
        <div className="space-y-4 py-6">
          <p role="status">MPTF data is unavailable for {selectedYear}.</p>
          <YearSlider
            years={data.meta.years}
            selectedYear={selectedYear}
            onChange={changeYear}
          />
        </div>
      )}
      <p className="mt-3 text-sm text-gray-600">
        {POOLED_FUND_METRICS[metric].note} These measures are separate from CEB
        and Secretariat figures and must not be added to them.
      </p>
      <PooledFundsTrendsChart data={data} metric={metric} />
      {selected && data.funds[selected.id] && (
        <PooledFundsSidebar
          key={`${selected.id}@${selected.year ?? selectedYear}`}
          data={data}
          fundId={selected.id}
          initialYear={selected.year ?? selectedYear}
          onClose={close}
        />
      )}
      {selected && !data.funds[selected.id] && (
        <p role="status" className="mt-4 text-sm text-gray-600">
          This fund is not present in the MPTF source snapshots.
        </p>
      )}
    </>
  );
}
