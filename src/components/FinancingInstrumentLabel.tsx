"use client";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import {
  FINANCING_SOURCE_KEYS,
  getFinancingInstrumentLabel,
  FINANCING_INSTRUMENT_TOOLTIPS,
  getFinancingInstrumentColor,
} from "@/lib/financingInstruments";

export function FinancingInstrumentLabel({
  type,
  showMarker = true,
  neutral = false,
  className,
  selected,
  onToggle,
  variant = "inline",
}: {
  type: string;
  showMarker?: boolean;
  neutral?: boolean;
  className?: string;
  selected?: boolean;
  onToggle?: () => void;
  variant?: "pill" | "inline";
}) {
  const source = FINANCING_SOURCE_KEYS[type];
  if (type === "Unresolved")
    return (
      <span className={className}>
        <LegendLabel
          label={getFinancingInstrumentLabel(type)}
          color={getFinancingInstrumentColor(type)}
          explanation={FINANCING_INSTRUMENT_TOOLTIPS[type]}
          selected={selected}
          onToggle={onToggle}
          variant={variant}
          showMarker={showMarker}
        />
      </span>
    );
  return (
    <span className={className}>
      {source ? (
        <FundingSourceLabel
          source={source}
          label={getFinancingInstrumentLabel(type)}
          explanation={FINANCING_INSTRUMENT_TOOLTIPS[type]}
          showMarker={showMarker}
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
