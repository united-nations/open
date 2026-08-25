import type { Metadata } from "next";
import { PageSectionNav } from "@/components/PageSectionNav";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";
import { RegularBudgetView } from "@/components/RegularBudgetView";
import { SectionBanner } from "@/components/SectionBanner";

export const metadata: Metadata = {
  title: "UN Regular Budget",
  description:
    "Explore regular-budget spending and assessed contributions from UN Member States.",
};

const pageSections = [
  { id: "regular-budget-spending", label: "Spending" },
  { id: "regular-budget-contributors", label: "Contributors" },
] as const;

export default function RegularBudgetPage() {
  return (
    <>
      <PageSectionNav sections={pageSections} underSecretariatNav />

      <SectionBanner
        id="regular-budget-spending"
        underSecretariatNav
        title="How does the regular budget and spending break down?"
        description="Explore expenditure in the UN programme budget by budget part, section and entity."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <RegularBudgetView />
      </section>

      <SectionBanner
        id="regular-budget-contributors"
        underSecretariatNav
        title="Who contributes to the regular budget?"
        description="Explore Member State assessments, paid-in-full status and the timing of payments."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <RegularBudgetContributorsTreemap />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
        <p className="border-l-4 border-un-blue bg-sky-50 px-4 py-4 text-sm leading-relaxed text-gray-700">
          Spending data comes from Proposed Programme Budget documents and their
          published actual expenditure tables. Contribution amounts come from
          annual assessment circulars; paid-in-full status and dates come from
          the UN regular-budget honour roll, with assessment rates checked
          against the historical scale of assessments.
        </p>
      </section>
    </>
  );
}
