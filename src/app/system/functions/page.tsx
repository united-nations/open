import type { Metadata } from "next";
import { ChartSourceProvider } from "@/components/ChartSource";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { SystemPageSources } from "@/components/PageSources";
import { CebMethodology } from "@/components/Methodology";
import { FunctionsMethodology } from "@/components/FunctionsMethodology";
import {
  FunctionsChart,
  FunctionsTrendsChart,
} from "@/components/FunctionsChart";

export const metadata: Metadata = {
  title: "UN System Functions",
  description:
    "Explore UN System expenditure across the four CEB functions and trends from 2018 onward.",
};

export default function SystemFunctionsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={
        <>
          <CebMethodology />
          <FunctionsMethodology />
        </>
      }
    >
      <PageHeading
        id="functions"
        title="Which functions do funds support?"
        description="Explore expenditure across development assistance, humanitarian assistance, peace operations, and the global agenda and specialized assistance. Trends use the current CEB classification from 2018 onward."
        sources={<SystemPageSources />}
      />
      <PageBody>
        <FunctionsChart />
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <FunctionsTrendsChart />
        </div>
      </PageBody>
    </ChartSourceProvider>
  );
}
