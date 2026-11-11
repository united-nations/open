import { SectionChrome } from "@/components/SectionChrome";
import { visibleSystemNav } from "@/lib/navigation";

export default function SystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionChrome
      navLabel="UN System financials"
      items={visibleSystemNav()}
      showDisclaimer={false}
    >
      {children}
    </SectionChrome>
  );
}
