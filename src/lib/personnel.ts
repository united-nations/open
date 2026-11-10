/** CEB HR dimensions retain their own organization scope, independent of finance. */
export interface PersonnelOrganization {
  org: string;
  sourceOrg: string;
  total: number;
  entities: { entity: string; count: number }[];
}

export interface PersonnelComposition {
  org: string;
  category: string;
  subcategory: string;
  grade: string;
  sex: string;
  count: number;
}

export interface PersonnelGeography {
  org: string;
  iso3: string;
  lat: number | null;
  long: number | null;
  country: string;
  region: string;
  subregion: string;
  count: number;
}

export interface PersonnelDutyStation extends PersonnelGeography {
  station: string;
}

export interface PersonnelAgeTenure {
  sex: string;
  age: number | null;
  ageBand: string;
  tenure: number | null;
  tenureBand: string;
  count: number;
}

export interface PersonnelData {
  year: number;
  total: number;
  organizations: PersonnelOrganization[];
  composition: PersonnelComposition[];
  dutyStations: PersonnelDutyStation[];
  nationalities: PersonnelGeography[];
  ageTenure: PersonnelAgeTenure[];
  quality: { totals: Record<string, number> };
}

export interface PersonnelTrendsData {
  years: {
    year: number;
    total: number;
    organizations: Record<string, number>;
    female: number;
    male: number;
    unknown: number;
    genderByOrganization: Record<
      string,
      { female: number; male: number; unknown: number }
    >;
    ageBands: Record<string, number>;
    tenureBands: Record<string, number>;
  }[];
}

export const PERSONNEL_SEX = [
  { key: "female", label: "Women", color: "#009edb" },
  { key: "male", label: "Men", color: "#2d6a7e" },
  { key: "unknown", label: "Not reported", color: "#9ca3af" },
] as const;

export type PersonnelSexKey = (typeof PERSONNEL_SEX)[number]["key"];
export interface PersonnelSexTotals {
  female: number;
  male: number;
  unknown: number;
  total: number;
}

export const formatPeople = (count: number) =>
  count.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function personnelSexTotals(
  records: readonly { sex: string; count: number }[],
): PersonnelSexTotals {
  return records.reduce(
    (totals, record) => {
      const sex =
        record.sex === "F" ? "female" : record.sex === "M" ? "male" : "unknown";
      totals[sex] += record.count;
      totals.total += record.count;
      return totals;
    },
    { female: 0, male: 0, unknown: 0, total: 0 },
  );
}

const GRADE_ORDER: Record<string, readonly string[]> = {
  "International Professional": [
    "UG",
    "D-2",
    "D-1",
    "P-7",
    "P-6",
    "P-5",
    "P-4",
    "P-3",
    "P-2",
    "P-1",
  ],
  "National Professional": ["NOE", "NOD", "NOC", "NOB", "NOA"],
  "Field Service": ["FS7", "FS6", "FS5", "FS4", "FS3", "FS2", "FS1"],
  "General Service": [
    "G10",
    "G9",
    "G8",
    "G7",
    "G6",
    "G5",
    "G4",
    "G3",
    "G2",
    "G1",
  ],
};

export function personnelGradeGroups(records: readonly PersonnelComposition[]) {
  const categories = new Map<string, Map<string, PersonnelComposition[]>>();
  for (const record of records) {
    if (!categories.has(record.category))
      categories.set(record.category, new Map());
    const grades = categories.get(record.category)!;
    if (!grades.has(record.grade)) grades.set(record.grade, []);
    grades.get(record.grade)!.push(record);
  }
  return [...categories]
    .sort(([a], [b]) => {
      const order = Object.keys(GRADE_ORDER);
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      return (
        (indexA < 0 ? order.length : indexA) -
          (indexB < 0 ? order.length : indexB) || a.localeCompare(b)
      );
    })
    .map(([category, grades]) => ({
      category,
      rows: [...grades]
        .sort(([a], [b]) => {
          const order = GRADE_ORDER[category] ?? [];
          const indexA = order.indexOf(a);
          const indexB = order.indexOf(b);
          return (
            (indexA < 0 ? order.length : indexA) -
              (indexB < 0 ? order.length : indexB) || a.localeCompare(b)
          );
        })
        .map(([grade, observations]) => ({
          key: `${category}-${grade}`,
          label:
            grade === "UG" && category === "International Professional"
              ? "Above D-2 (UG)"
              : grade,
          ...personnelSexTotals(observations),
        })),
    }));
}

