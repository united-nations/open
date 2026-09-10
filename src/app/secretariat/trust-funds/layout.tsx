import { BudgetSubviewNavigation } from "@/components/BudgetSubviewNavigation";

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return <>
    <BudgetSubviewNavigation basePath="/secretariat/trust-funds" label="Trust Funds views" contributorHash="trust-fund-contributor" />
    {children}
  </>;
}
