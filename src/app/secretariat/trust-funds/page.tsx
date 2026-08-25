import type { Metadata } from "next";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import { PageSectionNav } from "@/components/PageSectionNav";
import { SectionBanner } from "@/components/SectionBanner";
import { TrustFundContributorsTreemap } from "@/components/TrustFundContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds",
  description:
    "Explore individual UN Secretariat trust funds and their contributors.",
};

const pageSections = [
  { id: "trust-fund-spending", label: "Fund spending" },
  { id: "trust-fund-contributors", label: "Contributors" },
] as const;

export default function TrustFundsPage() {
  return (
    <>
      <PageSectionNav sections={pageSections} underSecretariatNav />

      <SectionBanner
        id="trust-fund-spending"
        underSecretariatNav
        title="How are the trust funds spending?"
        description="Explore individual trust-fund expenses grouped by their mapped Secretariat entity."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <BudgetTreemap
          dataset="budget-trust-funds"
          hashPrefix="trust-fund"
          sectionId="trust-fund-spending"
          activeFundingSources={["extrabudgetary"]}
          trustFundLevel="fund"
        />
      </section>

      <SectionBanner
        id="trust-fund-contributors"
        underSecretariatNav
        title="Who contributes to trust funds?"
        description="Explore recognized voluntary contributions by contributor and destination fund."
      />
      <section
        id="contributors"
        className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16"
      >
        <TrustFundContributorsTreemap />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
        <p className="border-l-4 border-un-blue bg-sky-50 px-4 py-4 text-sm leading-relaxed text-gray-700">
          Expenses and recognized contributions come from audited Schedules of
          Individual Trust Funds. Entity grouping uses a reconstructed
          historical crosswalk; it identifies the entity responsible for a fund,
          not a direct link between a contributor and a particular expense.
        </p>
      </section>
    </>
  );
}
