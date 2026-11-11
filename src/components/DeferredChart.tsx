"use client";

import type { ReactNode } from "react";
import { useNearViewport } from "@/hooks/useNearViewport";

export function DeferredChart({
  children,
  label,
  id,
}: {
  children: ReactNode;
  label: string;
  id?: string;
}) {
  const { ref, ready, activate } = useNearViewport();
  return (
    <div id={id} ref={ref} tabIndex={-1}>
      {ready ? (
        children
      ) : (
        <button
          type="button"
          onClick={activate}
          data-deferred-chart-trigger=""
          className="min-h-11 rounded-sm border border-gray-300 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-un-blue"
        >
          {label}
        </button>
      )}
    </div>
  );
}
