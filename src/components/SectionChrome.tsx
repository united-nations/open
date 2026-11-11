import { SectionSubnav } from "@/components/SectionSubnav";
import { ChartDataDisclaimer } from "@/components/ChartDataDisclaimer";
import type { SectionNavItem } from "@/lib/navigation";

export function SectionChrome({
  navLabel,
  items,
  children,
  showDisclaimer = true,
}: {
  navLabel: string;
  items: readonly SectionNavItem[];
  children: React.ReactNode;
  showDisclaimer?: boolean;
}) {
  return (
    <>
      <SectionSubnav items={items} label={navLabel} />
      {children}
      {showDisclaimer && <ChartDataDisclaimer />}
    </>
  );
}
