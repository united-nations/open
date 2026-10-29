"use client";
import { useId } from "react";
import {
  ADJUSTED_UNITS,
  CPI_SOURCE_URL,
  type MoneyBasis,
} from "@/lib/moneyBasis";

export function MoneyBasisControl({
  basis,
  onChange,
  missingPeriods = [],
}: {
  basis: MoneyBasis;
  onChange: (basis: MoneyBasis) => void;
  missingPeriods?: readonly string[];
}) {
  const id = useId();
  return (
    <div className="mb-2 space-y-1" data-money-basis={basis}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Money values"
          aria-describedby={basis === "adjusted" ? id : undefined}
          className="max-w-full cursor-pointer rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
          value={basis}
          onChange={(event) =>
            onChange(event.target.value === "adjusted" ? "adjusted" : "nominal")
          }
        >
          <option value="nominal">Nominal USD</option>
          <option value="adjusted">Adjusted USD</option>
        </select>
        {basis === "adjusted" && (
          <a
            id={id}
            href={CPI_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 underline decoration-dotted underline-offset-2"
            title="US consumer purchasing-power proxy, not a UN operating-cost index. Published annual CPI-U averages; fiscal cycles use the mean of the two calendar-year indices. The 2025 average excludes October, when survey data were not collected."
          >
            {ADJUSTED_UNITS}
          </a>
        )}
      </div>
      {basis === "adjusted" && missingPeriods.length > 0 && (
        <p role="status" className="text-xs text-gray-500">
          Adjustment unavailable for {missingPeriods.join(", ")}: no published
          annual US CPI. Those values appear as gaps.
        </p>
      )}
    </div>
  );
}
