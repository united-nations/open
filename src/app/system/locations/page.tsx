import type { Metadata } from "next";
import { CountryMap } from "@/components/CountryMap";
import {
  CebMethodology,
  LocationsMethodologyNotes,
  Methodology,
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
    <>
      <PageHeading
        id="countries"
        title="Where are funds spent?"
        description="UN System organizations implement activities across the world. Explore where funds are spent geographically, from global programmes to country-level operations."
      />
      <PageBody>
        <CountryMap />
      </PageBody>
      <Methodology>
        <CebMethodology />
        <LocationsMethodologyNotes />
      </Methodology>
    </>
  );
}
