import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";
import { BudgetSubviewNavigation } from "@/components/BudgetSubviewNavigation";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isRouteEnabled("/secretariat/peacekeeping-budget")) notFound();

  return (
    <>
      <BudgetSubviewNavigation
        basePath="/secretariat/peacekeeping-budget"
        label="Peacekeeping Budget views"
        contributorHash="peacekeeping-contributor"
      />
      {children}
    </>
  );
}
