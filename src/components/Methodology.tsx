import Link from "next/link";
import { Fragment } from "react";
import {
  SHOW_ADDITIONAL_TRUST_FUNDS,
  SHOW_REGULAR_BUDGET_OUTSTANDING,
} from "@/lib/featureFlags";
import cebSource from "../../public/data/ceb-source.json";
import cebMethodology from "../../data/ceb-methodology.json";
import { ExpandableCard } from "@/components/ExpandableCard";
import { ChartSourceProvider } from "@/components/ChartSource";
import { PageSourceLink } from "@/components/PageSources";

/** The complete CEB note is rendered only on About. */
export function CebMethodology() {
  const presentationNotes = cebMethodology.transformations.filter((item) =>
    ["names-and-grouping", "charts"].includes(item.id),
  );
  const financialNotes = cebMethodology.transformations.filter((item) =>
    ["revenue-breakdowns", "expenditure-breakdowns"].includes(item.id),
  );
  return (
    <div className="space-y-2" data-ceb-methodology>
      <p>
        {cebMethodology.introduction
          .split(cebMethodology.source.label)
          .map((text, index) => (
            <Fragment key={index}>
              {index > 0 && <PageSourceLink source="ceb" />}
              {text}
            </Fragment>
          ))}{" "}
        Retrieved on {cebSource.retrievedAt}.
      </p>
      <section aria-label="Notes published by CEB">
        <ExpandableCard id="ceb-source-notes" title="Notes published by CEB">
          <p className="mb-4">
            From the <PageSourceLink source="ceb" />:
          </p>
          <ol className="list-decimal space-y-3 pl-6">
            {cebMethodology.officialNotes.map((note, index) => (
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
        </ExpandableCard>
      </section>
      <ExpandableCard id="ceb-presentation" title="How we present CEB data">
        <div className="space-y-6">
          <div className="space-y-4">
            {presentationNotes.map((item) => (
              <p key={item.id}>{item.text}</p>
            ))}
            {cebMethodology.readingNotes.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
          </div>
          {financialNotes.map((item) => (
            <div key={item.id} className="space-y-2">
              <h4 className="font-semibold text-gray-900">{item.title}</h4>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </ExpandableCard>
    </div>
  );
}

/** Chart records stay on their data page; explanatory text lives on About. */
function PageMethodologyLink({
  href,
  targetId,
}: {
  href: string;
  targetId: string;
}) {
  return (
    <section
      className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16"
      aria-label="Data references"
      data-page-references
    >
      <div className="border-t border-gray-200 pt-4">
        <Link
          href={href}
          className="text-sm text-un-blue underline underline-offset-2"
          data-methodology-link
        >
          Sources and methodology
        </Link>
        <div id={targetId} className="mt-4 space-y-4 empty:hidden" />
      </div>
    </section>
  );
}

export function CebMethodologyLink() {
  return (
    <PageMethodologyLink
      href="/about/#ceb-methodology"
      targetId="page-chart-source-notes"
    />
  );
}

export function UninfoMethodology() {
  return (
    <p>
      Country and goal sidebars use <PageSourceLink source="uninfo" /> data on
      resources required, available and spent for UN Cooperation Framework
      activities in programme countries. We group reported figures by country,
      organization and goal. Shared workspace totals are labelled;
      country-by-goal breakdowns use records with a verified country and annual
      reporting period.
    </p>
  );
}

export function SecretariatMethodology() {
  return (
    <p>
      The Secretariat pages bring together the annual-report compilation,
      programme-budget tables, assessment circulars and individual trust-fund
      accounts. Each view follows the scope of its source.
    </p>
  );
}

export const SECRETARIAT_METHODOLOGY_PAGES = [
  {
    id: "overview",
    href: "/secretariat",
    title: "Overview",
    source: "UN Secretariat programme budget and financial statements",
  },
  {
    id: "programme-budget",
    href: "/secretariat/programme-budget",
    title: "Programme Budget",
    source: "Proposed Programme Budget documents",
  },
  {
    id: "programme-budget-contributors",
    href: "/secretariat/programme-budget/contributors",
    title: "Programme Budget — Contributors",
    source:
      "UN assessment circulars, regular-budget honour roll and financial situation presentations",
  },
  {
    id: "peacekeeping-budget",
    href: "/secretariat/peacekeeping-budget",
    title: "Peacekeeping Budget",
    source: "Peacekeeping budget and performance reports",
  },
  {
    id: "peacekeeping-contributors",
    href: "/secretariat/peacekeeping-budget/contributors",
    title: "Peacekeeping Budget — Contributors",
    source: "UN peacekeeping assessment circulars",
  },
  {
    id: "trust-funds",
    href: "/secretariat/trust-funds",
    title: "Trust Funds",
    source: SHOW_ADDITIONAL_TRUST_FUNDS
      ? "UN Secretariat trust-fund schedules and separate entity reports"
      : "UN Secretariat trust-fund schedules",
  },
  {
    id: "trust-fund-contributors",
    href: "/secretariat/trust-funds/contributors",
    title: "Trust Funds — Contributors",
    source: SHOW_ADDITIONAL_TRUST_FUNDS
      ? "UN Secretariat trust-fund schedules and separate contributor reports"
      : "UN Secretariat trust-fund schedules",
  },
  {
    id: "field-missions",
    href: "/secretariat/field-missions",
    title: "Field Missions",
    source: "UN Secretariat field-mission data",
  },
] as const;

export type SecretariatMethodologyPage =
  (typeof SECRETARIAT_METHODOLOGY_PAGES)[number]["id"];

export function SecretariatPageMethodologyContent({
  page,
}: {
  page: SecretariatMethodologyPage;
}) {
  return (
    <div className="space-y-4" data-secretariat-methodology={page}>
      {page === "overview" && <SecretariatOverviewMethodologyNotes />}
      {page === "programme-budget" && <ProgrammeBudgetMethodologyNotes />}
      {page === "programme-budget-contributors" && (
        <ProgrammeBudgetContributorsMethodologyNotes />
      )}
      {page === "peacekeeping-budget" && <PeacekeepingBudgetMethodologyNotes />}
      {page === "peacekeeping-contributors" && (
        <PeacekeepingContributorsMethodologyNotes />
      )}
      {page === "trust-funds" && <TrustFundsMethodologyNotes />}
      {page === "trust-fund-contributors" && (
        <TrustFundContributorsMethodologyNotes />
      )}
      {page === "field-missions" && <FieldMissionsMethodologyNotes />}
    </div>
  );
}

export function SecretariatMethodologyLink({
  page,
}: {
  page: SecretariatMethodologyPage;
}) {
  return (
    <PageMethodologyLink
      href={`/about/#secretariat-${page}`}
      targetId="secretariat-chart-source-notes"
    />
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

function SourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  );
}

function SecretariatOverviewMethodologyNotes() {
  return (
    <>
      <p>
        The Overview shows resources by department, office, mission and General
        Assembly priority. It uses the financial compilation prepared for the
        Secretary-General’s <PageSourceLink source="annualReport" />.
      </p>
      <p>The compilation brings together the following sources:</p>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <strong>Regular budget:</strong> expenditure reported in the{" "}
          <PageSourceLink source="programmeBudget" />, with detail by department
          and office.
        </li>
        <li>
          <strong>Other assessed resources:</strong> peacekeeping mission and
          support-account budget and performance reports, and reports on the
          International Residual Mechanism for Criminal Tribunals.
          Support-account resources are assigned to the departments using them.
        </li>
        <li>
          <strong>Extrabudgetary resources:</strong> financial-statement data
          prepared by fund for the annual report. The{" "}
          <PageSourceLink source="trustFunds" /> provide related fund accounts;
          the annual-report compilation has its own presentation, whose fund
          amounts can differ from the schedules’ expense column.
        </li>
      </ul>
      <p>
        UNEP, UN-Habitat and UNODC publish separate financial statements. The
        compilation includes their separately reported non-regular-budget
        amounts alongside their programme-budget figures. ITC’s extrabudgetary
        amount instead comes from programme-budget tables, converted from Swiss
        francs in the source compilation. These amounts cover resources outside
        the regular budget, including some assessed financing.
      </p>
      <p>
        The resulting total combines budget-basis expenditure and
        financial-statement figures. Regular-budget years are calendar years;
        peacekeeping periods run from July to June. The 2025 compilation uses
        budget allocations (apportionments) for peacekeeping missions and the
        support account, as shown in{" "}
        <SourceLink href="https://documents.un.org/api/symbol/access?s=A%2F80%2F643&l=en&t=pdf#page=74">
          A/80/643, table 25
        </SourceLink>{" "}
        and{" "}
        <SourceLink href="https://documents.un.org/doc/undoc/gen/n26/024/72/pdf/n2602472.pdf#page=12">
          A/80/631, table 2
        </SourceLink>
        . Some Residual Mechanism rows also use budget figures.
      </p>
      <p>
        We retain the compilation’s amounts and funding categories, with
        Voluntary labelled Extrabudgetary to reflect that wider scope. Entity
        tiles follow the compilation’s priority allocations, so an entity can
        appear under more than one priority. Sidebar breakdowns retain those
        allocations. Flow ribbons show positive amounts; totals retain signed
        adjustments. Unitemized amounts remain grouped by reporting entity.
      </p>
    </>
  );
}

function ProgrammeBudgetMethodologyNotes() {
  return (
    <>
      <p>
        The <PageSourceLink source="programmeBudget" /> set out the
        Secretary-General’s proposals by budget section and programme. They also
        report approved budgets and expenditure for earlier years. We extract
        these tables to show proposed and approved regular budgets, and reported
        expenditure by funding source.
      </p>
      <p>
        Extrabudgetary expenditure on this page comes from those budget tables.
        Some figures are published before the financial statements are final:
        the 2026 documents for{" "}
        <SourceLink href="https://docs.un.org/en/A/80/6(Sect.17)">
          UN-Women
        </SourceLink>{" "}
        and{" "}
        <SourceLink href="https://docs.un.org/en/A/80/6(Sect.25)">
          UNHCR
        </SourceLink>{" "}
        explicitly identify their 2024 expenditure as provisional. Coverage and
        accounting treatment differ from the fund accounts on the Trust Funds
        page and the compilation used in the Overview.
      </p>
      <h4 className="font-semibold text-gray-900">
        Entities with separate budgets
      </h4>
      <p>
        The programme-budget documents also cover UNHCR, UNRWA, UN-Women, UNEP,
        UN-Habitat and UNODC. These entities publish their own financial
        statements and receive regular-budget allocations for specified work. In
        the{" "}
        <SourceLink href="https://documents.un.org/doc/undoc/gen/n24/219/52/pdf/n2421952.pdf#page=243">
          UN accounts, Volume I, Note 1
        </SourceLink>
        , these allocations are recorded as grants. Their wider operations,
        largely financed by voluntary contributions, are also described in the
        programme-budget documents. The extrabudgetary columns therefore extend
        beyond departments and offices financed through the regular budget.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <SourceLink href="https://docs.un.org/en/A/80/6(Sect.25)">
            UNHCR
          </SourceLink>
          : its 1950 statute provides for administrative expenses to be met from
          the UN budget; its operational programme has its own budget approved
          by the UNHCR Executive Committee.
        </li>
        <li>
          <SourceLink href="https://www.un.org/unispal/document/auto-insert-184638/">
            UNRWA
          </SourceLink>
          : regular-budget support began with the decision to fund
          international-staff salaries from 1975. Its programme is financed
          mainly through voluntary contributions.
        </li>
        <li>
          <SourceLink href="https://docs.un.org/en/A/RES/64/289">
            UN-Women
          </SourceLink>
          : the regular budget supports its normative intergovernmental work;
          voluntary funding supports its operational work under its Executive
          Board.
        </li>
        <li>
          <SourceLink href="https://docs.un.org/en/A/80/6(Sect.13)">
            ITC
          </SourceLink>
          : its regular budget is financed equally by the UN and WTO. Its tables
          show the joint budget and extrabudgetary resources in Swiss francs.
        </li>
      </ul>
      <p>
        Amounts retain their printed currencies. For chart areas and shares,
        Swiss-franc amounts are converted using UN Treasury operational rates,
        weighted by calendar days in the expenditure year. The original amounts
        and conversion rates are shown in the details.
      </p>
    </>
  );
}

function ProgrammeBudgetContributorsMethodologyNotes() {
  return (
    <>
      <p>
        Assessments come from <PageSourceLink source="regularAssessments" />;
        paid-in-full status and dates come from the{" "}
        <PageSourceLink source="honourRoll" />. We match Member States across
        the two sources and use the circular’s assessment amount. From 2025,
        that amount includes the Peacebuilding Fund portion assessed in the
        regular-budget circular.
      </p>
      <p>
        The payment timeline records a State’s full assessment on the date it
        appears as paid in full. The honour roll identifies full settlement;
        States absent from it can have made partial payments. Its reporting date
        is shown with the data.
      </p>
      {SHOW_REGULAR_BUDGET_OUTSTANDING && (
        <>
          <p>
            Outstanding balances come from complete autumn debtor lists in the{" "}
            <PageSourceLink source="financialSituation" /> and include earlier
            years’ arrears. A State absent from a validated complete list is
            recorded with a zero balance for that snapshot. Other missing
            observations remain unavailable.
          </p>
          <p>
            Changes compare consecutive snapshots at their stated dates. Balance
            divided by annual assessment compares accumulated debt with that
            year’s assessment and can exceed 100%. Assessment and honour-roll
            coverage begins in 2019; the 2018 balance has no corresponding
            assessment ratio.
          </p>
        </>
      )}
    </>
  );
}

function PeacekeepingBudgetMethodologyNotes() {
  return (
    <>
      <p>
        Figures come from <PageSourceLink source="peacekeepingDocuments" />. We
        extract expenditure, approved appropriations and proposals for the
        missions and service centres covered by these documents. Financial years
        run from July to June.
      </p>
      <p>
        Coverage includes RSCE, UNGSC and UNSOS. The support account, enterprise
        items and some closed-mission accounts fall outside this collection.
        UNTSO and UNMOGIP are financed from the regular budget. Member State
        assessments are shown in the contributor view, whose coverage follows
        the assessment circulars.
      </p>
    </>
  );
}

function PeacekeepingContributorsMethodologyNotes() {
  return (
    <p>
      We combine mission-by-mission{" "}
      <PageSourceLink source="peacekeepingAssessments" />, adding assessment
      sections and subtracting credits for earlier periods. The result is the
      net amount assessed to each Member State. Payments and arrears are
      separate measures. Source exceptions are identified in the selected-year
      details and the affected Member State’s sidebar.
    </p>
  );
}

function TrustFundsMethodologyNotes() {
  return (
    <>
      <p>
        The <PageSourceLink source="trustFunds" /> accompany the UN’s Volume I
        accounts and report finances for individual funds. We extract reported
        expenses and group funds by the responsible entity. Funds without an
        identified entity appear under Unmapped Trust Funds.
      </p>
      <p>
        This includes the UN-controlled funds administered by UNDP’s
        Multi-Partner Trust Fund Office and reported in Schedule 8.1. We retain
        the selected year’s printed total expenses and fund names, including
        negative corrections. These accounts form the MPTF group; the entity
        view uses the ARWO fund assignments, with fund-account groupings
        identified separately from departments. These amounts already appear in
        the ARWO-based Overview and must not be added to it again.
      </p>
      <p>
        Schedule 8.1 expenses can differ from the consolidated
        financial-statement notes and from ARWO amounts in earlier years. We
        preserve the schedule’s figures rather than replacing them with another
        presentation. Its contribution totals do not identify individual
        contributors, so those accounts are excluded from the named-contributor
        view.
      </p>
      <p>
        Totals retain negative amounts. Funds with zero or negative expenditure
        are available in the selected-year data details. Fund-level accounts can
        include transfers between funds and overlap with other Secretariat
        views.
      </p>
      {SHOW_ADDITIONAL_TRUST_FUNDS && (
        <>
          <p>
            Separately reported entities covers UNEP, UNODC, UN-Habitat and ITC.
            Entity totals use reported expenditure excluding regular-budget
            expenses where available; ITC uses gross extrabudgetary programme
            delivery. Detail uses the source’s fund, account or programme
            segments. Gross detail can differ from the entity total after
            eliminations; both are identified in the sidebar.
          </p>
          <p>
            These sources have different accounting boundaries and unreconciled
            transfers between them. Their sum is reported expenditure across the
            selected sources. Each figure links to its report; missing years
            remain unavailable.
          </p>
        </>
      )}
    </>
  );
}

function TrustFundContributorsMethodologyNotes() {
  return (
    <>
      <p>
        We extract contribution and transfer rows from the{" "}
        <PageSourceLink source="trustFunds" />, retaining refunds and
        adjustments. These are accounting flows, including inter-agency and
        internal transfers, so the same funding can appear more than once.
        Receivable balances are kept separate.
      </p>
      <p>
        Schedule 8.1 reports aggregate contributions to MPTF-managed funds
        without naming contributors. The contributor view covers the
        individually coded funds; it does not include those MPTF contribution
        totals.
      </p>
      <p>
        Each contributor is linked to the funds listed in the schedules. We
        group those funds by the Secretariat entity responsible for them, using
        the same assignments as in the expenditure view.
      </p>
      {SHOW_ADDITIONAL_TRUST_FUNDS && (
        <p>
          Separate entity views keep each source’s own measure: UN-Habitat
          interim contributions and transfers, ITC extrabudgetary funding
          received, and UNODC indicative pledges. Source periods and coverage
          are shown with the data. UNEP contributor documents are available as
          references.
        </p>
      )}
    </>
  );
}

function FieldMissionsMethodologyNotes() {
  return (
    <p>
      The map uses the annual-report compilation described in the Overview,
      showing political and peacekeeping missions with approximate geographic
      positions. Mission grouping follows the portal’s field-placement
      convention, including residual spending for historical missions. Non-field
      sanctions panels and envoys are grouped with Secretariat entities.
    </p>
  );
}
