"use client";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";
import { FINANCING_SOURCE_KEYS } from "@/lib/financingInstruments";

export function FinancingInstrumentLabel({
  type,
  neutral = false,
  className,
  selected,
  onToggle,
  variant = "inline",
}: {
  type: string;
  neutral?: boolean;
  className?: string;
  selected?: boolean;
  onToggle?: () => void;
  variant?: "pill" | "inline";
}) {
  const source = FINANCING_SOURCE_KEYS[type];
  return (
    <span className={className}>
      {source ? (
        <FundingSourceLabel
          source={source}
          palette={neutral ? "gray" : "blue"}
          variant={variant}
          selected={selected}
          onToggle={onToggle}
        />
      ) : (
        <span>{type}</span>
      )}
    </span>
  );
}
