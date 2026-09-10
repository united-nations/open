import { BudgetSubviewNavigation } from "@/components/BudgetSubviewNavigation";

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return <>
    <BudgetSubviewNavigation basePath="/secretariat/peacekeeping-budget" label="Peacekeeping Budget views" contributorHash="peacekeeping-contributor" />
    {children}
  </>;
}
