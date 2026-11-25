"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { POOLED_FUND_METRICS } from "@/lib/pooledFunds";
import type { PooledFundMetric } from "@/types";

export function PooledFundsMetricHelp({
  metric,
}: {
  metric: PooledFundMetric;
}) {
  const definition = POOLED_FUND_METRICS[metric];
  return (
    <Tooltip content={definition.note} width={340} interactive>
      <button
        type="button"
        aria-label={`About ${definition.shortLabel.toLowerCase()}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-un-blue"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
