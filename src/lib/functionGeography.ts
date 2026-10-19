import { UN_FUNCTIONS, type UnFunctionKey } from "@/lib/functions";
import { geographicStyle } from "@/lib/geographicExpenses";

export const FUNCTION_GEOGRAPHY_LEVELS = [
  {
    key: "global",
    label: "Global and interregional",
    color: geographicStyle("global").color,
    textColor: "white",
  },
  {
    key: "regional",
    label: "Regional and subregional",
    color: geographicStyle("region").color,
    textColor: "black",
  },
  {
    key: "country",
    label: "Country-level",
    color: geographicStyle("country").color,
    textColor: "black",
  },
] as const;
export type FunctionGeographicLevel =
  (typeof FUNCTION_GEOGRAPHY_LEVELS)[number]["key"];
export interface FunctionGeographyData {
  meta: {
    year: number;
    sourceUrl: string;
    downloadUrl: string;
    firstCompleteYear: number;
    sourceRows: number;
  };
  total: number;
  functions: {
    key: UnFunctionKey;
    total: number;
    geography: {
      level: FunctionGeographicLevel;
      amount: number;
      negativeAdjustments: number;
    }[];
  }[];
}

/** Areas use nonnegative cell totals; signed amounts remain in labels and details. */
export function functionGeographyColumns(data: FunctionGeographyData) {
  const areaTotal = data.functions.reduce(
    (sum, item) =>
      sum +
      item.geography.reduce(
        (subtotal, cell) => subtotal + Math.max(0, cell.amount),
        0,
      ),
    0,
  );
  return data.functions
    .map((item) => {
      const definition = UN_FUNCTIONS.find((fn) => fn.key === item.key)!;
      const area = item.geography.reduce(
        (sum, cell) => sum + Math.max(0, cell.amount),
        0,
      );
      let top = 0;
      const cells = FUNCTION_GEOGRAPHY_LEVELS.map((level) => {
        const value = item.geography.find((cell) => cell.level === level.key)!;
        const height = area > 0 ? Math.max(0, value.amount) / area : 0;
        const cell = {
          ...level,
          ...value,
          top,
          height,
          share: item.total > 0 ? value.amount / item.total : null,
        };
        top += height;
        return cell;
      });
      return {
        ...item,
        label: definition.label,
        area,
        width: areaTotal > 0 ? area / areaTotal : 0,
        share: data.total > 0 ? item.total / data.total : null,
        cells,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}
