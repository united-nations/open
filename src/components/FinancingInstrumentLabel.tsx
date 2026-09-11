"use client";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";
import { FINANCING_SOURCE_KEYS } from "@/lib/financingInstruments";

export function FinancingInstrumentLabel({
  type,
  className,
  variant = "inline",
}: {
  type: string;
  className?: string;
  variant?: "pill" | "inline";
}) {
  const source = FINANCING_SOURCE_KEYS[type];
  return (
    <span className={className}>
      {source ? (
        <FundingSourceLabel source={source} variant={variant} />
      ) : (
        <span>{type}</span>
      )}
    </span>
  );
}
