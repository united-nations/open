"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import { FinancialPanelHeading } from "@un-eosg/ui/components/financial-panel-parts";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { typography } from "@un-eosg/ui/typography";
import { PooledFundsMetricHelp } from "@/components/PooledFundsMetricHelp";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { SidebarControls } from "@/components/SidebarControls";
import { ExpandableText } from "@/components/ExpandableText";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { PooledFundsRankedRows } from "@/components/PooledFundsRankedRows";
import { usePooledFundYear } from "@/hooks/usePooledFunds";
import { replaceToSidebar } from "@/hooks/useDeepLink";
import {
  formatPooledAmount,
  pooledFundTypeLabel,
  MPTF_FEEDER_TYPE,
  MPTF_SOURCE,
  POOLED_FUND_METRICS,
} from "@/lib/pooledFunds";
import type { PooledFundsIndex, PooledFundMetric } from "@/types";

export function PooledFundsSidebar({
  data,
  fundId,
  initialYear,
  onClose,
}: {
  data: PooledFundsIndex;
  fundId: string;
  initialYear: number;
  onClose: () => void;
}) {
  const [year, setYear] = useState(initialYear);
  const [metric, setMetric] = useState<PooledFundMetric>("netTransfers");
  const resource = usePooledFundYear(year);
  const identity = data.funds[fundId];
  const fund = resource.value?.funds[fundId];
  const changeYear = (value: number) => {
    setYear(value);
    replaceToSidebar("fund", `${fundId}@${value}`);
  };
  const contributorRows = (fund?.contributors ?? []).map((row) => ({
    id: `${row.id}:${row.sourceType}`,
    name: row.name,
    amount: row.deposit,
    href: row.portalName
      ? `/system/contributors/?year=${year}#donor=${encodeURIComponent(row.portalName)}`
      : undefined,
  }));
  return (
    <DetailDrawer
      titleId="pooled-fund-title"
      onClose={onClose}
      swipeToClose
      className="overflow-hidden sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px]"
    >
      <FinancialDetailPanel
        titleId="pooled-fund-title"
        className="sm:w-full"
        contentClassName="sidebar-scroll-content"
        title={<DrawerTitle>{identity.name}</DrawerTitle>}
        subtitle={identity.url ? fundId : "Unidentified source account"}
        yearSelectorPlacement="header"
        yearSelector={{
          years: [...new Set([...data.meta.years, initialYear])].sort(
            (a, b) => b - a,
          ),
          selected: year,
          onChange: changeYear,
          label: "Select fund year",
          pending: resource.loading,
        }}
        controls={
          <SidebarControls
            shareHash={`fund=${encodeURIComponent(`${fundId}@${year}`)}`}
            onClose={onClose}
            closeLabel="Close pooled fund details"
          />
        }
      >
        <div className="space-y-6">
          <div className="space-y-3">
            {identity.description && (
              <ExpandableText
                key={`${fundId}:${identity.description}`}
                className="text-sm leading-relaxed text-gray-700"
              >
                <p data-pooled-fund-description>{identity.description}</p>
              </ExpandableText>
            )}
            {identity.url && (
              <a
                className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                href={identity.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                More about this fund on MPTF Gateway
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
          {resource.loading ? (
            <p role="status" className="text-sm">
              Loading fund data for {year}…
            </p>
          ) : resource.error ? (
            <p role="status" className="text-sm">
              Fund data could not be loaded for {year}. Please reload to try
              again.
            </p>
          ) : !fund ? (
            <p role="status" className="text-sm">
              This fund has no reported observation for {year}. Missing data is
              not zero.
            </p>
          ) : (
            <>
              <section className="space-y-2" data-pooled-annual-figures>
                <FinancialPanelHeading subheading>
                  Annual financial figures
                </FinancialPanelHeading>
                <dl className={`space-y-2 ${typography.body}`}>
                  {(
                    [
                      {
                        key: "deposits",
                        label: "Deposits excluding fund transfers",
                        help: "deposits",
                      },
                      {
                        key: "routedDeposits",
                        label: "Deposits from feeder funds",
                      },
                      {
                        key: "grossDeposits",
                        label: "Total deposits received",
                      },
                      {
                        key: "refunds",
                        label: "Refunds to contributors (signed)",
                      },
                      {
                        key: "netTransfers",
                        label: "Net transfers (unconsolidated)",
                        help: "netTransfers",
                      },
                      {
                        key: "expenditure",
                        label: "Reported expenditure (unconsolidated)",
                        help: "expenditure",
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <dt className="min-w-0">
                        {item.label}
                        {"help" in item && (
                          <PooledFundsMetricHelp metric={item.help} />
                        )}
                      </dt>
                      <dd className={`shrink-0 ${typography.numeric}`}>
                        {formatPooledAmount(fund[item.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <PooledFundsRankedRows
                title="Contributor deposits"
                rows={contributorRows.filter(
                  (_, index) =>
                    fund.contributors[index].sourceType !== MPTF_FEEDER_TYPE,
                )}
              />
              <PooledFundsRankedRows
                title="Deposits from feeder funds"
                rows={contributorRows.filter(
                  (_, index) =>
                    fund.contributors[index].sourceType === MPTF_FEEDER_TYPE,
                )}
                color="#6b7280"
              />
              <PooledFundsRankedRows
                title="Refunds to contributors"
                rows={fund.contributors.map((row) => ({
                  id: `${row.id}:${row.sourceType}`,
                  name: row.name,
                  amount: row.refund,
                }))}
                color="#6b7280"
              />
              <SegmentedControl
                label="Recipient measure"
                value={metric}
                onValueChange={(value) => setMetric(value as PooledFundMetric)}
                options={(["netTransfers", "expenditure"] as const).map(
                  (value) => ({
                    value,
                    label: POOLED_FUND_METRICS[value].shortLabel,
                    description: POOLED_FUND_METRICS[value].note,
                  }),
                )}
              />
              <PooledFundsRankedRows
                title="Participating organizations"
                rows={fund.organizations.map((row) => ({
                  id: row.id ?? row.name,
                  name: row.name,
                  amount:
                    row[
                      metric === "expenditure" ? "expenditure" : "netTransfers"
                    ],
                  href: row.portalName
                    ? `/system/organizations/?year=${year}#entity=${encodeURIComponent(`${row.portalName}@${year}`)}`
                    : undefined,
                }))}
              />
              <PooledFundsRankedRows
                title="Programme countries and other locations"
                rows={fund.countries.map((row) => ({
                  id: row.id ?? row.name,
                  name: row.name,
                  amount:
                    row[
                      metric === "expenditure" ? "expenditure" : "netTransfers"
                    ],
                }))}
              />
              <p className="text-sm text-gray-600">
                Deposits and recipient flows are separate observations. Pooled
                contributions do not identify which donor financed a particular
                recipient or country. Annual transfers and expenditure are
                unconsolidated and are not added together.
              </p>
            </>
          )}
          <section className="space-y-2">
            <FinancialPanelHeading subheading>
              Deposits over time
            </FinancialPanelHeading>
            <FinancingInstrumentChart
              data={data.annual.map((annual) => ({
                year: String(annual.year),
                deposits: annual.funds[fundId]?.deposits ?? null,
              }))}
              series={[
                {
                  key: "deposits",
                  label: "Deposits excluding fund transfers",
                  color: POOLED_FUND_METRICS.deposits.color,
                },
              ]}
              allowNegative
              showLegend={false}
              accessibleTableLabel={`${identity.name}: deposits excluding fund transfers`}
            />
          </section>
          {fund && (fund.category || fund.typology || fund.scope) && (
            <details
              className="text-sm text-gray-600"
              data-pooled-fund-metadata
            >
              <summary className="cursor-pointer">Fund details</summary>
              <dl className="mt-3 space-y-2">
                {fund.category && (
                  <div className="flex justify-between gap-4">
                    <dt>Theme</dt>
                    <dd className="text-right text-gray-700">
                      {fund.category}
                    </dd>
                  </div>
                )}
                {fund.typology && (
                  <div className="flex justify-between gap-4">
                    <dt>Fund type</dt>
                    <dd className="text-right text-gray-700">
                      {pooledFundTypeLabel(fund.typology)}
                    </dd>
                  </div>
                )}
                {fund.scope && (
                  <div className="flex justify-between gap-4">
                    <dt>Geographic scope</dt>
                    <dd className="text-right text-gray-700">
                      {fund.scope === "Global/Interregional"
                        ? "Global and interregional"
                        : fund.scope}
                    </dd>
                  </div>
                )}
              </dl>
            </details>
          )}
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer">Source references</summary>
            <div className="mt-3 space-y-2">
              {identity.descriptionSource && (
                <p>
                  <a className="underline" href={identity.descriptionSource}>
                    MPTF fund profile
                  </a>
                  : description from the current profile, retrieved{" "}
                  {identity.descriptionRetrievedAt?.slice(0, 10)}. This
                  description is not a year-specific financial observation.
                </p>
              )}
              <p>
                <a
                  className="underline"
                  href={`${MPTF_SOURCE}/analyze-all-contributions`}
                >
                  MPTF contribution data
                </a>
                : January–December {year}, deposits and refunds by fund and
                contributor.
              </p>
              <p>
                <a
                  className="underline"
                  href={`${MPTF_SOURCE}/analyze-all-projects`}
                >
                  MPTF recipient data
                </a>
                : January–December {year}, net transfers and reported
                expenditure by fund, source agency and location.
              </p>
              <p>
                {resource.value
                  ? `Snapshot: ${resource.value.snapshotAt.slice(0, 10)}. `
                  : ""}
                Expenditure depends on participating organizations’ reporting
                and can be revised. Fund balances and delivery rates are not
                derived from annual flows.
              </p>
            </div>
          </details>
        </div>
      </FinancialDetailPanel>
    </DetailDrawer>
  );
}
