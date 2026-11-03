"use client";
import { createContext, useContext, type ReactNode } from "react";

interface ChartSource {
  label: string;
  details: ReactNode;
  placement?: "chart" | "page";
  pageDetailsTargetId?: string;
}
const ChartSourceContext = createContext<ChartSource | null>(null);
export function ChartSourceProvider({
  label,
  details,
  placement = "chart",
  pageDetailsTargetId = "page-chart-source-notes",
  children,
}: ChartSource & { children: ReactNode }) {
  return (
    <ChartSourceContext.Provider
      value={{ label, details, placement, pageDetailsTargetId }}
    >
      {children}
    </ChartSourceContext.Provider>
  );
}
export function useChartSource() {
  return useContext(ChartSourceContext);
}
