import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  assessmentOutstandingForDisplay,
  annualAssessmentReferences,
  outstandingAssessmentPercent,
  outstandingRows,
  outstandingFootnotes,
  outstandingDate,
  outstandingHistory,
  outstandingTrend,
} = await moduleAt("src/lib/cebAssessmentOutstanding.ts");

test("outstanding trends sort reporting years and preserve missing, zero and signed balances", () => {
  const data = (year, outstanding) => ({
    year,
    source: { symbol: `Report ${year}` },
    organizations:
      outstanding === undefined
        ? []
        : [{ entity: "A", sourceRow: 1, outstanding }],
  });
  const datasets = [
    data(2023, -2),
    data(2020, 0),
    data(2022),
    data(2021, null),
  ];
  const original = structuredClone(datasets);
  const { points, multiple } = outstandingTrend(
    outstandingHistory(datasets, "A"),
  );
  assert.equal(multiple, false);
  assert.deepEqual(
    points.map(({ year, amount, trend }) => ({ year, amount, trend })),
    [
      { year: 2020, amount: 0, trend: 0 },
      { year: 2021, amount: null, trend: null },
      { year: 2022, amount: null, trend: null },
      { year: 2023, amount: -2, trend: -2 },
    ],
  );
  assert.equal(points[2].record, null);
  assert.deepEqual(datasets, original);
});

test("repeated reported balances remain separate and are not joined across reports", () => {
  const datasets = [2022, 2023, 2024].map((year) => ({
    year,
    source: { symbol: year < 2024 ? "A/79/494" : "A/81/408" },
    organizations: (year < 2024 ? [10, 20] : [30]).map(
      (outstanding, index) => ({
        entity: "UNFCCC",
        sourceRow: index + 1,
        sourceRowOccurrence: index + 1,
        outstanding,
      }),
    ),
  }));
  const { points, multiple } = outstandingTrend(
    outstandingHistory(datasets, "UNFCCC"),
  );
  assert.equal(multiple, true);
  assert.deepEqual(
    points.map(({ amount }) => amount),
    [10, 20, 10, 20, 30],
  );
  assert.ok(points.every(({ trend }) => trend === null));
  assert.notEqual(points[0].record.key, points[1].record.key);
  assert.equal(points[0].record.label, "UNFCCC — balance 1");
});

test("outstanding balances use the same organization exclusions as annual assessments", () => {
  const source = {
    year: 2024,
    organizations: [
      { entity: "ICAO", outstanding: 100 },
      { entity: "IRMCT", outstanding: 200 },
      { entity: "UN Secretariat", outstanding: 300 },
    ],
  };
  const original = structuredClone(source);
  assert.deepEqual(assessmentOutstandingForDisplay(source).organizations, [
    source.organizations[2],
  ]);
  assert.deepEqual(
    assessmentOutstandingForDisplay({ ...source, year: 2025 }).organizations,
    [source.organizations[0], source.organizations[2]],
  );
  assert.deepEqual(source, original);
});

test("annual assessment comparisons remain unavailable for incomplete, missing or zero denominators", () => {
  const annual = annualAssessmentReferences({
    contributors: [
      {
        id: "one",
        name: "One",
        aliases: [],
        rows: [
          ["A", 100, null, 0],
          ["B", null, 200, 0],
          ["C", 0, 0, 0],
        ],
      },
      {
        id: "two",
        name: "Two",
        aliases: [],
        rows: [
          ["A", 50, 50, 0],
          ["B", 20, 20, 0],
        ],
      },
    ],
  });
  assert.equal(outstandingAssessmentPercent(300, annual.get("A")), 200);
  assert.equal(outstandingAssessmentPercent(-30, annual.get("A")), -20);
  assert.equal(outstandingAssessmentPercent(null, annual.get("A")), null);
  assert.equal(outstandingAssessmentPercent(10, annual.get("B")), null);
  assert.equal(outstandingAssessmentPercent(10, annual.get("C")), null);
  assert.equal(outstandingAssessmentPercent(10, annual.get("Missing")), null);
});

test("public notes and dates follow the selected CEB year rather than external audit metadata", () => {
  const notes = [
    { marker: "a", text: "General", years: [2024, 2025] },
    { marker: "b", text: "2025 only", years: [2025] },
  ];
  assert.deepEqual(outstandingFootnotes({ year: 2024, source: { notes } }), [
    notes[0],
  ]);
  assert.deepEqual(
    outstandingFootnotes({ year: 2025, source: { notes } }),
    notes,
  );
  assert.equal(
    outstandingDate({
      asOf: "2024-06-30",
      asOfBasis: "audited_statements",
      reportedHeaderAsOf: "2024-12-31",
    }),
    "31 December 2024",
  );
  assert.equal(
    outstandingDate({
      asOf: "2025-06-30",
      asOfBasis: "table_note",
      reportedHeaderAsOf: "2025-12-31",
    }),
    "30 June 2025",
  );
});

test("separate reported budgets, unknown balances and explicit zeroes retain distinct identity", () => {
  const rows = outstandingRows({
    source: { symbol: "A/1/1" },
    organizations: [
      {
        entity: "UNFCCC",
        sourceRow: 1,
        sourceRowOccurrence: 1,
        outstanding: 0,
      },
      {
        entity: "UNFCCC",
        sourceRow: 2,
        sourceRowOccurrence: 2,
        outstanding: null,
      },
    ],
  });
  assert.deepEqual(
    rows.map(({ key, label, outstanding }) => ({ key, label, outstanding })),
    [
      { key: "A/1/1:1", label: "UNFCCC — balance 1", outstanding: 0 },
      { key: "A/1/1:2", label: "UNFCCC — balance 2", outstanding: null },
    ],
  );
});
