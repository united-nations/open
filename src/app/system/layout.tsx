import { SectionChrome } from "@/components/SectionChrome";
import { SYSTEM_NAV } from "@/lib/navigation";

export default function SystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionChrome
      title="Understand the financing of the UN System."
      intro="Explore organizations’ revenue and expenditure, who contributes, and how expenditure is reported across locations, functions and goals."
      navLabel="UN System financials"
      items={SYSTEM_NAV}
      showDisclaimer={false}
    >
      {children}
    </SectionChrome>
  );
}
