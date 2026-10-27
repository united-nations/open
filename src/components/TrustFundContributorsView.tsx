"use client";
import { useState } from "react";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { TrustFundContributorsTreemap } from "@/components/TrustFundContributorsTreemap";
import { XBContributorPanel } from "@/components/XBContributorPanel";
import { useYearRanges } from "@/lib/useYearRanges";

export function TrustFundContributorsView() {
  const [source, setSource] = useState("volume_i");
  const yearRange = useYearRanges().trustFundContributors;
  const [year, setYear] = useState(yearRange.default);
  const unepAnnualReportUrl =
    year === 2024
      ? "https://www.unep.org/en/publications/annual-report/annual-report-2024"
      : year === 2023
        ? "https://www.unep.org/annualreport/2023"
        : "https://www.unep.org/annualreport/";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center">
        <SegmentedControl
          label="Contributor reporting source"
          options={[
            { value: "volume_i", label: "UN Secretariat trust-fund schedules" },
            { value: "UNODC", label: "UNODC" },
            { value: "UN-HABITAT", label: "UN-Habitat" },
            { value: "ITC", label: "ITC" },
            { value: "UNEP", label: "UNEP" },
          ]}
          value={source}
          onValueChange={setSource}
        />
      </div>
      {source === "volume_i" ? (
        <TrustFundContributorsTreemap
          selectedYear={year}
          onYearChange={setYear}
        />
      ) : source === "UNEP" ? (
        <p className="text-sm text-gray-600" data-unep-contributor-availability>
          A contributor breakdown is not available in the official financial
          data used here. See{" "}
          <a
            href={unepAnnualReportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue underline"
          >
            UNEP’s annual report
            <span className="sr-only"> (opens in a new tab)</span>
          </a>{" "}
          instead.
        </p>
      ) : (
        <XBContributorPanel
          key={source}
          entity={source}
          year={year}
          onYearChange={setYear}
          yearOptions={yearRange.years}
        />
      )}
    </div>
  );
}
