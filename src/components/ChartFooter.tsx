"use client";
import { ChartFooter as SharedChartFooter } from "@un-eosg/ui/components/chart-footer";
import type { ReactNode } from "react";
import { useChartSource } from "@/components/ChartSource";

export function ChartFooter({
  hint,
  details,
  sourceSuffix,
}: {
  hint: string;
  details?: ReactNode;
  sourceSuffix?: string;
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
          {details}
          {source?.details ?? (
            <p>Source information and methodology will appear here.</p>
          )}
        </div>
      }
    />
  );
}
