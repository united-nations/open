import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const { sumAssessments, unknownCurrentAssessments } = await moduleAt(
  "src/lib/cebAssessments.ts",
);

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
