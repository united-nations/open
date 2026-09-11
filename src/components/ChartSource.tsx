"use client";
import { createContext, useContext, type ReactNode } from "react";

interface ChartSource {
  label: string;
  details: ReactNode;
}
const ChartSourceContext = createContext<ChartSource | null>(null);
export function ChartSourceProvider({
  label,
  details,
  children,
}: ChartSource & { children: ReactNode }) {
  return (
    <ChartSourceContext.Provider value={{ label, details }}>
      {children}
    </ChartSourceContext.Provider>
  );
}
export function useChartSource() {
  return useContext(ChartSourceContext);
}
