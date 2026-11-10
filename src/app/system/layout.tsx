import { SectionChrome } from "@/components/SectionChrome";
import { visibleSystemNav } from "@/lib/navigation";
import { FEATURES } from "@/lib/featureFlags";

export default function SystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionChrome
      title="Understand the financing of the UN System."
      intro={`Explore organizations’ revenue and expenditure, who contributes, assessments and payments, and how expenditure is reported across locations, functions and goals.${FEATURES.personnel ? " Explore the people working across the system in Personnel." : ""}`}
      navLabel="UN System financials"
      items={visibleSystemNav()}
      showDisclaimer={false}
    >
      {children}
    </SectionChrome>
  );
}
