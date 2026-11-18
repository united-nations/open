import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  assessmentsForDisplay,
  assessmentCoverageNotes,
  assessmentOrganizationGroups,
  assessmentTotals,
  sumAssessments,
  systemAssessmentTrendPoint,
  unknownCurrentAssessments,
} = await moduleAt("src/lib/cebAssessments.ts");

test("treats only 2025 IRMCT receipts as unavailable for display", () => {
  const contributors = [
    {
      id: "C01:X",
      name: "X",
      aliases: [],
      rows: [
        ["IRMCT", 300, 0, 0],
        ["Another organization", 400, 0, 25],
      ],
    },
  ];
  const input = { year: 2025, contributors };
  const displayed = assessmentsForDisplay(input);
  assert.deepEqual(displayed.contributors[0].rows, [
    ["IRMCT", 300, null, null],
    ["Another organization", 400, 0, 25],
  ]);
  assert.deepEqual(input.contributors[0].rows[0], ["IRMCT", 300, 0, 0]);
  assert.deepEqual(assessmentsForDisplay({ ...input, year: 2024 }), {
    ...input,
    year: 2024,
  });
});

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

test("retains payments without assessed amounts and reports missing fields", () => {
  const rows = [
    ["A", null, 400, 500],
    ["B", 100, null, 8],
    ["C", 0, 0, 2],
    ["C", null, null, null],
  ];
  assert.deepEqual(assessmentTotals([{ rows }]), {
    assessed: { value: 100, partial: true },
    current: { value: 400, partial: true },
    prior: { value: 510, partial: true },
    unknownCurrent: 100,
    paidWithinAssessment: 0,
  });
  assert.deepEqual(assessmentCoverageNotes(2030, rows), [
    "2030 — assessments unavailable: A.",
    "2030 — partial assessments: C.",
    "2030 — same-year payments unavailable: B.",
    "2030 — partial same-year payments: C.",
    "2030 — partial earlier-year payments: C.",
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
    assessed: { value: 200, partial: true },
    current: { value: 550, partial: true },
    prior: { value: 430, partial: false },
    unknownCurrent: 100,
    notes: [
      "2030 — assessments unavailable: B.",
      "2030 — partial same-year payments: A.",
    ],
  });
});

test("organization grouping preserves contributor identities, exclusions and unknown payments", () => {
  const contributors = [
    {
      id: "One",
      name: "Member",
      aliases: [],
      rows: [
        ["A", 100, null, 10],
        ["B", null, 300, 400],
      ],
    },
    {
      id: "Two",
      name: "Member",
      aliases: [],
      rows: [
        ["A", 100, 250, 20],
        ["B", 50, 20, 0],
      ],
    },
  ];
  const groups = assessmentOrganizationGroups(contributors);
  assert.deepEqual(
    groups.map(({ name }) => name),
    ["A", "B"],
  );
  assert.deepEqual(
    groups[0].contributors.map(({ id }) => id),
    ["One", "Two"],
  );
  assert.deepEqual(assessmentTotals(groups[0].contributors), {
    assessed: { value: 200, partial: false },
    current: { value: 250, partial: true },
    prior: { value: 30, partial: false },
    unknownCurrent: 100,
    paidWithinAssessment: 100,
  });
  assert.deepEqual(assessmentTotals(groups[1].contributors), {
    assessed: { value: 50, partial: true },
    current: { value: 320, partial: false },
    prior: { value: 400, partial: false },
    unknownCurrent: 0,
    paidWithinAssessment: 20,
  });
});
