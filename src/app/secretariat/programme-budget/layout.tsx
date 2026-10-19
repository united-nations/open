import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";
import { BudgetSubviewNavigation } from "@/components/BudgetSubviewNavigation";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isRouteEnabled("/secretariat/programme-budget")) notFound();

  return (
    <>
      <BudgetSubviewNavigation
        basePath="/secretariat/programme-budget"
        label="Programme Budget views"
        contributorHash="programme-budget-contributor"
      />
      {children}
    </>
  );
}
