import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";
import { SectionChrome } from "@/components/SectionChrome";
import { visibleSecretariatNav } from "@/lib/navigation";

export default function SecretariatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isRouteEnabled("/secretariat")) notFound();
  return (
    <SectionChrome
      navLabel="UN Secretariat financials"
      items={visibleSecretariatNav()}
      showDisclaimer={false}
    >
      {children}
    </SectionChrome>
  );
}
