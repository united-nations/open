import { SHOW_UNINFO } from "@/lib/featureFlags";

const PAGE_SOURCES = {
  ceb: {
    href: "https://unsceb.org/statistics/financial-statistics/",
    label: "CEB Financial Statistics",
  },
  uninfo: { href: "https://uninfo.org/", label: "UNINFO" },
  annualReport: {
    href: "https://www.un.org/en/annualreport",
    label: "UN Secretariat annual report",
  },
  programmeBudget: {
    href: "https://www.un.org/en/ga/fifth/81/ppb2027.shtml",
    label: "proposed programme budget documents",
  },
  peacekeepingDocuments: {
    href: "https://research.un.org/en/docs/peacekeeping",
    label: "peacekeeping budget and performance reports",
  },
  peacekeepingFunding: {
    href: "https://peacekeeping.un.org/en/how-we-are-funded",
    label: "how peacekeeping is funded",
  },
  trustFunds: {
    href: "https://digitallibrary.un.org/search?ln=en&p=schedule%20of%20individual%20trust%20funds",
    label: "audited Schedules of Individual Trust Funds",
  },
  regularAssessments: {
    href: "https://www.un.org/en/ga/contributions/budget.shtml",
    label: "UN regular-budget assessment circulars",
  },
  honourRoll: {
    href: "https://www.un.org/en/ga/contributions/honourroll.shtml",
    label: "regular-budget honour roll",
  },
  financialSituation: {
    href: "https://www.un.org/en/ga/contributions/financial.shtml",
    label: "UN financial situation presentations",
  },
  peacekeepingAssessments: {
    href: "https://www.un.org/en/ga/contributions/peacekeeping.shtml",
    label: "UN peacekeeping assessment circulars",
  },
  unepFinancialStatements: {
    href: "https://digitallibrary.un.org/record/4090384/files/A_80_5_Add.7-EN.pdf#page=87",
    label: "UNEP",
  },
  unodcFinancialStatements: {
    href: "https://digitallibrary.un.org/record/4090388/files/A_80_5_Add.10-EN.pdf#page=66",
    label: "UNODC",
  },
  habitatFinancialStatements: {
    href: "https://digitallibrary.un.org/record/4090387/files/A_80_5_Add.9-EN.pdf#page=83",
    label: "UN-Habitat",
  },
  itcFinancialReport: {
    href: "https://digitallibrary.un.org/record/4090394/files/A_80_5_Vol-III-ch-IV.pdf?version=1#page=2",
    label: "ITC",
  },
} as const;

export function PageSourceLink({
  source,
}: {
  source: keyof typeof PAGE_SOURCES;
}) {
  const { href, label } = PAGE_SOURCES[source];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {label}
    </a>
  );
}

export function SystemPageSources({ uninfo = false }: { uninfo?: boolean }) {
  return (
    <>
      System-wide financial data comes from <PageSourceLink source="ceb" />.
      {SHOW_UNINFO && uninfo && (
        <>
          {" "}
          Cooperation Framework information in the sidebars comes from{" "}
          <PageSourceLink source="uninfo" />.
        </>
      )}
    </>
  );
}

export function SeparateEntityFinancialSources() {
  return (
    <>
      Next to these trust funds, the Secretariat manages the trust funds for{" "}
      <PageSourceLink source="unepFinancialStatements" />,{" "}
      <PageSourceLink source="unodcFinancialStatements" />,{" "}
      <PageSourceLink source="habitatFinancialStatements" /> and{" "}
      <PageSourceLink source="itcFinancialReport" />; their financials are
      reported separately and not included here.
    </>
  );
}
