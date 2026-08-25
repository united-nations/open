import type { Metadata } from "next";
import { FieldMissionsMap } from "@/components/FieldMissionsMap";
import { PageSectionNav } from "@/components/PageSectionNav";
import { SectionBanner } from "@/components/SectionBanner";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore which UN Secretariat entities spend funds toward which priority areas and how field missions spend funds.",
};

const pageSections = [
  { id: "priorities", label: "Priority areas" },
  { id: "field-missions", label: "Field missions" },
] as const;

export default function SecretariatPage() {
  return (
    <>
      <PageSectionNav sections={pageSections} underSecretariatNav />

      <SectionBanner
        id="priorities"
        underSecretariatNav
        title="How are Secretariat entities spending?"
        description="Explore UN Secretariat expenses by priority area, entity, funding type and organizational group."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <SecretariatOverview />
      </section>

      <SectionBanner
        id="field-missions"
        underSecretariatNav
        title="How are field missions spending?"
        description="Explore the geographic footprint of special political missions and peacekeeping missions, together with the resources assigned to them."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <FieldMissionsMap />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
        <div className="border-l-4 border-un-blue bg-sky-50 px-4 py-4 text-sm leading-relaxed text-gray-700">
          <p>
            The UN Secretariat—with its departments, commissions, offices and
            missions—is part of the broader UN System. This overview combines
            figures from the UN Secretariat Programme Budget and audited
            financial statements to provide a simplified public view of
            expenses.
          </p>
          <a
            href="https://open.un.org/un-secretariat-financials/expenditure"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-un-blue hover:underline"
          >
            Read the source explanation on the previous Transparency Portal
          </a>
        </div>
      </section>
    </>
  );
}
