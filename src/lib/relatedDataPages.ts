import {
  isRouteEnabled,
  SECRETARIAT_NAV,
  SYSTEM_ASSESSMENTS_PATH,
  SYSTEM_CONTRIBUTORS_PATH,
  SYSTEM_CONTRIBUTOR_NAV,
  SYSTEM_NAV,
} from "@/lib/navigation";

type RelatedGroup = {
  heading: string;
  links: readonly string[];
};

const organizations = "/system/organizations";
const contributors = SYSTEM_CONTRIBUTORS_PATH;
const assessments = SYSTEM_ASSESSMENTS_PATH;
const overview = "/secretariat";
const programme = "/secretariat/programme-budget";
const peacekeeping = "/secretariat/peacekeeping-budget";
const extrabudgetary = "/secretariat/trust-funds";
const peaceOperations = `${peacekeeping}/peace-operations`;
const financingPages = [programme, peacekeeping, extrabudgetary];
const contributorPages = financingPages.map((href) => `${href}/contributors`);

const relatedPages: Record<string, readonly RelatedGroup[]> = {
  [organizations]: [
    { heading: "Amounts assessed and paid", links: [assessments] },
    {
      heading: "Secretariat departments, offices and missions",
      links: [overview],
    },
  ],
  [contributors]: [
    { heading: "Amounts assessed and paid", links: [assessments] },
    {
      heading: "Who funds the Secretariat",
      links: contributorPages,
    },
  ],
  [assessments]: [
    {
      heading: "Financing across the UN System",
      links: [organizations, contributors],
    },
    {
      heading: "UN Secretariat assessments and payment status",
      links: [`${programme}/contributors`],
    },
  ],
  [overview]: [
    {
      heading: "Detailed views of funding sources of the UN Secretariat",
      links: financingPages,
    },
    {
      heading: "The wider UN System",
      links: [organizations],
    },
  ],
  [peaceOperations]: [
    {
      heading: "Mission budgets and wider Secretariat spending",
      links: [peacekeeping, programme, overview],
    },
  ],
};

for (const page of financingPages) {
  relatedPages[page] = [
    {
      heading: "Who contributes",
      links: [`${page}/contributors`],
    },
    {
      heading: "Secretariat-wide expenditure",
      links: [overview],
    },
    ...(page === peacekeeping
      ? [
          {
            heading: "Peacekeeping and special political missions",
            links: [peaceOperations],
          },
        ]
      : []),
  ];
  relatedPages[`${page}/contributors`] = [
    {
      heading: "Use of funds",
      links: [page],
    },
    {
      heading: "Other Secretariat funding streams",
      links: contributorPages.filter((href) => href !== `${page}/contributors`),
    },
    { heading: "Who funds the wider UN System", links: [contributors] },
  ];
}

export function relatedDataGroups(page: string) {
  if (!isRouteEnabled(page)) return [];
  return (relatedPages[page] ?? []).flatMap((group) => {
    const links = group.links
      .filter((href) => href !== page && isRouteEnabled(href))
      .map((href) => {
        const isContributorPage = href.endsWith("/contributors");
        const parent = isContributorPage
          ? href.slice(0, -"/contributors".length)
          : href;
        const item = [
          ...SYSTEM_NAV,
          ...SYSTEM_CONTRIBUTOR_NAV,
          ...SECRETARIAT_NAV,
        ].find((item) => item.href === href);
        const parentItem = SECRETARIAT_NAV.find((item) => item.href === parent);
        const label = item?.label ?? parentItem?.label ?? "Peace Operations";
        return {
          href,
          label,
          scope: href.startsWith("/system/")
            ? "UN System"
            : `UN Secretariat${isContributorPage ? " · Contributors" : ""}`,
        };
      });
    return links.length ? [{ ...group, links }] : [];
  });
}
