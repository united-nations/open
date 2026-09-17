/** CEB Standard II categories, using muted UN80 tokens distinct from SDG colours. */
export const UN_FUNCTIONS = [
  {
    key: "development",
    label: "Development assistance",
    color: "var(--color-faded-jade)",
    description: "Activities supporting development in UN programme countries.",
  },
  {
    key: "humanitarian",
    label: "Humanitarian assistance",
    color: "var(--color-au-chico)",
    description:
      "Activities to save lives, alleviate suffering and protect human dignity during emergencies and their aftermath.",
  },
  {
    key: "peace",
    label: "Peace operations",
    color: "var(--color-smoky)",
    description:
      "United Nations peacekeeping operations and special political missions.",
  },
  {
    key: "global",
    label: "Global agenda and specialized assistance",
    color: "var(--color-trout)",
    description:
      "Global and regional activities outside the other functions, and support for sustainable development in non-programme countries.",
  },
] as const;
export type UnFunctionKey = (typeof UN_FUNCTIONS)[number]["key"];
export type FunctionAmounts = Partial<Record<UnFunctionKey, number>>;
export interface FunctionExpenseYear {
  year: number;
  total: number;
  functions: FunctionAmounts;
  entities: Record<string, FunctionAmounts>;
}
export interface FunctionExpenses {
  meta: {
    source: string;
    sourceUrl: string;
    downloadUrl: string;
    years: number[];
    classificationStartYear: number;
  };
  data: FunctionExpenseYear[];
}
export const FUNCTION_SERIES = UN_FUNCTIONS.map(
  ({ key, label, color, description }) => ({
    key,
    label,
    color,
    tooltip: description,
  }),
);
