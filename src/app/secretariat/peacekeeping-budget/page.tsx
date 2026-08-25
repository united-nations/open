import type { Metadata } from "next";
import { DataPlaceholder } from "@/components/DataPlaceholder";
import { SectionBanner } from "@/components/SectionBanner";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget",
  description:
    "Explore how peacekeeping missions spend funds and who contributes to them.",
};

export default function PeacekeepingBudgetPage() {
  return (
    <>
      <SectionBanner
        id="peacekeeping-spending"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="How do peacekeeping missions spend funds?"
        description="A geographic view of peacekeeping mission expenditure."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <DataPlaceholder
          type="map"
          height="h-[32rem]"
          title="Peacekeeping missions map"
          description="Mission expenditure and operating locations"
        />
      </section>

      <SectionBanner
        id="peacekeeping-contributors"
        imageSrc="/images/banners/hero-banner-homepage.png"
        title="Who contributes to peacekeeping missions?"
        description="Assessed contributions to UN peacekeeping operations."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <DataPlaceholder
          type="chart"
          height="h-96"
          title="Peacekeeping contributors"
          description="Contributor data will be added here"
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
        <p className="border-l-4 border-un-blue bg-sky-50 px-4 py-4 text-sm leading-relaxed text-gray-700">
          The spending view will use peacekeeping budget and performance-report
          data on July–June financial cycles. The contributor source and its
          methodology will be documented when that dataset is added.
        </p>
      </section>
    </>
  );
}
