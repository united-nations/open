import { SectionChrome } from "@/components/SectionChrome";
import { SHOW_FIELD_MISSIONS, SHOW_TRUST_FUNDS } from "@/lib/featureFlags";
import { visibleSecretariatNav } from "@/lib/navigation";

function secretariatIntro() {
  if (SHOW_FIELD_MISSIONS && SHOW_TRUST_FUNDS) {
    return "Get an overview of entities and priority areas, and open programme and peacekeeping budgets, field missions, and trust funds.";
  }
  if (SHOW_FIELD_MISSIONS) {
    return "Get an overview of entities and priority areas, and open programme and peacekeeping budgets, and field missions.";
  }
  if (SHOW_TRUST_FUNDS) {
    return "Get an overview of entities and priority areas, and open programme and peacekeeping budgets, and trust funds.";
  }
  return "Get an overview of entities and priority areas, and open programme and peacekeeping budgets.";
}

export default function SecretariatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SectionChrome
      title="Understand the financing of the UN Secretariat."
      intro={secretariatIntro()}
      navLabel="UN Secretariat financials"
      items={visibleSecretariatNav()}
    >
      {children}
    </SectionChrome>
  );
}