/** One count-to-width scale for both sexes and every row in a pyramid. */
export function personnelPyramidScale(rows: readonly PersonnelSexTotals[]) {
  return Math.max(
    1,
    ...rows.flatMap((row) => [row.female, row.male, row.unknown]),
  );
}

export function personnelPyramidWidths(
  row: PersonnelSexTotals,
  maximum: number,
) {
  const scale = Math.max(1, maximum);
  return {
    female: (50 * row.female) / scale,
    male: (50 * row.male) / scale,
    unknown: (50 * row.unknown) / scale,
  };
}

export type PersonnelCompositionTrendKind = "gender" | "age" | "tenure";

export interface PersonnelCompositionTrendPoint {
  year: number;
  total: number | null;
  counts: Record<string, number> | null;
  shares: Record<string, number | null>;
}

const PERSONNEL_BAND_COLORS = [
  "#d8eef6",
  "#b7deee",
  "#8dcee6",
  "#61bddf",
  "#33add8",
  "#009edb",
  "#0085ba",
  "#006e9c",
  "#00577f",
  "#003f60",
];

function personnelBandOrder(label: string) {
  if (label === "NA" || label === "Not reported")
    return Number.POSITIVE_INFINITY;
  if (label.toLowerCase().startsWith("under")) return -1;
  return Number(label.match(/\d+/)?.[0] ?? Number.POSITIVE_INFINITY);
}

/** Normalize each reported year's distribution; an absent organization-year stays unavailable. */
export function personnelCompositionTrend(
  data: PersonnelTrendsData,
  kind: PersonnelCompositionTrendKind,
  org: string,
) {
  const labels =
    kind === "gender"
      ? PERSONNEL_SEX.map((sex) => sex.key)
      : [
          ...new Set(
            data.years.flatMap((row) =>
              Object.keys(kind === "age" ? row.ageBands : row.tenureBands),
            ),
          ),
        ].sort(
          (a, b) =>
            personnelBandOrder(a) - personnelBandOrder(b) || a.localeCompare(b),
        );
  const knownLabels = labels.filter(
    (label) => label !== "NA" && label !== "Not reported",
  );
  const series = labels.map((key) => {
    if (kind === "gender") {
      const sex = PERSONNEL_SEX.find((sex) => sex.key === key)!;
      return { key, label: sex.label, color: sex.color };
    }
    const unknown = key === "NA" || key === "Not reported";
    const index = knownLabels.indexOf(key);
    const colorIndex =
      knownLabels.length > 1
        ? Math.round(
            (index * (PERSONNEL_BAND_COLORS.length - 1)) /
              (knownLabels.length - 1),
          )
        : 5;
    return {
      key,
      label: unknown ? "Not reported" : key,
      color: unknown ? "#9ca3af" : PERSONNEL_BAND_COLORS[colorIndex],
    };
  });
  const points: PersonnelCompositionTrendPoint[] = data.years.map((row) => {
    const distribution: Record<string, number> | undefined =
      kind === "gender"
        ? org === "all"
          ? { female: row.female, male: row.male, unknown: row.unknown }
          : row.genderByOrganization[org]
        : kind === "age"
          ? row.ageBands
          : row.tenureBands;
    const counts = distribution
      ? Object.fromEntries(labels.map((key) => [key, distribution[key] ?? 0]))
      : null;
    const total = counts
      ? Object.values(counts).reduce((sum, count) => sum + count, 0)
      : null;
    return {
      year: row.year,
      total,
      counts,
      shares: Object.fromEntries(
        labels.map((key) => [
          key,
          total !== null && total > 0 && counts
            ? (100 * counts[key]) / total
            : null,
        ]),
      ),
    };
  });
  return { series, points };
}
