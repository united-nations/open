import type { Metadata } from "next";
import Link from "next/link";
import {
  CebMethodology,
  SecretariatMethodology,
  SecretariatPageMethodologyContent,
  SECRETARIAT_METHODOLOGY_PAGES,
  UninfoMethodology,
} from "@/components/Methodology";
import { ExpandableCard } from "@/components/ExpandableCard";
import { PageBody } from "@/components/PageBody";
import { PageSourceLink } from "@/components/PageSources";
import { CEB_ASSESSMENTS_SECTION } from "@/lib/cebAssessments";
import { SHOW_FIELD_MISSIONS, SHOW_UNINFO } from "@/lib/featureFlags";
import { isRouteEnabled } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "About",
  description:
    "Sources, methodology and data processing for the UN Transparency Portal.",
};

export default function AboutPage() {
  return (
    <PageBody>
      <div className="max-w-prose">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          About this portal
        </h1>
        <p className="mb-10 max-w-3xl leading-7 text-gray-700">
          The UN Transparency Portal brings together financial information about
          the UN System and the UN Secretariat. The sources and preparation of
          each dataset are described below.
        </p>
        <section
          id="ceb-methodology"
          className="space-y-6 text-sm leading-relaxed text-gray-600"
          aria-labelledby="ceb-methodology-title"
        >
          <h2
            id="ceb-methodology-title"
            className="text-2xl font-bold text-gray-900"
          >
            UN System Financials
          </h2>
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
                  Statistics. The charts and totals exclude rows with blank
                  assessment amounts, including any payments on those rows. A
                  partial payment total sums the available payments for the
                  included rows. Current-year payment amounts are missing for
                  the UN Secretariat in 2022 and 2023. The Committee on
                  Contributions publishes regular-budget payment dates in its{" "}
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
                  and organization before aggregation.
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
                  charts. Missing balances remain unavailable. Where CEB reports
                  separate budget balances, they remain separate.
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
          className="mt-12 space-y-4 border-t border-gray-200 pt-8"
          aria-labelledby="secretariat-methodology-title"
        >
          <h2
            id="secretariat-methodology-title"
            className="text-2xl font-bold text-gray-900"
          >
            UN Secretariat Financials
          </h2>
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            <SecretariatMethodology />
            {SECRETARIAT_METHODOLOGY_PAGES.filter(
              (page) => page.id !== "field-missions" || SHOW_FIELD_MISSIONS,
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
      </div>
    </PageBody>
  );
}
