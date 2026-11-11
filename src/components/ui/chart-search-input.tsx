"use client";

import { SearchInput } from "@un-eosg/ui/components/search-input";
import { cn } from "@/lib/utils";

interface ChartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

export function ChartSearchInput({
  value,
  onChange,
  label,
  placeholder = "Search...",
  className,
}: ChartSearchInputProps) {
  return (
    <div className={cn("w-full sm:w-64", className)}>
      <SearchInput
        variant="border-bottom"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        showClear
        onClear={() => onChange("")}
        className="h-11 text-base sm:h-9 sm:text-sm"
      />
    </div>
  );
}
