import m49 from "../../data/m49-subregions.json";

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

const countrySubregions = new Map(
  Object.entries(m49.subregions).flatMap(([subregion, { region, countries }]) =>
    countries.map((iso3) => [iso3, { region, subregion }] as const),
  ),
);

/** Display nesting only: never redistribute CEB's regional expenditure. */
export function geographicSubregion(geography: {
  iso3: string;
  name: string;
  region: string;
  level?: GeographicLevel;
}): string | null {
  if (geography.level === "global") return null;
  if (geography.level === "region") return "Regional expenditure";
  if (geography.level === "subregion") return geography.name;
  const match = countrySubregions.get(geography.iso3);
  return match?.region === geography.region
    ? match.subregion
    : "Other countries and areas";
}
