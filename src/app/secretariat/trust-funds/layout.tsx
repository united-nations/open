import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";
import { BudgetSubviewNavigation } from "@/components/BudgetSubviewNavigation";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isRouteEnabled("/secretariat/trust-funds")) notFound();

  return (
    <>
      <BudgetSubviewNavigation
        basePath="/secretariat/trust-funds"
        mainLabel="Funds"
        label="Trust Funds views"
        contributorHash="trust-fund-contributor"
      />
      {children}
    </>
  );
}
