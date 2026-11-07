import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  assessmentExclusionNotes,
  rowsWithAssessments,
  sumAssessments,
  systemAssessmentTrendPoint,
  unknownCurrentAssessments,
} = await moduleAt("src/lib/cebAssessments.ts");

test("preserves partial totals, reported zeroes, and signed adjustments", () => {
  assert.deepEqual(
    sumAssessments([
      ["A", 100, 0, null],
      ["B", null, null, -5],
    ]),
    {
      assessed: { value: 100, partial: true },
      current: { value: 0, partial: true },
      prior: { value: -5, partial: true },
    },
  );
});

test("reserves unknown assessment amounts without treating reported zeroes as unknown", () => {
  const rows = [
    ["A", 100, 40, 0],
    ["A", 50, null, 0],
    ["B", 25, 0, 0],
  ];
  assert.equal(unknownCurrentAssessments(rows), 50);
});

test("excludes receipts where the same observation has no assessment", () => {
  const rows = [
    ["A", null, 400, 500],
    ["B", 100, null, 8],
    ["C", 0, 0, 2],
    ["C", null, null, null],
  ];
  const included = rowsWithAssessments(rows);
  assert.deepEqual(included, [rows[1], rows[2]]);
  assert.deepEqual(sumAssessments(included), {
    assessed: { value: 100, partial: false },
    current: { value: 0, partial: true },
    prior: { value: 10, partial: false },
  });
  assert.equal(unknownCurrentAssessments(included), 100);
  assert.deepEqual(assessmentExclusionNotes(2030, [{ name: "Member", rows }]), [
    "A has no reported assessment amount for Member in 2030. Its data is excluded.",
    "C has missing assessment amounts for Member in 2030. Those rows are excluded.",
  ]);
});

test("system trends sum reported receipts without offsetting one contributor's unknown amount with another's payments", () => {
  const point = systemAssessmentTrendPoint({
    year: 2030,
    contributors: [
      {
        name: "One",
        rows: [
          ["A", 100, null, 10],
          ["B", null, 300, 400],
        ],
      },
      { name: "Two", rows: [["A", 100, 250, 20]] },
    ],
  });
  assert.deepEqual(point, {
    year: 2030,
    assessed: { value: 200, partial: false },
    current: { value: 250, partial: true },
    prior: { value: 30, partial: false },
    unknownCurrent: 100,
    notes: [
      "B has no reported assessment amount in 2030. Its data is excluded.",
    ],
  });
});
