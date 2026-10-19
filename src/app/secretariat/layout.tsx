import { SectionChrome } from "@/components/SectionChrome";
import { visibleSecretariatNav } from "@/lib/navigation";

function secretariatIntro() {
  const sections = visibleSecretariatNav().filter(
    (item) => item.href !== "/secretariat",
  );
  const overview = "Get an overview of entities and priority areas";
  if (!sections.length) return `${overview}.`;
  const labels = sections.map((item) => item.label.toLowerCase());
  const list =
    labels.length > 1
      ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
      : labels[0];
  return `${overview}, and explore ${list}.`;
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
