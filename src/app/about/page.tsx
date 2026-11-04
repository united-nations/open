import type { Metadata } from "next";
import Link from "next/link";
import {
  CebMethodology,
  SecretariatMethodology,
  SecretariatPageMethodologyContent,
  SECRETARIAT_METHODOLOGY_PAGES,
} from "@/components/Methodology";
import { ExpandableCard } from "@/components/ExpandableCard";
import { PageBody } from "@/components/PageBody";

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
          the UN System and the UN Secretariat. Each dataset retains its own
          reporting scope and accounting basis.
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
          <CebMethodology expandable showCoverage={false} />
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
              (page) => page.id !== "field-missions",
            ).map((page) => (
              <section
                key={page.id}
                aria-labelledby={`secretariat-${page.id}-methodology-title`}
                className="space-y-4"
              >
                <ExpandableCard
                  id={`secretariat-${page.id}-methodology-title`}
                  title={page.title}
                >
                  <p className="mb-4">
                    <Link
                      href={page.href}
                      className="underline underline-offset-2"
                    >
                      <span aria-hidden="true">→</span> View the {page.title}{" "}
                      data page
                    </Link>
                  </p>
                  <SecretariatPageMethodologyContent
                    page={page.id}
                    includeGeneral={false}
                    includeChartNotes
                  />
                </ExpandableCard>
              </section>
            ))}
          </div>
        </section>
      </div>
    </PageBody>
  );
}
