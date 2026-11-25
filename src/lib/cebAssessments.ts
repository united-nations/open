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

// Compared with all organizations in the 2020–2025 annual CEB exports.
export const ASSESSMENT_ORGANIZATIONS_WITHOUT_ROWS: Partial<
  Record<number, readonly string[]>
> = {
  2024: ["PAHO", "UN Women", "UNITAR"],
  2025: ["ITC", "UNITAID", "UNITAR", "UNOPS"],
};

export function assessmentMeasures(year?: number) {
  const paymentYear = year ?? "the year shown";
  return {
    assessed: {
      label: "Assessed contributions payable",
      explanation: `The amount members were required to pay in assessed contributions for ${paymentYear}.`,
    },
    current: {
      label:
        year === undefined
          ? "Paid towards the same year"
          : `Paid in ${year} towards ${year}`,
      explanation: `Payments reported received in ${paymentYear} towards assessed contributions for that same year.`,
    },
    prior: {
      label:
        year === undefined
          ? "Paid towards earlier years"
          : `Paid in ${year} towards earlier years`,
      explanation: `Payments reported received in ${paymentYear} towards assessed contributions for earlier years combined.`,
    },
  };
}

const assessmentRequests = new Map<number, Promise<CebAssessmentsData>>();

/** Exclude organization-years without reliable payment reporting. */
export function includeAssessmentOrganization(entity: string, year: number) {
  return entity !== "IRMCT" && !(entity === "ICAO" && year === 2024);
}

/** Keep source downloads intact while applying the assessment display scope. */
export function assessmentsForDisplay(
  data: CebAssessmentsData,
): CebAssessmentsData {
  return {
    ...data,
    contributors: data.contributors
      .map((contributor) => ({
        ...contributor,
        rows: contributor.rows.filter(([entity]) =>
          includeAssessmentOrganization(entity, data.year),
        ),
      }))
      .filter(({ rows }) => rows.length > 0),
  };
}

export function loadCebAssessments(year: number) {
  const existing = assessmentRequests.get(year);
  if (existing) return existing;

  const request = loadYearData<CebAssessmentsData>("ceb-assessments", year)
    .then(assessmentsForDisplay)
    .catch((error: unknown) => {
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

export function assessmentCoverageNotes(
  year: number,
  rows: readonly CebAssessmentRow[],
) {
  const groups = new Map<string, CebAssessmentRow[]>();
  for (const row of rows) {
    const observations = groups.get(row[0]) ?? [];
    observations.push(row);
    groups.set(row[0], observations);
  }
  const fields = [
    ["assessments", "assessed"],
    ["same-year payments", "current"],
    ["earlier-year payments", "prior"],
  ] as const;
  const notes: string[] = [];
  for (const [label, key] of fields) {
    const unknown: string[] = [];
    const partial: string[] = [];
    for (const [entity, observations] of groups) {
      const amount = sumAssessments(observations)[key];
      if (amount.value === null) unknown.push(entity);
      else if (amount.partial) partial.push(entity);
    }
    if (unknown.length)
      notes.push(
        `${year} — ${label} unavailable: ${unknown.sort().join(", ")}.`,
      );
    if (partial.length)
      notes.push(`${year} — partial ${label}: ${partial.sort().join(", ")}.`);
  }
  return notes;
}

export function assessmentOrganizationNames(data: CebAssessmentsData) {
  return new Set(
    data.contributors.flatMap(({ rows }) => rows.map(([entity]) => entity)),
  );
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
    const comparableCurrent = observations.reduce(
      (sum, [, assessed, current]) =>
        assessed === null ? sum : sum + (current ?? 0),
      0,
    );
    const remaining = Math.max(
      0,
      (totals.assessed.value ?? 0) - Math.max(0, comparableCurrent),
    );
    const unknownCurrent = Math.min(withBlankReceipts, remaining);
    return {
      entity,
      ...totals,
      unknownCurrent,
      paidWithinAssessment: Math.min(
        Math.max(0, totals.assessed.value ?? 0) - unknownCurrent,
        Math.max(0, comparableCurrent),
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

export function assessmentContributorsForEntity(
  contributors: readonly CebAssessmentContributor[],
  entity: string,
) {
  return contributors.flatMap((contributor) => {
    const rows = contributor.rows.filter(([name]) => name === entity);
    return rows.length ? [{ ...contributor, rows }] : [];
  });
}

export function assessmentTotals(
  contributors: readonly Pick<CebAssessmentContributor, "rows">[],
) {
  const observations = contributors.map(({ rows }) => rows);
  const entities = observations.flatMap(assessmentEntities);
  return {
    ...sumAssessments(observations.flat()),
    unknownCurrent: entities.reduce(
      (sum, entity) => sum + entity.unknownCurrent,
      0,
    ),
    paidWithinAssessment: entities.reduce(
      (sum, entity) => sum + entity.paidWithinAssessment,
      0,
    ),
  };
}

export function assessmentOrganizationGroups(
  contributors: readonly CebAssessmentContributor[],
) {
  const entities = new Set(
    contributors.flatMap(({ rows }) => rows.map(([entity]) => entity)),
  );
  return Array.from(entities, (entity) => ({
    id: entity,
    name: entity,
    contributors: assessmentContributorsForEntity(contributors, entity),
  }));
}

export function systemAssessmentTrendPoint({
  year,
  contributors,
}: Pick<CebAssessmentsData, "year" | "contributors">) {
  const totals = assessmentTotals(contributors);
  return {
    year,
    assessed: totals.assessed,
    current: totals.current,
    prior: totals.prior,
    unknownCurrent: totals.unknownCurrent,
    notes: assessmentCoverageNotes(
      year,
      contributors.flatMap(({ rows }) => rows),
    ),
  };
}
