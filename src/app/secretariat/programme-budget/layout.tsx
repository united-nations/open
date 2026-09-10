import { BudgetSubviewNavigation } from "@/components/BudgetSubviewNavigation";

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return <>
    <BudgetSubviewNavigation basePath="/secretariat/programme-budget" label="Programme Budget views" contributorHash="programme-budget-contributor" />
    {children}
  </>;
}
