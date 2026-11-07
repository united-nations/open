import { loadYearData } from "@/lib/data";
import type {
  CebAssessmentContributor,
  CebAssessmentRow,
  CebAssessmentsData,
} from "@/types";
import { formatBudget } from "@/lib/contributors";
import { FINANCING_INSTRUMENT_COLORS } from "@/lib/financingInstruments";
import { REGULAR_BUDGET_STATUS_STYLES } from "@/lib/regularBudgetContributors";

export const CEB_ASSESSMENTS_HASH = "assessment";
export const CEB_ASSESSMENTS_SECTION = "ceb-assessments";
export const CEB_ASSESSMENT_COLORS = {
  assessed: FINANCING_INSTRUMENT_COLORS.assessed,
  current: REGULAR_BUDGET_STATUS_STYLES.paid_on_time.color,
  unknown: "var(--color-gray-400)",
  prior: REGULAR_BUDGET_STATUS_STYLES.paid_late.color,
};
export const CEB_ASSESSMENTS_SOURCE =
  "https://unsceb.org/assessments-voted-assessments-received-current-year-and-prior-years-assessments-received/";

const assessmentRequests = new Map<number, Promise<CebAssessmentsData>>();

export function loadCebAssessments(year: number) {
  const existing = assessmentRequests.get(year);
  if (existing) return existing;

  const request = loadYearData<CebAssessmentsData>(
    "ceb-assessments",
    year,
  ).catch((error: unknown) => {
    assessmentRequests.delete(year);
    throw error;
  });
  assessmentRequests.set(year, request);
  return request;
}

export interface AssessmentAmount {
  value: number | null;
  partial: boolean;
}

export function formatAssessmentAmount({ value, partial }: AssessmentAmount) {
  if (value === null) return "Unknown";
  return formatBudget(value) + (partial ? " (partial)" : "");
}

export function rowsWithAssessments(rows: readonly CebAssessmentRow[]) {
  return rows.filter(([, assessed]) => assessed !== null);
}

export function assessmentExclusionNotes(
  year: number,
  contributors: readonly Pick<CebAssessmentContributor, "name" | "rows">[],
) {
  const covered = new Set<string>();
  const missing = new Map<string, Set<string>>();
  for (const { name, rows } of contributors) {
    for (const [entity, assessed] of rows) {
      if (assessed !== null) {
        covered.add(entity);
      } else {
        const names = missing.get(entity) ?? new Set<string>();
        names.add(name);
        missing.set(entity, names);
      }
    }
  }
  return Array.from(missing)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([entity, names]) => {
      const [name] = names;
      if (!covered.has(entity)) {
        const scope = contributors.length === 1 ? ` for ${name}` : "";
        return `${entity} has no reported assessment amount${scope} in ${year}. Its data is excluded.`;
      }
      const who = names.size === 1 ? name : `${names.size} contributors`;
      return `${entity} has missing assessment amounts for ${who} in ${year}. Those rows are excluded.`;
    });
}

function sumColumn(
  rows: readonly CebAssessmentRow[],
  column: 1 | 2 | 3,
): AssessmentAmount {
  let total = 0;
  let reported = 0;
  for (const row of rows) {
    const value = row[column];
    if (value !== null) {
      total += value;
      reported++;
    }
  }
  return { value: reported ? total : null, partial: reported < rows.length };
}

export function sumAssessments(rows: readonly CebAssessmentRow[]) {
  return {
    assessed: sumColumn(rows, 1),
    current: sumColumn(rows, 2),
    prior: sumColumn(rows, 3),
  };
}

export function assessmentEntities(rows: readonly CebAssessmentRow[]) {
  const grouped = new Map<string, CebAssessmentRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row[0]);
    if (existing) existing.push(row);
    else grouped.set(row[0], [row]);
  }
  return Array.from(grouped, ([entity, observations]) => {
    const totals = sumAssessments(observations);
    const withBlankReceipts = observations.reduce(
      (sum, [, assessed, current]) =>
        current === null ? sum + Math.max(0, assessed ?? 0) : sum,
      0,
    );
    const remaining = Math.max(
      0,
      (totals.assessed.value ?? 0) - Math.max(0, totals.current.value ?? 0),
    );
    const unknownCurrent = Math.min(withBlankReceipts, remaining);
    return {
      entity,
      ...totals,
      unknownCurrent,
      paidWithinAssessment: Math.min(
        Math.max(0, totals.assessed.value ?? 0) - unknownCurrent,
        Math.max(0, totals.current.value ?? 0),
      ),
    };
  });
}

export function unknownCurrentAssessments(rows: readonly CebAssessmentRow[]) {
  return assessmentEntities(rows).reduce(
    (sum, { unknownCurrent }) => sum + unknownCurrent,
    0,
  );
}

export function systemAssessmentTrendPoint({
  year,
  contributors,
}: Pick<CebAssessmentsData, "year" | "contributors">) {
  const assessedRowsByContributor = contributors.map(({ rows }) =>
    rowsWithAssessments(rows),
  );
  return {
    year,
    ...sumAssessments(assessedRowsByContributor.flat()),
    unknownCurrent: assessedRowsByContributor.reduce(
      (sum, rows) => sum + unknownCurrentAssessments(rows),
      0,
    ),
    notes: assessmentExclusionNotes(year, contributors),
  };
}
