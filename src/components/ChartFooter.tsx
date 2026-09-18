"use client";
import { ChartFooter as SharedChartFooter } from "@un-eosg/ui/components/chart-footer";
import { NegativeAmounts, type SignedAmount } from "./NegativeAmounts";
import type { ReactNode } from "react";
import { useChartSource } from "@/components/ChartSource";

export function ChartFooter({
  hint,
  details,
  sourceSuffix,
  signedAmounts,
}: {
  hint: string;
  details?: ReactNode;
  sourceSuffix?: string;
  signedAmounts?: SignedAmount[];
}) {
  const source = useChartSource();
  return (
    <SharedChartFooter
      hint={hint}
      sourceLabel={
        source
          ? `Source: ${source.label}${sourceSuffix ? " · " + sourceSuffix : ""}`
          : "Source: to be confirmed"
      }
      sourceDetails={
        <div className="space-y-4">
          {signedAmounts && <NegativeAmounts entries={signedAmounts} />}
          {details}
          {source?.details ?? (
            <p>Source information and methodology will appear here.</p>
          )}
        </div>
      }
    />
  );
}
