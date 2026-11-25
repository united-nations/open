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
} = await moduleAt("src/lib/cebAssessmentOutstanding.ts");

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
