import { SHOW_UNINFO } from "@/lib/featureFlags";
import cebSource from "../../public/data/ceb-source.json";
import { ExpandableCard } from "@/components/ExpandableCard";

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
  return (
    <>
      <p>
        Data is sourced from the{" "}
        <a
          href="https://unsceb.org/financial-statistics"
          className="underline hover:text-un-blue"
          target="_blank"
          rel="noopener noreferrer"
        >
          UN Chief Executives Board (CEB) financial statistics
        </a>{" "}
        database. Reporting coverage varies by year; 47 agency codes report in
        2025, and ITC did not submit 2025 data. CEB data comes from audited
        financial statements aligned with the{" "}
        <a
          href="https://unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data"
          className="underline hover:text-un-blue"
          target="_blank"
          rel="noopener noreferrer"
        >
          Data Standards for UN System-Wide Reporting of Financial Data
        </a>
        .
      </p>
      <p>
        All available years use the CEB release downloaded on{" "}
        {cebSource.retrievedAt}, including revised historical figures. Goals
        data currently ends in 2024.
      </p>
      <p>
        Revenue includes contributions and other revenue recognized in financial
        statements; it does not necessarily represent cash received. Expenditure
        is the portal’s display term for reported expenses. Source accounting
        bases remain as documented for each dataset.
      </p>
      <p>
        CEB figures aggregate individual entity statements without adjusting for
        inter-agency transfers, so system-wide totals are inflated by
        double-counting.
      </p>
      <p>
        Under the leadership of the Chief Executives Board for Coordination
        (CEB), the UN has made significant improvements to financial data
        standardization and reporting over the past few years. For this reason,
        results are not perfectly comparable year-to-year.
      </p>
    </>
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
        calculated remainders. Unattributed means the contributor is
        unidentified. For 2021 onwards, contributors are categorized by type
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
      <p>
        The classification of CEB financing instruments has changed over time.
        For comparability purposes, &ldquo;voluntary contributions pending
        earmarking&rdquo; grants have been categorized as &ldquo;voluntary
        non-core (earmarked) contributions&rdquo;.
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
      <p>
        The classification of UN System Functions has changed over time. For
        comparability purposes, the previous &ldquo;normative, treaty-related
        and knowledge creation activities&rdquo; and &ldquo;technical
        cooperation&rdquo; functions have been aggregated under the new
        &ldquo;global agenda and specialised assistance&rdquo; function.
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
      that the expenditure is unrelated to the SDGs. Available years end in
      2024.
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
