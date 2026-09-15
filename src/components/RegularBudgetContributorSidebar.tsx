"use client";
import { formatAssessmentRate } from "@un-eosg/ui/format-budget";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { SidebarControls } from "@/components/SidebarControls";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { loadYearData } from "@/lib/data";
import type { RegularBudgetContributorsData } from "@/types";
import {
  REGULAR_BUDGET_STATUS_STYLES,
  formatAssessmentDate,
  formatAssessmentCurrency,
} from "@/lib/regularBudgetContributors";

export function RegularBudgetContributorSidebar({
  name,
  initialData,
  years,
  onClose,
}: {
  name: string;
  initialData: RegularBudgetContributorsData;
  years: number[];
  onClose: () => void;
}) {
  const [year, setYear] = useState(initialData.meta.year);
  const [files, setFiles] = useState<
    Record<number, RegularBudgetContributorsData | null>
  >({ [initialData.meta.year]: initialData });
  const [loading, setLoading] = useState(true);
  const focusTrapRef = useFocusTrap(true);
  const yearKey = years.join(",");
  useEffect(() => {
    let active = true;
    Promise.all(
      yearKey
        .split(",")
        .map(Number)
        .map(async (value) => {
          try {
            return [
              value,
              await loadYearData<RegularBudgetContributorsData>(
                "regular-budget-contributors",
                value,
              ),
            ] as const;
          } catch {
            return [value, null] as const;
          }
        }),
    ).then((entries) => {
      if (!active) return;
      setFiles((current) => ({
        ...Object.fromEntries(entries.filter(([, file]) => file !== null)),
        ...current,
      }));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [yearKey]);
  useEffect(() => {
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const gutter = root.style.scrollbarGutter;
    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "auto";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      root.style.overflow = overflow;
      root.style.scrollbarGutter = gutter;
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  const file = files[year];
  const member = file?.contributors.find((item) => item.name === name);
  const history = [...years]
    .sort((a, b) => a - b)
    .map((value) => ({
      year: value,
      file: files[value],
      member: files[value]?.contributors.find((item) => item.name === name),
    }));
  const availableYears = history
    .filter((item) => item.member)
    .map((item) => item.year)
    .reverse();
  const status = member
    ? REGULAR_BUDGET_STATUS_STYLES[member.payment_status]
    : null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regular-budget-contributor-title"
        className="h-full w-full bg-white shadow-2xl sm:w-[32rem]"
      >
        <FinancialDetailPanel
          title={name}
          titleId="regular-budget-contributor-title"
          subtitle="Regular budget contributions"
          controls={
            <SidebarControls
              shareHash={`regular-budget-contributor=${encodeURIComponent(name)}`}
              onClose={onClose}
              closeLabel="Close contributor details"
            />
          }
          yearSelectorPlacement="header"
          yearSelector={{
            years: availableYears,
            selected: year,
            label: "Select year",
            onChange: setYear,
          }}
          total={
            member
              ? {
                  label: "Assessed amount",
                  value: formatAssessmentCurrency(member.assessment_amount),
                }
              : undefined
          }
          className="bg-white sm:w-full"
        >
          {member && file && status && (
            <>
              <dl className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-sm">
                <dt>Assessment rate</dt>
                <dd className="text-end">
                  {formatAssessmentRate(member.assessment_rate)}
                </dd>
                <dt>Payment status</dt>
                <dd className="text-end">
                  <LegendLabel label={status.label} color={status.color} />
                </dd>
                <dt>Status as of</dt>
                <dd className="text-end">
                  {formatAssessmentDate(file.meta.as_of)}
                </dd>
              </dl>
              <FinancialPanelSection heading="Payment timing">
                <dl className="grid grid-cols-[1fr_auto] gap-2 text-sm">
                  <dt>Payment deadline</dt>
                  <dd className="text-end">
                    {formatAssessmentDate(file.meta.due_date)}
                  </dd>
                  <dt>Paid in full</dt>
                  <dd className="text-end">
                    {member.payment_date
                      ? formatAssessmentDate(member.payment_date)
                      : "Not listed"}
                  </dd>
                </dl>
                <p className="mt-2 text-sm text-gray-500">
                  Partial payments are not tracked here. Not listed as paid in
                  full does not mean no payment was made.
                </p>
              </FinancialPanelSection>
            </>
          )}
          <FinancialPanelSection heading="Assessment history">
            {loading ? (
              <p role="status" className="text-sm text-gray-500">
                Loading assessment history…
              </p>
            ) : (
              <>
                <FinancingInstrumentChart
                  compact
                  showLegend={false}
                  data={history.map((item) => ({
                    year: String(item.year),
                    ...(item.member
                      ? { assessed: item.member.assessment_amount }
                      : {}),
                  }))}
                  series={[
                    {
                      key: "assessed",
                      label: "Assessed amount",
                      color: "var(--color-un-blue)",
                    },
                  ]}
                  tooltipValueFormatter={formatAssessmentCurrency}
                />
                {history.some((item) => !item.member) && (
                  <p className="mt-2 text-sm text-gray-500">
                    Some years are unavailable and appear as gaps.
                  </p>
                )}
              </>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Assessments are the amounts the Member State was required to pay
              each year, not the payments actually received.
            </p>
          </FinancialPanelSection>
          <FinancialPanelSection heading="Payment history">
            <div className="space-y-3">
              {[...history].reverse().map((item) => (
                <div
                  key={item.year}
                  className="grid grid-cols-[3rem_1fr] items-start gap-2 text-sm"
                >
                  <span>{item.year}</span>
                  {item.member && item.file ? (
                    <div>
                      <LegendLabel
                        label={
                          REGULAR_BUDGET_STATUS_STYLES[
                            item.member.payment_status
                          ].label
                        }
                        color={
                          REGULAR_BUDGET_STATUS_STYLES[
                            item.member.payment_status
                          ].color
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {item.member.payment_date
                          ? `Paid in full ${formatAssessmentDate(item.member.payment_date)} · `
                          : ""}
                        Status as of{" "}
                        {formatAssessmentDate(item.file.meta.as_of)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-500">
                      {loading ? "Loading…" : "Unavailable"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </FinancialPanelSection>
          {file && (
            <details key={year} className="group/sources mt-4">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                <FinancialPanelHeading subheading>
                  Source references
                </FinancialPanelHeading>
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 group-open/sources:rotate-90"
                />
              </summary>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <a
                  className="text-un-blue hover:underline"
                  href={file.meta.sources.assessment_document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Assessment document:{" "}
                  {file.meta.sources.assessment_document.symbol}
                </a>
                <a
                  className="text-un-blue hover:underline"
                  href={
                    file.meta.sources.honour_roll.archive_url ||
                    file.meta.sources.honour_roll.url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Payment status: Honour Roll
                </a>
                <a
                  className="text-un-blue hover:underline"
                  href={file.meta.sources.scale.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Scale of assessments
                </a>
                <p className="text-gray-500">
                  Assessments use the source document’s{" "}
                  {file.meta.assessment_amount_column.toLowerCase()} column.
                  Historical payment statuses reflect each year’s reporting
                  snapshot.
                </p>
              </div>
            </details>
          )}
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
