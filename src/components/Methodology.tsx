import { SHOW_UNINFO } from "@/lib/featureFlags";
import cebSource from "../../public/data/ceb-source.json";
import cebMethodology from "../../data/ceb-methodology.json";
import manifest from "../../public/data/manifest.json";
import { ExpandableCard } from "@/components/ExpandableCard";
import { ChartDataDisclaimer } from "@/components/ChartDataDisclaimer";
import { ChartSourceProvider } from "@/components/ChartSource";
import { PageSourceLink } from "@/components/PageSources";

export function Methodology({ children }: { children: React.ReactNode }) {
  return (
    <PageMethodologyShell>
      <ExpandableCard id="methodology" title="Methodology">
        <div className="space-y-4">{children}</div>
      </ExpandableCard>
    </PageMethodologyShell>
  );
}

function PageMethodologyShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
      <div className="divide-y divide-gray-200 border-t border-gray-200">
        {children}
      </div>
    </section>
  );
}

export function CebMethodology() {
  const officialNotes: {
    text: string;
    links?: { label: string; url: string }[];
    portalAddition?: string;
  }[] = cebMethodology.officialNotes;
  return (
    <div className="space-y-6" data-ceb-methodology>
      <p>{cebMethodology.introduction}</p>
      {cebMethodology.readingNotes.map((note, index) => (
        <p key={index}>{note}</p>
      ))}
      <p>
        Source:{" "}
        <a
          className="underline underline-offset-2"
          href={cebMethodology.source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {cebMethodology.source.label}
        </a>
        . Retrieved on {cebSource.retrievedAt}.
      </p>
      <section aria-label="Notes published by CEB" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Notes to the Financial Statistics pages
        </h3>
        <ol className="list-decimal space-y-3 pl-6 marker:font-semibold marker:text-un-blue">
          {officialNotes.map((note, index) => (
            <li key={index}>
              {note.text}
              {note.links?.map((link) => (
                <span key={link.url}>
                  {" "}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words underline underline-offset-2"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
              {note.portalAddition && <> {note.portalAddition}</>}
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Portal data processing" className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          How the portal presents CEB data
        </h3>
        {cebMethodology.transformations.map((item) => (
          <div key={item.id} className="space-y-3">
            <h4 className="font-semibold text-gray-900">{item.title}</h4>
            {item.text.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ))}
      </section>
      <section aria-label="Current data coverage" className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Current data coverage
        </h3>
        <p>
          Revenue: {manifest.entityRevenue.min}–{manifest.entityRevenue.max}.
          Organization expenditure: {manifest.entitySpending.min}–
          {manifest.entitySpending.max}. Geography:{" "}
          {manifest.geographicExpenses.min}–{manifest.geographicExpenses.max}.
          SDG expenditure: {manifest.sdgExpenses.min}–{manifest.sdgExpenses.max}
          .
        </p>
        {cebMethodology.coverageNotes.map((note, index) => (
          <p key={index}>{note.text}</p>
        ))}
      </section>
    </div>
  );
}

export function CebPageMethodology({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <section
      className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16"
      aria-label="Sources and methodology"
      data-page-methodology
    >
      <ExpandableCard id="methodology" title="Sources and methodology">
        <CebMethodology />
        {children && (
          <section
            className="mt-8 space-y-4 border-t border-gray-200 pt-6"
            aria-label="Additional notes for this page"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Additional notes for this page
            </h3>
            {children}
          </section>
        )}
      </ExpandableCard>
    </section>
  );
}

export function ContributorsMethodologyNotes() {
  return (
    <>
      <h4 className="font-medium text-gray-900">Revenue data</h4>
      <p>
        Revenue figures combine CEB data on government and non-government
        contributors and other revenue, including revenue from activities.
        Contributor-view totals include signed adjustments; they do not
        eliminate inter-agency transfers. Other revenue is a financing
        instrument, while Other contributor categories are aggregates or
        calculated remainders. Unattributed is revenue not assigned within the
        financing breakdown; it includes missing attribution and unresolved
        financing. For 2021 onwards, contributors are categorized by type
        (Governments, Foundations, Private Sector, Multilateral Organizations,
        etc.) using the CEB&apos;s contributor classification system. For
        earlier years, contributor categories are partially available. Where
        specific contributors are not identified, contributions are shown as
        aggregated totals (e.g., &ldquo;Other Foundations&rdquo;).
      </p>
      <p>
        Where a reported total exceeds identified contributions, the remainder
        is shown as Other within the known contributor category, or Unattributed
        when the category is unknown. Blank amounts do not establish zero
        contributions. Signed reconciliation adjustments are retained when
        breakdowns exceed reported totals. The 2025 source names fewer
        non-government contributors than the updated 2024 source; category
        totals remain available.
      </p>
    </>
  );
}

export function OrganizationsMethodologyNotes() {
  return (
    <>
      <h4 className="font-medium text-gray-900">Expenditure data</h4>
      <p>
        Expenditure figures use CEB organization totals. The current System view
        retains the UN Secretariat and peacekeeping aggregates; detailed
        Secretariat budgets are available in the separate Secretariat section
        and have different accounting bases.
      </p>
      <p>
        Changes in reporting coverage and source revisions affect comparisons
        between years. ITC&apos;s absence in 2025 represents missing reporting,
        not zero expenditure.
      </p>
      <h4 className="font-medium text-gray-900">
        Revenue and expenditure flow diagram
      </h4>
      <p>
        Revenue and expenditure are independent reported dimensions. The diagram
        does not trace a contributor&apos;s funding to a destination. Detailed
        columns show the largest 12 items and combine the remainder into an
        expandable display group; these groups are separate from source
        aggregates and calculated balances.
      </p>
      <p>
        Breakdown / total difference is a signed reconciliation amount, not an
        assigned destination. Geography includes regional and global records.
        Source classification conflicts remain disclosed. The diagram retains
        CEB organization totals without Secretariat substitution.
      </p>
    </>
  );
}

export function LocationsMethodologyNotes() {
  return (
    <>
      <p>
        Geographic records follow CEB&apos;s reported country, regional and
        global allocations. Total expense records are selected once; their
        component breakdowns are not added again. Regional and global amounts
        are not distributed among countries.
      </p>
      <p>
        The chart nests countries using{" "}
        <a
          href="https://unstats.un.org/unsd/methodology/m49/overview/"
          className="underline hover:text-un-blue"
          target="_blank"
          rel="noopener noreferrer"
        >
          UN M49 geographic groupings
        </a>
        , using intermediate regions where available. This display grouping
        preserves CEB&apos;s reported regions and amounts. Countries without a
        matching classification remain under Other countries and areas.
      </p>
      <p>
        The boundaries and names shown and the designations used on any map
        shown do not imply official endorsement or acceptance by the United
        Nations.
      </p>
      <h4 className="font-medium text-gray-900">
        Map and geographic reporting levels
      </h4>
      <p>
        Country, subregional, regional and global amounts are separate reported
        records. Regional markers are illustrative positions, not operational
        locations or territorial boundaries; the global marker is placed in the
        south Pacific for readability. Circle areas represent expenditure.
        Organization filters retain the selected scale. Placement and
        source-classification notes are available on the relevant location
        tooltips.
      </p>
      <h4 className="font-medium text-gray-900">
        Function and geographic-level chart
      </h4>
      <p>
        This chart uses the function and location recorded together on CEB
        geographic expense records (E06); overlapping E06A/B/C components are
        excluded. Regional and subregional records are combined, while global
        amounts remain unallocated to countries. Negative amounts remain in net
        totals. Function attribution is complete from 2020; earlier incomplete
        attribution remains explicitly unreported. Geographic function totals
        may differ from the independently reported function totals.
      </p>
      <p>
        <a
          href="https://unsceb.org/assets/data/FS/expenses_by_country_region_sub_agency.csv"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download CEB geographic expenditure records
        </a>
        .
      </p>
      {SHOW_UNINFO && (
        <>
          <h4 className="font-medium text-gray-900">
            UN Cooperation Framework data
          </h4>
          <p>
            Country sidebars also display data from the{" "}
            <a
              href="https://uninfo.org"
              className="underline hover:text-un-blue"
              target="_blank"
              rel="noopener noreferrer"
            >
              UN Sustainable Development Cooperation Framework system (UNINFO)
            </a>
            , which tracks planned activities at the country level.
          </p>
          <p>
            <strong>Key differences from CEB data:</strong>
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              CEB: Historical actual expenditure from audited financial
              statements
            </li>
            <li>
              UNINFO: Planned resources and partial actuals for Cooperation
              Framework activities
            </li>
          </ul>
          <p>
            The geographic view includes CEB&apos;s updated historical
            allocations. UNINFO is a separate dataset with its own reporting
            periods and covers approximately 120 countries with Cooperation
            Frameworks, representing roughly 40% of total UN system expenditure.
            The remainder includes headquarters operations, peacekeeping
            missions, and global programs outside country frameworks.
          </p>
        </>
      )}
    </>
  );
}

export function GoalsMethodologyNotes() {
  return (
    <p>
      Expenditure by Sustainable Development Goal uses CEB financial statistics.
      Only actual expenditure records are included; source budget records are
      excluded. Non-SDG preserves expenditure reported under CEB&apos;s x00
      code. Not specified is calculated per entity as CEB expenditure minus
      reported allocations to SDGs 1–17 and Non-SDG, so the total reconciles to
      organization expenditure. This separate remainder includes missing SDG
      reporting and signed reconciliation differences; it does not establish
      that the expenditure is unrelated to the SDGs. Available years run from{" "}
      {manifest.sdgExpenses.min} to {manifest.sdgExpenses.max}.
      {SHOW_UNINFO && (
        <>
          {" "}
          The goal sidebar also shows UNINFO Cooperation Framework resources, a
          separate scope and measure. Its country breakdown excludes
          shared-workspace totals and responses without a verified annual
          period.
        </>
      )}
    </p>
  );
}

export function SecretariatMethodology() {
  return (
    <p>
      These pages describe the financing of the UN Secretariat — its
      departments, offices, commissions and missions. They are not the same as
      the CEB system-wide aggregates shown under UN System Financials.
    </p>
  );
}

export const SECRETARIAT_METHODOLOGY_PAGES = [
  {
    id: "overview",
    title: "Overview",
    source: "UN Secretariat programme budget and financial statements",
  },
  {
    id: "programme-budget",
    title: "Programme Budget",
    source: "Proposed Programme Budget documents",
  },
  {
    id: "programme-budget-contributors",
    title: "Programme Budget — Contributors",
    source: "UN assessment circulars and regular-budget honour roll",
  },
  {
    id: "peacekeeping-budget",
    title: "Peacekeeping Budget",
    source: "Peacekeeping budget and performance reports",
  },
  {
    id: "peacekeeping-contributors",
    title: "Peacekeeping Budget — Contributors",
    source: "UN peacekeeping assessment circulars",
  },
  {
    id: "trust-funds",
    title: "Trust Funds",
    source: "UN Secretariat trust-fund schedules and separate entity reports",
  },
  {
    id: "trust-fund-contributors",
    title: "Trust Funds — Contributors",
    source:
      "UN Secretariat trust-fund schedules and separate contributor reports",
  },
  {
    id: "field-missions",
    title: "Field Missions",
    source: "UN Secretariat field-mission data",
  },
] as const;

export type SecretariatMethodologyPage =
  (typeof SECRETARIAT_METHODOLOGY_PAGES)[number]["id"];

function SecretariatPageSourceNotes({
  page,
}: {
  page: SecretariatMethodologyPage;
}) {
  switch (page) {
    case "overview":
      return (
        <p>
          This simplified overview is based on data from the{" "}
          <PageSourceLink source="annualReport" />.
        </p>
      );
    case "programme-budget":
      return (
        <p>
          Figures are extracted from the{" "}
          <PageSourceLink source="programmeBudget" />.
        </p>
      );
    case "programme-budget-contributors":
      return (
        <p>
          Assessment amounts come from{" "}
          <PageSourceLink source="regularAssessments" />; paid-in-full status
          and dates come from the <PageSourceLink source="honourRoll" />.
        </p>
      );
    case "peacekeeping-budget":
      return (
        <p>
          Figures are extracted from the Secretary-General’s{" "}
          <PageSourceLink source="peacekeepingDocuments" />. Learn{" "}
          <PageSourceLink source="peacekeepingFunding" />.
        </p>
      );
    case "peacekeeping-contributors":
      return (
        <p>
          Figures come from <PageSourceLink source="peacekeepingAssessments" />.
        </p>
      );
    case "trust-funds":
      return (
        <p>
          The fund schedules come from <PageSourceLink source="trustFunds" />.
          Separate entity reports are linked on their figures.
        </p>
      );
    case "trust-fund-contributors":
      return (
        <p>
          The schedule view uses <PageSourceLink source="trustFunds" />.
          Separate entity views link their own source pages.
        </p>
      );
    case "field-missions":
      return (
        <p>
          Financial figures come from the{" "}
          <PageSourceLink source="annualReport" />.
        </p>
      );
  }
}

export function SecretariatPageMethodologyContent({
  page,
  includeGeneral = true,
  includeChartNotes = false,
}: {
  page: SecretariatMethodologyPage;
  includeGeneral?: boolean;
  includeChartNotes?: boolean;
}) {
  const metadata = SECRETARIAT_METHODOLOGY_PAGES.find(
    (item) => item.id === page,
  )!;
  return (
    <div className="space-y-4" data-secretariat-methodology={page}>
      <p>Source: {metadata.source}</p>
      {includeGeneral && <SecretariatMethodology />}
      <SecretariatPageSourceNotes page={page} />
      {page === "overview" && (
        <>
          <SecretariatOverviewMethodologyNotes />
          {includeChartNotes && (
            <>
              <SecretariatFlowsMethodologyNotes mechanisms />
              <SecretariatFlowsMethodologyNotes />
            </>
          )}
        </>
      )}
      {page === "programme-budget" && <ProgrammeBudgetMethodologyNotes />}
      {page === "programme-budget-contributors" && (
        <>
          <ProgrammeBudgetContributorsMethodologyNotes />
          {includeChartNotes && <ProgrammeBudgetContributorChartNotes />}
        </>
      )}
      {page === "peacekeeping-budget" && (
        <>
          <PeacekeepingBudgetMethodologyNotes />
          {includeChartNotes && <PeacekeepingBudgetChartNotes />}
        </>
      )}
      {page === "peacekeeping-contributors" && (
        <>
          <PeacekeepingContributorsMethodologyNotes />
          {includeChartNotes && <PeacekeepingContributorChartNotes />}
        </>
      )}
      {page === "trust-funds" && <TrustFundsMethodologyNotes />}
      {page === "trust-fund-contributors" && (
        <>
          <TrustFundContributorsMethodologyNotes />
          {includeChartNotes && <TrustFundContributorChartNotes />}
        </>
      )}
      {page === "field-missions" && <FieldMissionsMethodologyNotes />}
    </div>
  );
}

export function SecretariatPageMethodology({
  page,
}: {
  page: SecretariatMethodologyPage;
}) {
  return (
    <>
      <ChartDataDisclaimer />
      <section
        className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16"
        aria-label="Sources and methodology"
        data-page-methodology
      >
        <details className="border-t border-gray-200">
          <summary
            id="methodology"
            className="cursor-pointer py-4 text-lg font-medium text-gray-900"
          >
            Sources and methodology
          </summary>
          <div className="space-y-6 py-4 text-sm leading-relaxed text-gray-600">
            <SecretariatPageMethodologyContent page={page} />
            <div
              id="secretariat-chart-source-notes"
              className="space-y-4 empty:hidden"
            />
          </div>
        </details>
      </section>
    </>
  );
}

export function SecretariatPageSourceProvider({
  page,
  children,
}: {
  page: SecretariatMethodologyPage;
  children: React.ReactNode;
}) {
  const metadata = SECRETARIAT_METHODOLOGY_PAGES.find(
    (item) => item.id === page,
  )!;
  return (
    <ChartSourceProvider
      label={metadata.source}
      details={null}
      placement="page"
      pageDetailsTargetId="secretariat-chart-source-notes"
    >
      {children}
    </ChartSourceProvider>
  );
}

export function SecretariatFlowsMethodologyNotes({
  mechanisms = false,
}: {
  mechanisms?: boolean;
}) {
  return (
    <>
      <p>
        {mechanisms
          ? "Annual-report expenditure by funding mechanism and priority area."
          : "Annual-report expenditure by funding arrangement, entity category and priority area."}{" "}
        All funding sources are included. Ribbons show gross positive
        expenditure; signed corrections remain in net totals and source details.
      </p>
      {!mechanisms && (
        <p>
          Unitemized extrabudgetary resources are shown by reporting entity.
          These remain unitemized amounts, not identified trust funds. Expansion
          preserves every source record and the total. Trust funds are shown
          together.
        </p>
      )}
      {!mechanisms && (
        <p>
          Calendar and peacekeeping periods differ. IRMCT includes
          source-labelled budget substitutes. Staff Assessment follows the
          source allocation. Treaty financing retains the original Voluntary
          tag; unresolved convention rows retain their original wording.
        </p>
      )}
    </>
  );
}

export function ProgrammeBudgetContributorChartNotes() {
  return (
    <>
      <p>
        “Not listed as paid in full” may include Member States that made a
        partial payment. It does not mean that no payment was made.
      </p>
      <p>
        From 2025, the circular&apos;s total includes the Peacebuilding Fund
        portion assessed in the regular-budget circular. Other assessed and
        extrabudgetary contributions are excluded from this view.
      </p>
    </>
  );
}

export function PeacekeepingContributorChartNotes() {
  return (
    <>
      <p>
        The displayed total sums signed net assessments represented by tiles.
        Zero and negative amounts are excluded from the treemap.
      </p>
      <p>
        Net assessments add assessment sections and subtract prior-period
        credits. They do not show payments received, arrears or voluntary
        contributions. Click a Member State to see its mission breakdown and
        source circulars.
      </p>
    </>
  );
}

export function PeacekeepingBudgetChartNotes() {
  return (
    <p>
      Approved budget means the appropriation printed in the source report.
      Fiscal years run from July to June.
    </p>
  );
}

export function TrustFundContributorChartNotes() {
  return (
    <>
      <p>
        Tile area is the signed net of extracted contribution and transfer rows;
        click a contributor to see its funds and reconstructed entity
        destinations.
      </p>
      <p>
        Entity attribution describes which Secretariat entity owns the
        destination fund; it does not prove that a contributor financed a
        particular expense.
      </p>
    </>
  );
}

export function SecretariatOverviewMethodologyNotes() {
  return (
    <>
      <p>
        This overview is the only view that combines figures from the UN
        Secretariat Programme Budget and audited financial statements to provide
        a simplified public view of expenditure on mixed accounting bases. It is
        not a single consolidated IPSAS total. Extrabudgetary amounts are
        non-regular-budget residuals, not necessarily pure voluntary funding.
        For example, UNEP 2023 combines $671,941,000 of residual expense with
        $20,859,739 of budget-basis regular expense: $692,800,739. Replacing
        only that regular component with the audited $24,701,000 explains the
        $3,841,261 difference to its $696,642,000 IPSAS total.
      </p>
      <p>
        Entity tiles use one primary priority area for placement, except Staff
        Assessment, which remains split across priorities.
      </p>
    </>
  );
}

export function ProgrammeBudgetContributorsMethodologyNotes() {
  return (
    <p>
      Contribution amounts come from annual assessment circulars; paid-in-full
      status and dates come from the UN regular-budget honour roll, with
      assessment rates checked against the historical scale of assessments. The
      payment timeline adds a Member State&apos;s full assessment on the date it
      appears as paid in full. Partial payments are not available from the
      honour roll and are therefore not estimated.
    </p>
  );
}

export function PeacekeepingContributorsMethodologyNotes() {
  return (
    <p>
      Assessed contributions come from the mission-by-mission assessment
      circulars indexed by the UN Committee on Contributions. Assessment
      sections are added and prior-period credit sections are subtracted. The
      result shows amounts assessed, not payments received or outstanding
      balances. Source-level exceptions identified during reconciliation are
      disclosed with the chart and retained in the exported data.
    </p>
  );
}

export function TrustFundContributorsMethodologyNotes() {
  return (
    <div className="space-y-3">
      <p>
        The UN Secretariat trust-fund schedules view uses audited contributions
        and transfers. Entity grouping identifies the entity responsible for a
        fund, not a direct link between a contributor and an expense.
      </p>
      <p>
        Separate source views retain their own measures: Habitat interim
        contribution status, ITC XB funding received, and UNODC indicative
        annual pledges. They are not summed across sources or compared as if all
        were audited revenue. Partial coverage, missing periods, grouped
        counterparties and source differences are shown with each series.
      </p>
      <p>
        UNEP contributor subsets are excluded from the charts. Its annual
        reports and CBD ledgers remain linked for reference. Source links use
        physical PDF pages or the original HTML fund sections, as applicable.
      </p>
    </div>
  );
}

export function ProgrammeBudgetMethodologyNotes() {
  return (
    <p>
      Expenditure data comes from Proposed Programme Budget documents and their
      published actual expenditure tables. Other assessed and extrabudgetary
      expenditure are not part of the programme budget itself and are displayed
      for informational purposes.
    </p>
  );
}

export function PeacekeepingBudgetMethodologyNotes() {
  return (
    <>
      <p>
        The map and table use peacekeeping budget and performance-report
        expenditure, approved appropriations and proposals on the July–June
        financial cycle. Only missions in that corpus are shown. Service centres
        (RSCE, UNGSC) are included and marked separately from field missions,
        including UNSOS.
      </p>
      <p>
        Observer missions paid from the regular budget (UNTSO, UNMOGIP) are not
        in this budget and are not on this map. The support account, enterprise
        items and some closed-mission accounts sit outside this corpus. The
        contributor view separately reports Member State assessments, not
        payments; its coverage differs from these mission budgets.
      </p>
    </>
  );
}

export function FieldMissionsMethodologyNotes() {
  return (
    <>
      <p>
        The map shows the geographic footprint of special political missions and
        peacekeeping missions, together with the resources assigned to them.
      </p>
      <p>
        The boundaries and names shown and the designations used on any map
        shown do not imply official endorsement or acceptance by the United
        Nations.
      </p>
    </>
  );
}

export function TrustFundsMethodologyNotes() {
  return (
    <div className="space-y-3">
      <p>
        “UN Secretariat trust-fund schedules” uses audited Schedules of
        Individual Trust Funds accompanying the UN Volume I accounts. Entity
        grouping uses a reconstructed historical crosswalk, supplemented by
        exact fund-name matches in newer ARWO workbooks. Unmatched funds appear
        under “Unmapped Trust Funds”, a display group rather than a UN entity.
        Grouping identifies responsibility for a fund, not a direct
        contributor-to-expense link.
      </p>
      <p>
        “Separately reported entities” covers UNEP, UNODC, UN-Habitat and ITC.
        For 2023–2024, entity amounts use audited expenditure excluding
        regular-budget expenses where available; ITC uses reported gross XB
        programme delivery. Years without extracted report figures remain
        unavailable. The combined headline is reported expenditure, not a
        consolidated total: cross-source transfers have not been reconciled or
        eliminated, and accounting boundaries differ. Inclusion does not
        establish that every resource is legally a trust fund.
      </p>
      <p>
        Entity areas use the reported separate-entity totals. UNEP fund groups
        and UN-Habitat funding segments subdivide those areas using relative
        shares of expenses before eliminations; tile amounts retain the gross
        source figures. Their sidebars retain further detail and reconciliation.
        Detail amounts must not be added to their parent total. A pure XB
        expense breakdown is unavailable for UNODC and ITC. Missing years are
        gaps. Figures link to the original PDF pages. ARWO is not used to fill
        missing expenditure amounts.
      </p>
      <p>
        The contributor view separates UN Secretariat trust-fund schedules from
        entity-specific reports. Habitat uses interim contributions and
        transfers and ITC uses XB funding received. UNEP contributor subsets are
        excluded; their source documents remain linked for reference. Source
        periods, measures and coverage are shown in each view; these amounts are
        not added to expenditure. UNEP accounts are grouped under the annex
        segments and subtotals printed in its reports.
      </p>
    </div>
  );
}
