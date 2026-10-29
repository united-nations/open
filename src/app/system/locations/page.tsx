import { FunctionGeographyChart } from "@/components/FunctionGeographyChart";
import { FEATURES } from "@/lib/featureFlags";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { CountryMap } from "@/components/CountryMap";
import {
  CebPageMethodology,
  LocationsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Locations",
  description:
    "Explore where UN System funds are spent geographically, from global programmes to country-level operations.",
};

export default function SystemLocationsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={null}
      placement="page"
    >
      <PageHeading
        id="countries"
        title="Where are funds spent?"
        description="UN System organizations implement activities across the world. Explore where funds are spent geographically, from global programmes to country-level operations."
      />
      <PageBody>
        <CountryMap />
        {FEATURES.functionGeography && <FunctionGeographyChart />}
      </PageBody>
      <CebPageMethodology>
        <LocationsMethodologyNotes />
      </CebPageMethodology>
    </ChartSourceProvider>
  );
}
