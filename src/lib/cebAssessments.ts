import { loadYearData } from "@/lib/data";
import type { CebAssessmentRow, CebAssessmentsData } from "@/types";

export const CEB_ASSESSMENTS_HASH = "assessment";
export const CEB_ASSESSMENTS_SECTION = "ceb-assessments";
export const UNKNOWN_ASSESSMENT_PAYMENT_COLOR = "var(--color-gray-400)";
export const PRIOR_ASSESSMENT_PAYMENT_COLOR = "var(--color-smoky)";
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
    return {
      entity,
      ...totals,
      unknownCurrent: Math.min(withBlankReceipts, remaining),
    };
  });
}

export function unknownCurrentAssessments(rows: readonly CebAssessmentRow[]) {
  return assessmentEntities(rows).reduce(
    (sum, { unknownCurrent }) => sum + unknownCurrent,
    0,
  );
}
