export const GEOGRAPHIC_LEVELS = [
  { key: "global", label: "Global", color: "#6b7280" },
  { key: "region", label: "Regional", color: "#a05fb4" },
  { key: "subregion", label: "Subregional", color: "#b16d03" },
  { key: "country", label: "Country-level", color: "#009edb" },
] as const;
export type GeographicLevel = (typeof GEOGRAPHIC_LEVELS)[number]["key"];
export interface GeographicExpense {
  iso3: string;
  name: string;
  region: string;
  level: GeographicLevel;
  lat: number;
  long: number;
  total: number;
  entities: Record<string, number>;
  notes: string[];
  sourceLabels: string[];
}
export const geographicStyle = (level: GeographicLevel) =>
  GEOGRAPHIC_LEVELS.find((item) => item.key === level)!;
