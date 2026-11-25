import { loadYearData } from "@/lib/data";
import { formatAssessmentDate } from "@/lib/regularBudgetContributors";
import {
  assessmentOrganizationGroups,
  assessmentTotals,
  includeAssessmentOrganization,
} from "@/lib/cebAssessments";
import type {
  CebAssessmentOutstandingData,
  CebAssessmentOutstandingRecord,
  CebAssessmentsData,
} from "@/types";

const requests = new Map<number, Promise<CebAssessmentOutstandingData>>();

interface OutstandingPlotPoint {
  year: number;
  amount: number | null;
  trend: number | null;
  record: ReturnType<typeof outstandingRows>[number] | null;
  data: CebAssessmentOutstandingData;
}

export function annualAssessmentReferences(data: CebAssessmentsData) {
  return new Map(
    assessmentOrganizationGroups(data.contributors).map((group) => [
      group.id,
      {
        amount: assessmentTotals(group.contributors).assessed.value,
        complete: group.contributors.every(({ rows }) =>
          rows.every(([, assessed]) => assessed !== null),
        ),
      },
    ]),
  );
}

export function outstandingAssessmentPercent(
  balance: number | null,
  annual: { amount: number | null; complete: boolean } | undefined,
) {
  return balance !== null &&
    annual?.complete &&
    annual.amount !== null &&
    annual.amount > 0
    ? (balance / annual.amount) * 100
    : null;
}

export function assessmentOutstandingForDisplay(
  data: CebAssessmentOutstandingData,
): CebAssessmentOutstandingData {
  return {
    ...data,
    organizations: data.organizations.filter(({ entity }) =>
      includeAssessmentOrganization(entity, data.year),
    ),
  };
}

export function loadCebAssessmentOutstanding(year: number) {
  const existing = requests.get(year);
  if (existing) return existing;
  const request = loadYearData<CebAssessmentOutstandingData>(
    "ceb-assessment-outstanding",
    year,
  )
    .then(assessmentOutstandingForDisplay)
    .catch((error: unknown) => {
      requests.delete(year);
      throw error;
    });
  requests.set(year, request);
  return request;
}

export function outstandingDate(record: CebAssessmentOutstandingRecord) {
  return formatAssessmentDate(
    record.asOfBasis === "table_note" && record.asOf
      ? record.asOf
      : record.reportedHeaderAsOf,
  );
}

export function outstandingFootnotes(data: CebAssessmentOutstandingData) {
  return data.source.notes.filter(
    ({ years }) => !years || years.includes(data.year),
  );
}

export function outstandingRows(data: CebAssessmentOutstandingData) {
  const counts = new Map<string, number>();
  for (const { entity } of data.organizations)
    counts.set(entity, (counts.get(entity) ?? 0) + 1);
  return data.organizations.map((record) => ({
    ...record,
    key: `${data.source.symbol}:${record.sourceRow}`,
    label:
      (counts.get(record.entity) ?? 0) > 1
        ? `${record.entity} — balance ${record.sourceRowOccurrence}`
        : record.entity,
  }));
}

export function outstandingHistory(
  datasets: readonly CebAssessmentOutstandingData[],
  entity: string,
) {
  return [...datasets]
    .sort((a, b) => a.year - b.year)
    .map((data) => ({
      data,
      rows: outstandingRows(data).filter((row) => row.entity === entity),
    }));
}

export function outstandingTrend(
  history: ReturnType<typeof outstandingHistory>,
) {
  // Repeated balances have report-local identities, so they cannot be joined
  // across reports or summed into a single organization balance.
  const multiple = history.some(({ rows }) => rows.length > 1);
  const points = history.flatMap<OutstandingPlotPoint>(({ data, rows }) =>
    rows.length
      ? rows.map((record) => ({
          year: data.year,
          amount: record.outstanding,
          trend: multiple ? null : record.outstanding,
          record,
          data,
        }))
      : [{ year: data.year, amount: null, trend: null, record: null, data }],
  );
  return { points, multiple };
}

export function outstandingSourceUrl(
  data: CebAssessmentOutstandingData,
  record: CebAssessmentOutstandingRecord,
) {
  return `${data.source.url}#page=${record.pdfPage}`;
}
