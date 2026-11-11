import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import {
  SHOW_ADDITIONAL_TRUST_FUNDS,
  SHOW_REGULAR_BUDGET_OUTSTANDING,
} from "@/lib/featureFlags";
import cebSource from "../../public/data/ceb-source.json";
import cebMethodology from "../../data/ceb-methodology.json";
import { ExpandableCard } from "@/components/ExpandableCard";
import { PageSourceLink } from "@/components/PageSources";
import { DataExtractionNotice } from "@/components/ChartDataDisclaimer";
import { SectionHeading, SubsectionHeading } from "@/components/ContentHeading";
import { PageBody } from "@/components/PageBody";

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
      <p>
        The{" "}
        <a
          href="https://www.unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          UN Data Standards for system-wide financial reporting
        </a>{" "}
        define which entities report and how their financial data is classified.
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
              <SubsectionHeading as="h4">{item.title}</SubsectionHeading>
              <p>{item.text}</p>
            </div>
          ))}
          <div className="space-y-2">
            <SubsectionHeading as="h4">
              2025 SDG reconciliation
            </SubsectionHeading>
            <p>
              WMO’s $88.66 million Non-SDG record closely matches its final
              regular budget. The underlying survey entry is needed to confirm
              its basis. The portal retains the reported Non-SDG figure.
            </p>
            <p>
              IOM’s reported SDG and Non-SDG amounts together exceed its
              organization expenditure by $106.30 million. The bridge between
              budgetary and accrual expenditure leaves the excess unexplained.
              The negative Not specified balance shows the difference.
            </p>
          </div>
          <p>
            Function-by-geography figures use CEB’s E06 expenditure records.
            Function attribution is incomplete before 2020; amounts without a
            reported function stay under Function not reported. We do not infer
            functions from separate totals. Areas show positive totals; negative
            amounts remain in the reported totals. Flow ribbons show positive
            net connections, while node edges retain signed totals.
          </p>
          <p>
            Geographic totals use E06. In 2025, UNHCR’s financing detail shifts
            about $12.53 million between two global locations while their
            combined amounts agree within cents. The IMO financing detail also
            differs by location. The geographic view uses the reported location
            totals for both organizations.
          </p>
          <p>
            <a
              href="https://unsceb.org/assets/data/FS/expenses_by_country_region_sub_agency.csv"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Download the CEB geographic source data
            </a>
          </p>
        </div>
      </ExpandableCard>
    </div>
  );
}

/** Data pages link to the central source and scope notes on About. */
function PageMethodologyLink({
  href,
  extracted = false,
  extractionText,
}: {
  href: string;
  extracted?: boolean;
  extractionText?: string;
}) {
  return (
    <PageBody
      className="pt-0"
      aria-labelledby="about-the-data-heading"
      data-page-references
    >
      <SectionHeading id="about-the-data-heading">
        About the data
      </SectionHeading>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
        See where the data comes from and how we present it.
      </p>
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-un-blue-text underline underline-offset-2"
        data-methodology-link
      >
        Sources and methodology
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>
      {extracted && (
        <DataExtractionNotice
          text={extractionText}
          className="max-w-3xl text-gray-600"
        />
      )}
    </PageBody>
  );
}

export function CebMethodologyLink({
  extractedOutstanding = false,
}: {
  extractedOutstanding?: boolean;
}) {
  return (
    <PageMethodologyLink
      href="/about/#ceb-methodology"
      extracted={extractedOutstanding}
      extractionText="Only the reported outstanding balances on this page were automatically extracted from CEB’s financial-situation reports and are not authoritative. Consult the original reports for official figures."
    />
  );
}

export function PersonnelMethodologyLink() {
  return <PageMethodologyLink href="/about/#personnel-methodology" />;
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
    title: "Extrabudgetary",
    source: SHOW_ADDITIONAL_TRUST_FUNDS
      ? "UN Secretariat trust-fund schedules and separate entity reports"
      : "UN Secretariat trust-fund schedules",
  },
  {
    id: "trust-fund-contributors",
    href: "/secretariat/trust-funds/contributors",
    title: "Extrabudgetary — Contributors",
    source: SHOW_ADDITIONAL_TRUST_FUNDS
      ? "UN Secretariat trust-fund schedules and separate contributor reports"
      : "UN Secretariat trust-fund schedules",
  },
  {
    id: "peace-operations",
    href: "/secretariat/peacekeeping-budget/peace-operations",
    title: "Peace Operations",
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
      {page === "peace-operations" && <PeaceOperationsMethodologyNotes />}
    </div>
  );
}

