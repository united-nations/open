"use client";

import {
  FinancialPanelYearSelector,
  type FinancialPanelYearSelectorProps,
} from "@un-eosg/ui/components/financial-panel-parts";
import { fiscalYearLabel } from "@/lib/budgetGroupings";

export function FiscalYearSelector({
  formatLabel = fiscalYearLabel,
  ...props
}: Omit<FinancialPanelYearSelectorProps, "variant">) {
  return (
    <FinancialPanelYearSelector
      {...props}
      variant="pill"
      formatLabel={formatLabel}
    />
  );
}
