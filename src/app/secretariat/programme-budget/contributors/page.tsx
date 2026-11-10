import { RelatedDataPages } from "@/components/RelatedDataPages";
import { PageSourceLink } from "@/components/PageSources";
import { SHOW_REGULAR_BUDGET_OUTSTANDING } from "@/lib/featureFlags";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Programme Budget — Contributors",
};

export default function ContributorsPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            Assessment amounts come from{" "}
            <PageSourceLink source="regularAssessments" />; paid-in-full status
            and dates come from the <PageSourceLink source="honourRoll" />.
            {SHOW_REGULAR_BUDGET_OUTSTANDING && (
              <>
                {" "}
                Outstanding balances come from the{" "}
                <PageSourceLink source="financialSituation" />.
              </>
            )}
          </>
        }
        title="Who funds the regular budget?"
        description={
          SHOW_REGULAR_BUDGET_OUTSTANDING
            ? "Explore Member States’ assessed contributions to the UN regular budget, their payment status, and outstanding balances over time."
            : "Explore Member States’ assessed contributions to the UN regular budget and their payment status over time."
        }
      />
      <section id="programme-budget-contributors" aria-label="Contributors">
        <PageBody>
          <RegularBudgetContributorsTreemap />
        </PageBody>
      </section>
      <SecretariatMethodologyLink page="programme-budget-contributors" />
      <RelatedDataPages page="/secretariat/programme-budget/contributors" />
    </>
  );
}
