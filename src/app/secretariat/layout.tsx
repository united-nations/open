import { SectionChrome } from "@/components/SectionChrome";
import { SECRETARIAT_NAV } from "@/lib/navigation";

export default function SecretariatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionChrome
      title="Understand the financing of the UN Secretariat."
      intro="Get an overview of entities and priority areas, and open programme and peacekeeping budgets, field missions, and trust funds."
      navLabel="UN Secretariat financials"
      items={SECRETARIAT_NAV}
    >
      {children}
    </SectionChrome>
  );
}
