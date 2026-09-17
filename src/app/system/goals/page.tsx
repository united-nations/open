import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import {
  CebMethodology,
  GoalsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import {
  FunctionsChart,
  FunctionsTrendsChart,
} from "@/components/FunctionsChart";
import SDGsGrid from "@/components/SDGsGrid";

export const metadata: Metadata = {
  title: "UN System Goals and Functions",
  description:
    "Explore UN System spending by function and Sustainable Development Goal.",
};

export default function SystemGoalsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={
        <>
          <CebMethodology />
          <GoalsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        id="functions-and-goals"
        title="Which goals and functions do funds support?"
        description="Explore spending across the UN’s four main functions and the Sustainable Development Goals. These are separate views of expenditure, not amounts to add together."
      />
      <PageBody>
        <section id="sdgs">
          <h2 className="mb-5 text-2xl font-bold">
            Sustainable Development Goals
          </h2>
          <SDGsGrid />
        </section>
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section id="functions" className="min-w-0">
            <h2 className="mb-4 text-xl font-bold">Spending by function</h2>
            <ChartSourceProvider
              label="CEB financial statistics"
              details={<CebMethodology />}
            >
              <FunctionsChart />
            </ChartSourceProvider>
          </section>
          <FunctionsTrendsChart />
        </div>
      </PageBody>
    </ChartSourceProvider>
  );
}
