import type { Metadata } from "next";
import { DataPlaceholder } from "@/components/DataPlaceholder";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";
import { SectionBanner } from "@/components/SectionBanner";
import { SecretariatDataTreemap } from "@/components/SecretariatDataTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore UN regular-budget assessments and Secretariat expenditure from audited financial statements or the PPB and PKO budget documents.",
};

export default function SecretariatPage() {
  return (
    <>
      <SectionBanner
        id="budget"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="Which entities are funded?"
        description="Explore how programme-budget expenditure is allocated across budget parts, sections, and Secretariat entities, and how peacekeeping resources are allocated across missions."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <SecretariatDataTreemap />
      </section>

      <SectionBanner
        id="field-missions"
        imageSrc="/images/banners/hero-banner-system-revenue.png"
        title="Where do field missions operate?"
        description="Explore the geographic footprint of special political missions and peacekeeping missions, together with the resources assigned to them."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <DataPlaceholder
          type="map"
          height="h-96"
          title="Field missions map"
          description="Special political missions and peacekeeping missions"
        />
      </section>

      <SectionBanner
        id="priorities"
        imageSrc="/images/banners/hero-banner-system-expenses.png"
        title="Which priority areas are funded?"
        description="Explore how expenditure is distributed across priority areas and which Secretariat entities contribute to each area."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <DataPlaceholder
          type="treemap"
          height="h-96"
          title="Priority areas treemap"
          description="Expenditure and entities by priority area"
        />
      </section>

      <SectionBanner
        id="contributors"
        imageSrc="/images/banners/hero-banner-homepage.png"
        title="Who contributes to the UN Secretariat?"
        description="Member States finance the United Nations regular budget through assessed contributions. Explore each Member State's assessment and whether it was paid in full by the due date, paid later, or was not listed as paid in full."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <RegularBudgetContributorsTreemap />
      </section>
    </>
  );
}
