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
  peacekeepingAssessments: {
    href: "https://www.un.org/en/ga/contributions/peacekeeping.shtml",
    label: "UN peacekeeping assessment circulars",
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