export function SecretariatMethodologyLink({
  page,
}: {
  page: SecretariatMethodologyPage;
}) {
  return <PageMethodologyLink href={`/about/#secretariat-${page}`} extracted />;
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
        Other assessed and extrabudgetary resources are shown for context and
        are outside the programme budget itself. Proposed figures use the
        selected PPB edition; approved figures use the following edition;
        expenditure uses the edition two years later. Amounts without a
        source-evidenced entity placement remain under their published budget
        section.
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
        accounting treatment differ from the fund accounts on the Extrabudgetary
        page and the compilation used in the Overview.
      </p>
      <SubsectionHeading as="h4">
        Entities with separate budgets
      </SubsectionHeading>
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
          <p>
            The overall total and trend use the amounts printed in the UN
            presentations, at their published precision. Filtered totals add the
            matching country balances. Shares use the printed total and may add
            up to slightly more or less than 100%. The autumn balance snapshot
            is independent of the honour roll’s later reporting date.
          </p>
          <p>
            In 2021, the 63 country balances add to $1,254,267,798. The{" "}
            <SourceLink href="https://www.un.org/en/ga/contributions/Presentation%20October%202021.pdf#page=8">
              UN presentation
            </SourceLink>{" "}
            reports $1,255 million, a difference of $732,202.
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
      separate measures. Source exceptions are identified in the affected Member
      State’s sidebar.
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
        preserve the schedule’s figures. The Contributors tab includes its
        voluntary contribution totals under Contributors unspecified.
      </p>
      <p>
        Totals retain negative amounts. The List view includes funds with zero
        or negative expenditure. Fund-level accounts can include transfers
        between funds and overlap with other Secretariat views.
      </p>
      <p>
        The Technology Bank trust fund’s 2024 current-asset lines sum to
        $5,297,950 against a printed subtotal of $5,301,546. The UN Peace and
        Development Trust Fund’s 2022 assets less liabilities are $90,000 below
        its printed net assets. The financial position figures retain the
        statement totals in both cases.
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
        Schedule 8.1 reports voluntary contributions to UN-controlled MPTF
        accounts by recipient fund. They appear under Contributors unspecified
        because the schedule gives no contributor breakdown. We retain signed
        amounts and leave blank cells unreported. Transfers elsewhere in the
        schedules that identify the UNDP MPTF Office keep that source
        attribution.
      </p>
      <p>
        Each contributor is linked to the funds listed in the schedules. We
        group those funds by the Secretariat entity responsible for them, using
        the same assignments as in the expenditure view.
      </p>
      <p>
        In 2020, the ECA miscellaneous technical cooperation funds (HDM)
        transfer schedule totals $1,852,540. Deducting its separately printed
        $3,331 present-value adjustment gives the $1,849,209 reported in
        statement revenue.{" "}
        <a
          className="underline underline-offset-2"
          href="https://documents.un.org/api/symbol/access?s=%28DMSPC%2FOPPFB%29%20FINANCIAL%20STATEMENTS%20FOR%20THE%20YEAR%20ENDED%2031%20DECEMBER%202020&l=en&t=pdf#page=227"
          target="_blank"
          rel="noopener noreferrer"
        >
          2020 transfer schedule, PDF page 227
        </a>
      </p>
      {SHOW_ADDITIONAL_TRUST_FUNDS && (
        <>
          <p>
            Separate entity views keep each source’s own measure: UN-Habitat
            interim contributions and transfers, ITC extrabudgetary funding
            received, and UNODC indicative pledges. Source periods and coverage
            are shown with the data. UNEP contributor documents are available as
            references.
          </p>
          <p>
            UN-Habitat’s 2023 Latin America and Caribbean technical cooperation
            donor rows sum to $6,822,700. The region’s reported total is
            $6,890,800. The $68,100 difference remains unallocated to donors.
          </p>
          <p>
            UNODC’s March 2025 snapshot of 2023 pledges totals $453,853,084.35.
            The November 2025 report gives $453,869,467 for 2023. The
            contributor detail uses the March snapshot. The later report
            provides the aggregate comparison.
          </p>
        </>
      )}
    </>
  );
}

function PeaceOperationsMethodologyNotes() {
  return (
    <p>
      Peace operations combine peacekeeping operations (PKO), funded through the
      peacekeeping budget, and special political missions (SPM), funded through
      the programme budget (PPB). SPM expenditure is not part of the
      peacekeeping budget. The map uses the annual-report compilation described
      in the Overview, showing political and peacekeeping missions with
      approximate geographic positions. Mission grouping follows the portal’s
      field-placement convention, including residual spending for historical
      missions. Non-field sanctions panels and envoys are grouped with
      Secretariat entities.
    </p>
  );
}
