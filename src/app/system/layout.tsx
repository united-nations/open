import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";
import { SectionChrome } from "@/components/SectionChrome";
import { visibleSystemNav } from "@/lib/navigation";

export default function SystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isRouteEnabled("/system")) notFound();
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
