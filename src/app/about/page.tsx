import type { Metadata } from "next";
import Link from "next/link";
import {
  CebMethodology,
  SecretariatMethodology,
  SecretariatPageMethodologyContent,
  SECRETARIAT_METHODOLOGY_PAGES,
  UninfoMethodology,
} from "@/components/Methodology";
import { SectionHeading } from "@/components/ContentHeading";
import { ExpandableCard } from "@/components/ExpandableCard";
import { PageBody } from "@/components/PageBody";
import { PageTitle } from "@/components/PageHeading";
import { PageSourceLink } from "@/components/PageSources";
import { CEB_ASSESSMENTS_SECTION } from "@/lib/cebAssessments";
import {
  SHOW_PEACE_OPERATIONS,
  SHOW_UNINFO,
} from "@/lib/featureFlags";
import { isRouteEnabled } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sources, methodology and data disclaimer for the UN Transparency Portal.",
};

export default function AboutPage() {
  return (
    <PageBody className="pt-8 md:pt-10">
      <div className="max-w-prose">
        <PageTitle className="mb-2">About this portal</PageTitle>
        <p className="mb-12 max-w-3xl leading-relaxed text-gray-700">
          The UN Transparency Portal brings together financial and staffing
          information about the UN System and the UN Secretariat. The sources
          and preparation of each dataset are described below.
        </p>
        <section
          id="personnel-methodology"
          className="mb-12 scroll-mt-20 space-y-3 text-sm leading-relaxed text-gray-600"
          aria-labelledby="personnel-methodology-title"
        >
          <SectionHeading id="personnel-methodology-title">
            UN System Personnel
          </SectionHeading>
          <p>
            <PageSourceLink source="personnel" /> counts staff who, on 31
            December, held a contract of at least one year or had been employed
            for at least one year. Temporary appointments are included after one
            year of employment. Consultants, individual contractors and other
            non-staff personnel are excluded. These figures therefore do not
            describe every person working with the UN System.
          </p>
          <p>
            The personnel exports use five{" "}
            <a className="underline" href="https://unsceb.org/data-download/">
              CEB HR downloads
            </a>
            :{" "}
            <a
              className="underline"
              href="https://unsceb.org/assets/data/HR/organization.csv"
            >
              organizations
            </a>
            ,{" "}
            <a
              className="underline"
              href="https://unsceb.org/assets/data/HR/composition.csv"
            >
              grade and gender
            </a>
            ,{" "}
            <a
              className="underline"
              href="https://unsceb.org/assets/data/HR/duty_station.csv"
            >
              duty stations
            </a>
            ,{" "}
            <a
              className="underline"
              href="https://unsceb.org/assets/data/HR/nationality.csv"
            >
              nationality
            </a>
            , and{" "}
            <a
              className="underline"
              href="https://unsceb.org/assets/data/HR/others.csv"
            >
              age and length of service
            </a>
            . Definitions follow the{" "}
            <a
              className="underline"
              href="https://unsceb.org/assets/data/HR/ceb_hr_codebook_v1.0.md?v=1.0"
            >
              CEB personnel data codebook
            </a>
            . Current source files supply every available historical year.
            Organizations remain responsible for the accuracy and completeness
            of their submissions.
          </p>
          <p>
            HR reporting boundaries differ from financial reporting. UN
            Secretariat staff include its reported departments, offices and
            missions, including UNEP, UNODC and UN-Habitat. The CEB secretariat,
            JIU, ICSC and UNJSPF remain separately reported as in the downloads.
            CEB’s published personnel reports can group these differently.
            Organization and country names follow the current source labels
            across years. Changes in participation and reporting coverage can
            affect trends.
          </p>
          <p>
            The Staff treemap on Organizations shows the reported UN entities
            directly within the Secretariat, without additional mission or
            department groupings. Their headcounts are counted once within UN.
            The HR entry DPO is the Department of Peace Operations, not the
            financial UN-DPO aggregate. Entity-level grade, gender, duty station
            and nationality are not inferred from Secretariat-wide breakdowns.
          </p>
          <p>
            Locations groups staff by country of duty station. Age and length of
            service are available only for the whole system. Length of service
            means completed years in the reporting organization.
          </p>
          <p>
            Relative stacked-area trends show each gender, age band or
            length-of-service band as a share of all recorded staff in that
            year, including unknown categories. Gender trends follow the
            selected organization; an unavailable organization-year stays a gap.
            Age and length-of-service trends cover the whole system.
          </p>
          <p>
            Missing source values remain unknown. Under CEB’s codebook, an
            absent combination records no staff for that combination; an
            unavailable dataset or year is not a zero. Unmapped staff remain in
            the data and can be found in the Locations list. Country markers
            show illustrative country coordinates, rather than precise staff
            locations. Counts from different HR dimensions are alternative
            breakdowns of staff and are never added together. Additional
            report-only HR tables are available in the{" "}
            <a
              className="underline"
              href="https://unsceb.org/statistics/human-resources-statistics/"
            >
              annual CEB personnel reports
            </a>
            .
          </p>
        </section>
        <section
          id="ceb-methodology"
          className="scroll-mt-20 space-y-3 text-sm leading-relaxed text-gray-600"
          aria-labelledby="ceb-methodology-title"
        >
          <SectionHeading id="ceb-methodology-title">
            UN System Financials
          </SectionHeading>
          <div className="space-y-2">
            <CebMethodology />
            <ExpandableCard
              id={CEB_ASSESSMENTS_SECTION}
              title="Assessments and payments"
            >
              <div className="space-y-3">
                <p>
                  The <PageSourceLink source="cebAssessments" /> report
                  assessments and receipts in nominal US dollars for the
                  organizations and contributors covered. The portal keeps these
                  figures separate from assessed revenue in CEB Financial
                  Statistics. The portal shows 2024 and 2025 and sums the
                  reported amounts for each measure, including payments on rows
                  with blank assessment amounts. Blank values are unknown. A
                  total is marked partial if some observations are missing. The
                  Committee on Contributions publishes regular-budget payment
                  dates in its{" "}
                  <a
                    href="https://www.un.org/en/ga/contributions/previous_honourrolls.shtml"
                    className="underline underline-offset-2"
                  >
                    honour rolls
                  </a>
                  .
                </p>
                <p>
                  The organization and contributor views use the same assessment
                  observations, grouped by organization or by contributor.
                  Unknown payment amounts are calculated for each contributor
                  and organization before aggregation. The treemap uses assessed
                  amounts to size tiles and can expand them to show positive
                  earlier-year payments. The list and totals include reported
                  amounts that have no tile area.
                </p>
                <p>
                  Annual reports cover 30 organizations in 2024 and 29 in 2025.
                  PAHO and UN Women appear only in 2025. ITC, UNITAID and UNOPS
                  appear only in 2024. UNITAR appears in the 2020–2025 source
                  series and is absent in both years shown. Several
                  organizations report partial figures. Changes over time can
                  reflect differences in reporting coverage.
                </p>
                <p>
                  IRMCT payment data is unavailable for both years. CEB leaves
                  the payment fields blank in 2024 and records zeros in 2025.
                  For 2025, the portal displays the payment fields as
                  unavailable and preserves the original values in the data
                  downloads.
                </p>
                <p>
                  Totals sum the organizations’ reported figures. ITC and UN
                  Women include allocations from assessments already reported
                  under the UN Secretariat, so totals can include overlapping
                  amounts.
                </p>
                <p>
                  The reported trend shows receipts in the year CEB records
                  them, with payments toward that year and earlier years shown
                  separately. Grey shows assessed amounts with blank
                  current-year receipts. CEB groups earlier-year receipts
                  together by year received.
                </p>
                <p>
                  Reported outstanding assessments come from Table 7 of CEB’s
                  reports on the budgetary and financial situation of the UN
                  system. They include current and prior assessment years. The
                  portal preserves CEB’s reported amounts and displays the
                  original table footnotes for the selected year below the
                  charts for 2024 and 2025. Missing balances remain unavailable.
                  Where CEB reports separate budget balances, they remain
                  separate.
                </p>
                <p>
                  Outstanding-balance sources:{" "}
                  <a
                    className="underline"
                    href="https://unsceb.org/assets/media/reports/report-3755-A77507-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-5-Oct-2022.pdf#page=140"
                  >
                    A/77/507 (2020–2021)
                  </a>
                  ,{" "}
                  <a
                    className="underline"
                    href="https://unsceb.org/assets/media/reports/report-3825-A79494-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-2024.pdf#page=29"
                  >
                    A/79/494 (2022–2023)
                  </a>
                  , and{" "}
                  <a
                    className="underline"
                    href="https://www.unsceb.org/assets/media/reports/report-3983-A81408-Budgetary-and-financial-situation-of-the-organizations-of-the-UN-system-2026.pdf#page=28"
                  >
                    A/81/408 (2024–2025)
                  </a>
                  .
                </p>
              </div>
            </ExpandableCard>
            {SHOW_UNINFO && (
              <section aria-labelledby="uninfo-methodology">
                <ExpandableCard
                  id="uninfo-methodology"
                  title="Cooperation Frameworks — UNINFO"
                >
                  <UninfoMethodology />
                </ExpandableCard>
              </section>
            )}
          </div>
        </section>
        <section
          id="secretariat-methodology"
          className="mt-8 scroll-mt-20 space-y-3 border-t border-gray-200 pt-4"
          aria-labelledby="secretariat-methodology-title"
        >
          <SectionHeading id="secretariat-methodology-title">
            UN Secretariat Financials
          </SectionHeading>
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <SecretariatMethodology />
            {SECRETARIAT_METHODOLOGY_PAGES.filter(
              (page) => page.id !== "peace-operations" || SHOW_PEACE_OPERATIONS,
            ).map((page) => (
              <section
                key={page.id}
                aria-labelledby={`secretariat-${page.id}`}
                className="space-y-4"
              >
                <ExpandableCard
                  id={`secretariat-${page.id}`}
                  title={page.title}
                >
                  {isRouteEnabled(page.href) && (
                    <p className="mb-4">
                      <span aria-hidden="true">→</span>{" "}
                      <Link
                        href={page.href}
                        className="underline underline-offset-2"
                      >
                        View the {page.title} data page
                      </Link>
                    </p>
                  )}
                  <SecretariatPageMethodologyContent page={page.id} />
                </ExpandableCard>
              </section>
            ))}
          </div>
        </section>
        <section
          id="disclaimer"
          className="mt-8 scroll-mt-20 space-y-3 border-t border-gray-200 pt-4"
          aria-labelledby="disclaimer-title"
        >
          <SectionHeading id="disclaimer-title" anchor="disclaimer">
            Disclaimer
          </SectionHeading>
          <div className="space-y-3 text-sm leading-relaxed text-gray-600">
            <p>
              Data on this website and in its downloads is not authoritative. As
              described in the methodology notes above, the portal compiles
              existing datasets and automatically extracts figures from source
              documents. Consult the original datasets and documents for
              authoritative figures, definitions, methodology and limitations.
            </p>
            <p>
              The portal provides data and visualizations as is, without
              guarantees of accuracy, completeness or timeliness. Source data
              may be revised, and reporting coverage and methods may vary by
              source and year.
            </p>
            <p>
              When reusing data, cite the original source and follow its terms
              of use. Acknowledge the UN Transparency Portal when reusing its
              charts or calculations.
            </p>
            <p>
              Geographic names, designations and boundaries are shown for
              reference, without implying a United Nations position on legal
              status or boundaries, or any official endorsement or acceptance.
            </p>
            <p>
              See the{" "}
              <a
                className="underline underline-offset-2"
                href="https://www.un.org/en/about-us/terms-of-use"
              >
                United Nations Terms of Use
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </PageBody>
  );
}
