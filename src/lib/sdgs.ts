import sdgTaxonomy from "../../data/sdgs.json";

// SDG Types
export interface Indicator {
  number: string;
  description: string;
  code: string;
}

export interface Target {
  number: string;
  description: string;
  indicators: Indicator[];
}

export interface SDG {
  number: number;
  shortTitle: string;
  title: string;
  targets: Target[];
}

export interface SDGExpensesData {
  [sdg: string]: {
    total: number;
    entities: { [entity: string]: number };
    basis?: string;
  };
}

// Non-goal groups stay separate: reported classification versus calculated coverage.
export const SDG_EXTRA_GROUPS: Record<
  number,
  { key: string; label: string; color: string; description: string }
> = {
  0: {
    key: "non_sdg",
    label: "Non-SDG",
    color: "#6b7280",
    description:
      "Expenditure reported by CEB under its Non-SDG code (x00), for activities not aligned to the SDGs.",
  },
  [-1]: {
    key: "sdg_not_specified",
    label: "Not specified",
    color: "#9ca3af",
    description:
      "Calculated per entity as total CEB expenditure minus reported allocations to SDGs 1–17 and Non-SDG. Includes missing SDG reporting and signed reconciliation differences; SDG relevance is unknown.",
  },
};
export const getSDGKey = (number: number) =>
  SDG_EXTRA_GROUPS[number]?.key ?? String(number);
export const getSDGLabel = (number: number) =>
  SDG_EXTRA_GROUPS[number]?.label ?? SDG_SHORT_TITLES[number];
export const getSDGColor = (number: number) =>
  SDG_EXTRA_GROUPS[number]?.color ?? SDG_COLORS[number];
export const getSDGNumber = (key: string) =>
  Number(
    Object.entries(SDG_EXTRA_GROUPS).find(
      ([, group]) => group.key === key,
    )?.[0] ?? key,
  );

// SDG Colors (official UN SDG colors)
export const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",
  2: "#DDA63A",
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  9: "#FD6925",
  10: "#DD1367",
  11: "#FD9D24",
  12: "#BF8B2E",
  13: "#3F7E44",
  14: "#0A97D9",
  15: "#56C02B",
  16: "#00689D",
  17: "#19486A",
};

// Titles are domain data; official presentation colors remain website styling.
export const SDG_SHORT_TITLES = Object.fromEntries(
  sdgTaxonomy.goals.map((goal) => [goal.number, goal.short_title]),
) as Record<number, string>;

export const SDG_TITLES = Object.fromEntries(
  sdgTaxonomy.goals.map((goal) => [goal.number, goal.title]),
) as Record<number, string>;
