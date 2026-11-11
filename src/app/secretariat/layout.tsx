import { SectionChrome } from "@/components/SectionChrome";
import { visibleSecretariatNav } from "@/lib/navigation";

export default function SecretariatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
