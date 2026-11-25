import { SourceCalculation } from "@/components/SourceCalculation";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { formatChf } from "@/lib/budgetFunding";
import { formatBudget } from "@/lib/entities";
import type { BudgetChfConversion } from "@/types";

/** Keep the printed amount and conversion inspectable beside USD equivalents. */
export function BudgetChfConversionDetails({
  chf,
}: {
  chf: BudgetChfConversion;
}) {
  return (
    <div className="space-y-2 text-start text-xs">
      <SourceCalculation
        references={[chf.source]}
        amount={chf.amount}
        currency="CHF"
      />
      <p>
        {formatChf(chf.amount)} ÷ {chf.chfPerUsd} ={" "}
        {formatBudget(chf.usdEquivalent)} USD equivalent, using the{" "}
        {chf.rateYear} UN budget rate (CHF per USD).
      </p>
      <SourceReferenceLinks references={[chf.rateSource]} />
    </div>
  );
}
