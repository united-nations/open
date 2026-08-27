import { SectionChrome } from "@/components/SectionChrome";
import { SYSTEM_NAV } from "@/lib/navigation";

export default function SystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionChrome
      title="Understand the financing of the UN System."
      intro="Explore who contributes, which organizations are funded, where resources are deployed, and which goals they support."
      navLabel="UN System financials"
      items={SYSTEM_NAV}
    >
      {children}
    </SectionChrome>
  );
}
