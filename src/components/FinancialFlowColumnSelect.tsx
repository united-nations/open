"use client";

import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FinancialFlowColumnSelect({
  label,
  value,
  options,
  onChange,
  compact = false,
  contentClassName,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  compact?: boolean;
  contentClassName?: string;
}) {
  const isEmpty = value === "none";
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex cursor-pointer items-center rounded-full border border-border bg-secondary text-xs font-medium text-black transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue data-[state=open]:bg-gray-200",
            !compact && "min-h-11 xl:min-h-0",
            isEmpty
              ? compact
                ? "size-7 justify-center p-0"
                : "gap-1.5 px-3 xl:size-7 xl:justify-center xl:px-0"
              : "w-max max-w-full gap-1.5 px-2 py-1",
          )}
        >
          {isEmpty ? (
            <>
              <Plus aria-hidden="true" className="size-3.5" />
              {!compact && <span className="xl:hidden">Add column</span>}
            </>
          ) : (
            <>
              <span className="truncate">
                {options.find((option) => option.value === value)?.label}
              </span>
              <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("border-gray-300 bg-white text-black", contentClassName)}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="cursor-pointer py-2 focus:bg-gray-50 focus:text-black data-[state=checked]:bg-gray-100"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
