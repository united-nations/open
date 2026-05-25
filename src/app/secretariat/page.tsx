import { AnimatedCornerLogo } from "@/components/AnimatedCornerLogo";
import { PageHeader } from "@/components/PageHeader";
import { SectionBanner } from "@/components/SectionBanner";
import { SecretariatTreemap } from "@/components/SecretariatTreemap";

export default function SecretariatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AnimatedCornerLogo />
      <PageHeader />

      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-16 lg:px-16">
          <p className="max-w-3xl text-base leading-relaxed text-gray-700 md:text-lg">
            A closer look at the <strong>UN Secretariat</strong> budget — the departments,
            offices, and missions that make up the Secretariat and peacekeeping operations.
            <br />
            Explore spending by thematic <em>priority area</em> or by formal <em>budget part</em>,
            and open any entity to see how its funding breaks down into trust funds and budget
            identifiers.
          </p>
        </section>

        <SectionBanner
          id="secretariat"
          imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
          title="How is the UN Secretariat funded?"
          description="The UN Secretariat budget is organized two ways at once: by thematic priority area and by the formal structure of budget parts and sections. Both partition the same expenses. Toggle between the two lenses, and click any sub-entity to see its trust funds and budget identifiers."
        />
        <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
          <SecretariatTreemap />
        </section>
      </main>
    </div>
  );
}
