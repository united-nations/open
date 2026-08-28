import { ExpandableCard } from "@/components/ExpandableCard";
import { SHOW_TRUST_FUNDS } from "@/lib/featureFlags";

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
        database, covering 48 UN System organizations. CEB data comes from
        audited financial statements aligned with the{" "}
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
        contributors. For 2021 onwards, contributors are categorized by type
        (Governments, Foundations, Private Sector, Multilateral Organizations,
        etc.) using the CEB&apos;s contributor classification system. For
        earlier years, contributor categories are partially available. Where
        specific donors are not identified, contributions are shown as
        aggregated totals (e.g., &ldquo;Other Foundations&rdquo;).
      </p>
      <p>
        The classification of UN Grant revenue instruments has changed over
        time. For comparability purposes, &ldquo;voluntary contributions pending
        earmarking&rdquo; grants have been categorized as &ldquo;voluntary
        non-core (earmarked) contributions&rdquo;.
      </p>
    </>
  );
}

export function OrganizationsMethodologyNotes() {
  return (
    <>
      <h4 className="font-medium text-gray-900">Expenses data</h4>
      <p>
        Expenses figures use CEB data as the primary source, covering 48+ UN
        entities. For years 2019–2023, UN Secretariat data breaks down the
        &ldquo;UN&rdquo; and &ldquo;UN-DPO&rdquo; aggregates into their
        constituent departments and peacekeeping missions (150+ sub-entities).
        Secretariat data is consolidated and eliminates internal transfers,
        resulting in slightly lower but more accurate totals than the CEB
        aggregates they replace.
      </p>
      <p>
        The number of entities reporting in each period has increased over the
        past years, and thus the total reported revenue has increased too.
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
        The allocation rules for headquarters expenditure to geographies has
        been applied inconsistently. For comparability purposes, headquarters
        expenses are assigned under the &ldquo;global and interregional&rdquo;
        category rather than the country in which the expense occurred.
      </p>
      <p>
        The CEB data set classified all Department of Peacekeeping Operations
        (DPO) mission expenditure under the &ldquo;global and
        interregional&rdquo; category. These expenses are approximately
        allocated, to the extent possible, to the country in which each mission
        occurred using the percentage of the budget allocated to each mission as
        per the DPO.
      </p>
      <p>
        The boundaries and names shown and the designations used on any map
        shown do not imply official endorsement or acceptance by the United
        Nations.
      </p>
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
          CEB: Historical actual expenditure from audited financial statements
        </li>
        <li>
          UNINFO: Planned resources and partial actuals for Cooperation
          Framework activities
        </li>
      </ul>
      <p>
        UNINFO covers approximately 120 countries with Cooperation Frameworks,
        representing roughly 40% of total UN system spending. The remainder
        includes headquarters operations, peacekeeping missions, and global
        programs outside country frameworks.
      </p>
    </>
  );
}

export function GoalsMethodologyNotes() {
  return (
    <p>
      Spending by Sustainable Development Goal uses CEB financial statistics.
      The Goals view does not use UNINFO country-programme data.
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
        a simplified public view of expenses. Secretariat data is consolidated
        and eliminates internal transfers, so totals run slightly lower than the
        corresponding CEB aggregates.
      </p>
      <p>
        Entity tiles use one primary priority area for placement, except Staff
        Assessment, which remains split across priorities.
      </p>
    </>
  );
}

export function SecretariatContributorsMethodologyNotes() {
  return (
    <>
      <h4 className="font-medium text-gray-900">Programme Budget</h4>
      <p>
        Contribution amounts come from annual assessment circulars; paid-in-full
        status and dates come from the UN regular-budget honour roll, with
        assessment rates checked against the historical scale of assessments.
        The payment timeline adds a Member State&apos;s full assessment on the
        date it appears as paid in full. Partial payments are not available from
        the honour roll and are therefore not estimated.
      </p>
      <h4 className="font-medium text-gray-900">Peacekeeping Budget</h4>
      <p>
        The contributor source and its methodology will be documented when that
        dataset is added.
      </p>
      {SHOW_TRUST_FUNDS && (
        <>
          <h4 className="font-medium text-gray-900">Trust Funds</h4>
          <p>
            Recognized contributions come from audited Schedules of Individual
            Trust Funds. Entity grouping uses a reconstructed historical
            crosswalk; it identifies the entity responsible for a fund, not a
            direct link between a contributor and a particular expense.
          </p>
        </>
      )}
    </>
  );
}

export function ProgrammeBudgetMethodologyNotes() {
  return (
    <p>
      Spending data comes from Proposed Programme Budget documents and their
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
        The map shows peacekeeping operation expenses from the Secretariat
        overview series (calendar year). Special political missions are not
        included on this page.
      </p>
      <p>
        A view based on peacekeeping budget and performance-report data on
        July–June financial cycles will be added later. The contributor source
        and its methodology will be documented when that dataset is added.
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
    <p>
      Expenses come from audited Schedules of Individual Trust Funds. Entity
      grouping uses a reconstructed historical crosswalk; it identifies the
      entity responsible for a fund, not a direct link between a contributor and
      a particular expense.
    </p>
  );
}
