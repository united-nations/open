import type { Metadata } from "next";
import { SectionBanner } from "@/components/SectionBanner";
import { BudgetTreemap } from "@/components/BudgetTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "A closer look at the UN Secretariat budget: the sections of the programme budget and the peacekeeping missions, as printed in the budget documents.",
};

export default function SecretariatPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-16 lg:px-16">
        <p className="max-w-3xl text-base leading-relaxed text-gray-700 md:text-lg">
          A closer look at the <strong>UN Secretariat</strong> budget — the
          sections of the programme budget, and the peacekeeping missions, which
          are a separate budget on their own cycle.
          <br />
          Both treemaps come from the budget documents themselves. Click any tile
          to see what it contains and which table the figure is printed in.
        </p>
      </section>

      <SectionBanner
        id="secretariat"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="How is the UN Secretariat funded?"
        description="The budget is divided into 14 parts, and the parts into about 40 sections. Each band below is a part, and each tile is a row the fascicle prints below the section — a department or office, a component of the work, or an amount the document does not break down further. Move the year slider to go back to 2018, and click any tile for the detail below it."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <BudgetTreemap
          dataset="budget-ppb"
          hashPrefix="secretariat"
          sectionId="secretariat"
        />
      </section>

      <SectionBanner
        id="peacekeeping"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="What do the peacekeeping missions cost?"
        description="Peacekeeping is assessed separately from the programme budget and runs from July to June. This shows what each mission spent, split into military and police personnel, civilian personnel and operational costs, for the cycles from 2022/23 to 2024/25. Toggle between the two groupings, and click any tile for the cost items below it."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <BudgetTreemap
          dataset="budget-pko"
          hashPrefix="pko"
          sectionId="peacekeeping"
        />
      </section>
    </>
  );
}
