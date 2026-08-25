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
  };
}

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
