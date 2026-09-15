import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import type { RegularBudgetPaymentStatus } from "@/types";

export const REGULAR_BUDGET_STATUS_STYLES: Record<
  RegularBudgetPaymentStatus,
  {
    label: string;
    color: string;
    textColor?: string;
  }
> = {
  paid_on_time: {
    label: "Paid in full on time",
    color: "var(--color-un-green-shade)",
  },
  paid_late: {
    label: "Paid in full after due date",
    color: "var(--color-un-green)",
    textColor: "var(--color-un-green-shade)",
  },
  not_paid_in_full: {
    label: "Not listed as paid in full",
    color: "var(--color-un-green-tint)",
    textColor: "var(--color-un-green-shade)",
  },
};

export const formatAssessmentCurrency = sharedFormatBudget;

export function formatAssessmentDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
