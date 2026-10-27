"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { typography } from "@un-eosg/ui/typography";
import type { FinancialPanelYearSelectorProps } from "@un-eosg/ui/components/financial-panel-parts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fiscalYearLabel } from "@/lib/budgetGroupings";
import { cn } from "@/lib/utils";

/** Formatted fiscal periods until the shared numeric selector supports labels. */
export function FiscalYearSelector({
  years,
  selected,
  onChange,
  label,
  pending,
  pendingLabel,
  formatLabel = fiscalYearLabel,
}: Omit<FinancialPanelYearSelectorProps, "variant"> & {
  formatLabel?: (year: number) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              typography.meta,
              "inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-secondary px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-un-blue/50 focus-visible:outline-none",
            )}
          >
            <span className="font-medium">{formatLabel(selected)}</span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[100] w-auto min-w-20 p-1">
          <div className="flex flex-col">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                aria-pressed={year === selected}
                onClick={() => {
                  onChange(year);
                  setOpen(false);
                }}
                className={cn(
                  typography.body,
                  "rounded px-3 py-1.5 text-start",
                  year === selected
                    ? "bg-secondary font-medium text-foreground"
                    : "text-gray-600 hover:bg-muted",
                )}
              >
                {formatLabel(year)}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {pending && (
        <span role="status" className={typography.caption}>
          {pendingLabel}
        </span>
      )}
    </div>
  );
}
