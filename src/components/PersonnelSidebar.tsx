"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelTotalRow,
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { SidebarControls } from "@/components/SidebarControls";
import {
  formatPeople,
  personnelSexTotals,
  type PersonnelData,
} from "@/lib/personnel";

export interface PersonnelDetail {
  kind: "org" | "entity" | "duty" | "nationality";
  key: string;
  scope: string;
}

export function PersonnelSidebar({
  data,
  selectedYear,
  loading,
  error,
  onRetry,
  detail,
  years,
  onYearChange,
  onClose,
  onOpenSecretariat,
  onRestoreFocus,
  organizationCodes,
  scopeLabel,
}: {
  data: PersonnelData;
  selectedYear: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  detail: PersonnelDetail;
  years: number[];
  onYearChange: (year: number) => void;
  onClose: () => void;
  onOpenSecretariat?: () => void;
  onRestoreFocus: () => void;
  organizationCodes?: readonly string[];
  scopeLabel?: string;
}) {
  const organization =
    detail.kind === "org"
      ? data.organizations.find((item) => item.org === detail.key)
      : null;
  const geography =
    detail.kind === "duty" ? data.dutyStations : data.nationalities;
  const inScope = (org: string) =>
    organizationCodes
      ? organizationCodes.includes(org)
      : detail.scope === "all" || org === detail.scope;
  const records = geography.filter(
    (item) => item.iso3 === detail.key && inScope(item.org),
  );
  const entity =
    detail.kind === "entity"
      ? data.organizations
          .find((item) => item.sourceOrg === "UN")
          ?.entities.find((item) => item.entity === detail.key)
      : undefined;
  const title =
    detail.kind === "entity"
      ? detail.key === "NA"
        ? "Entity not reported"
        : detail.key
      : detail.kind === "org"
        ? detail.key
        : (records[0]?.country ?? detail.key);
  const total =
    detail.kind === "entity"
      ? (entity?.count ?? null)
      : (organization?.total ??
        (detail.kind === "org"
          ? null
          : records.length
            ? records.reduce((sum, item) => sum + item.count, 0)
            : null));
  const aggregate = (items: { label: string; count: number }[]) => {
    const grouped = new Map<string, number>();
    for (const item of items)
      grouped.set(item.label, (grouped.get(item.label) ?? 0) + item.count);
    return [...grouped]
      .map(([label, count]) => ({
        label: label === "NA" ? "Not reported" : label,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  };
  const sex = personnelSexTotals(
    data.composition.filter((item) => item.org === detail.key),
  );
  const sections =
    detail.kind === "entity"
      ? []
      : detail.kind === "org"
        ? [
            {
              title: "Gender",
              rows: [
                { label: "Women", count: sex.female },
                { label: "Men", count: sex.male },
                { label: "Not reported", count: sex.unknown },
              ],
            },
            {
              title: "Staff categories",
              rows: aggregate(
                data.composition
                  .filter((item) => item.org === detail.key)
                  .map((item) => ({ label: item.category, count: item.count })),
              ),
            },
            {
              title: "Countries of duty",
              rows: aggregate(
                data.dutyStations
                  .filter((item) => item.org === detail.key)
                  .map((item) => ({ label: item.country, count: item.count })),
              ),
            },
            {
              title: "Nationalities",
              rows: aggregate(
                data.nationalities
                  .filter((item) => item.org === detail.key)
                  .map((item) => ({ label: item.country, count: item.count })),
              ),
            },
            ...(organization?.entities.some((item) => item.entity !== "NA")
              ? [
                  {
                    title: "Reported UN entities",
                    rows: organization.entities
                      .map((item) => ({
                        label:
                          item.entity === "NA"
                            ? "Entity not reported"
                            : item.entity,
                        count: item.count,
                      }))
                      .sort((a, b) => b.count - a.count),
                  },
                ]
              : []),
          ]
        : [
            {
              title: "Organizations",
              rows: aggregate(
                records.map((item) => ({ label: item.org, count: item.count })),
              ),
            },
            ...(detail.kind === "duty"
              ? [
                  {
                    title: "Duty stations",
                    rows: aggregate(
                      data.dutyStations
                        .filter(
                          (item) =>
                            item.iso3 === detail.key && inScope(item.org),
                        )
                        .map((item) => ({
                          label: item.station,
                          count: item.count,
                        })),
                    ),
                  },
                ]
              : []),
          ];
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-modal="true"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus();
          }}
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full bg-white shadow-xl sm:w-2/3 lg:w-1/3 lg:min-w-[500px]"
        >
          <Dialog.Title className="sr-only">{title} personnel</Dialog.Title>
          <FinancialDetailPanel
            title={title}
            titleId="personnel-sidebar-title"
            subtitle={
              detail.kind === "entity"
                ? "Reported UN Secretariat entity"
                : detail.kind === "org"
                  ? "CEB personnel statistics"
                  : `${detail.kind === "duty" ? "Country of duty station" : "Nationality"} · ${scopeLabel ?? (detail.scope === "all" ? "All organizations" : detail.scope)}`
            }
            className="sm:w-full"
            yearSelectorPlacement="header"
            yearSelector={{
              label: "Select personnel year",
              years,
              selected: selectedYear,
              onChange: onYearChange,
            }}
            controls={
              <SidebarControls
                onClose={onClose}
                closeLabel="Close personnel sidebar"
                shareHash={`personnel=${encodeURIComponent(`${detail.kind}|${detail.key}|${detail.scope}@${selectedYear}`)}`}
              />
            }
          >
            {loading ? (
              <p role="status" className="py-8 text-sm text-gray-600">
                Loading personnel data for {selectedYear}…
              </p>
            ) : error ? (
              <p role="alert" className="py-8 text-sm text-gray-600">
                Personnel data could not be loaded for {selectedYear}.{" "}
                <button type="button" className="underline" onClick={onRetry}>
                  Try again
                </button>
              </p>
            ) : (
              <div className="space-y-5">
                <FinancialPanelTotalRow
                  label={`Staff at 31 December ${data.year}`}
                  value={total === null ? "Unavailable" : formatPeople(total)}
                />
                {detail.kind === "entity" && total !== null && (
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>Included once within UN Secretariat staff.</p>
                    {detail.key === "DPO" && (
                      <p>
                        DPO here is the Department of Peace Operations. It is
                        not the financial UN-DPO peacekeeping aggregate.
                      </p>
                    )}
                    <p>
                      CEB reports this entity’s headcount. Grade, gender, duty
                      station and nationality data are published for the UN
                      Secretariat as a whole, without this entity breakdown.
                    </p>
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={onOpenSecretariat}
                    >
                      Explore all UN Secretariat staff
                    </button>
                  </div>
                )}
                {total === null ? (
                  <p className="text-sm text-gray-600">
                    No personnel records are available for this selection.
                  </p>
                ) : (
                  sections.map((section) => (
                    <section key={section.title}>
                      <FinancialPanelHeading>
                        {section.title}
                      </FinancialPanelHeading>
                      {section.rows.slice(0, 8).map((row) => (
                        <FinancialPanelRankedRow
                          key={row.label}
                          label={row.label}
                          value={formatPeople(row.count)}
                        >
                          <FinancialPanelBar
                            percent={
                              (100 * row.count) /
                              Math.max(
                                1,
                                ...section.rows.map((item) => item.count),
                              )
                            }
                            color="#009edb"
                          />
                        </FinancialPanelRankedRow>
                      ))}
                      {section.rows.length > 8 && (
                        <details className="mt-3 text-xs text-gray-600">
                          <summary className="w-fit cursor-pointer underline underline-offset-2">
                            Show all {section.rows.length}{" "}
                            {section.title.toLocaleLowerCase()}
                          </summary>
                          {section.rows.slice(8).map((row) => (
                            <FinancialPanelRankedRow
                              key={row.label}
                              label={row.label}
                              value={formatPeople(row.count)}
                            >
                              <FinancialPanelBar
                                percent={
                                  (100 * row.count) /
                                  Math.max(
                                    1,
                                    ...section.rows.map((item) => item.count),
                                  )
                                }
                                color="#009edb"
                              />
                            </FinancialPanelRankedRow>
                          ))}
                        </details>
                      )}
                    </section>
                  ))
                )}
                <p className="text-xs leading-relaxed text-gray-500">
                  Staff with a contract of at least one year or at least one
                  year of employment. Consultants, contractors and other
                  non-staff personnel are excluded. HR reporting scope can
                  differ from financial reporting.
                </p>
                <p className="text-xs text-gray-600">
                  Source:{" "}
                  <a
                    className="underline"
                    href={`https://unsceb.org/assets/data/HR/${detail.kind === "org" || detail.kind === "entity" ? "organization" : detail.kind === "duty" ? "duty_station" : "nationality"}.csv`}
                  >
                    CEB personnel data
                  </a>
                  ;{" "}
                  <a
                    className="underline"
                    href="https://unsceb.org/assets/data/HR/composition.csv"
                  >
                    grade and gender
                  </a>
                  ;{" "}
                  <a
                    className="underline"
                    href="https://unsceb.org/assets/data/HR/ceb_hr_codebook_v1.0.md?v=1.0"
                  >
                    definitions
                  </a>
                  .
                </p>
              </div>
            )}
          </FinancialDetailPanel>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
