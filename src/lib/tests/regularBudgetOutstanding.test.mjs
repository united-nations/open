import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  outstandingAmount,
  outstandingChange,
  percentageOf,
  formatOutstandingPercent,
  formatReportedOutstandingTotal,
  assignOutstandingCountryColors,
  OUTSTANDING_TOTAL_COLOR,
} = await moduleAt("src/lib/regularBudgetOutstanding.ts");

test("comparison colours remain distinct and stable as selection changes", () => {
  const names = Array.from({ length: 20 }, (_, index) => `Country ${index}`);
  const first = assignOutstandingCountryColors({}, names.slice(0, 8));
  assert.equal(new Set(Object.values(first)).size, 8);
  assert.ok(!Object.values(first).includes(OUTSTANDING_TOTAL_COLOR));
  const next = assignOutstandingCountryColors(first, [
    names[7],
    names[2],
    ...names.slice(8),
  ]);
  assert.equal(new Set(Object.values(next)).size, 20);
  for (const name of names.slice(0, 8)) assert.equal(next[name], first[name]);
  assert.equal(Object.keys(first).length, 8);
});

test("unknown observations do not become zero or partial selected totals", () => {
  const row = {
    meta: { total_outstanding: 100 },
    contributors: [
      { name: "A", outstanding_amount: 100 },
      { name: "B", outstanding_amount: 0 },
    ],
  };
  assert.equal(outstandingAmount(undefined), null);
  assert.equal(outstandingAmount(row, ["A", "unknown"]), null);
  assert.equal(outstandingAmount(row, ["B"]), 0);
  assert.equal(outstandingAmount(row), 100);
});

test("reported amounts retain source precision internally and use compact display", () => {
  const snapshot = {
    meta: {
      reported_total: 1_255_000_000,
      reported_total_tolerance: 500_000,
      total_outstanding: 1_254_267_798,
    },
    contributors: [{ name: "A", outstanding_amount: 1_254_267_798 }],
  };
  assert.equal(outstandingAmount(snapshot), 1_255_000_000);
  assert.equal(outstandingAmount(snapshot, ["A"]), 1_254_267_798);
  assert.equal(formatReportedOutstandingTotal(snapshot), "$1.3B");
  assert.equal(
    formatReportedOutstandingTotal({
      ...snapshot,
      meta: {
        reported_total: 1_496_578_501,
        reported_total_tolerance: 1,
        total_outstanding: 1_496_578_500,
      },
    }),
    "$1.5B",
  );
});

test("changes distinguish missing, zero, new and cleared balances", () => {
  assert.deepEqual(outstandingChange(10, null), {
    amount: null,
    percent: null,
    newBalance: false,
  });
  assert.deepEqual(outstandingChange(10, 0), {
    amount: 10,
    percent: null,
    newBalance: true,
  });
  assert.deepEqual(outstandingChange(0, 10), {
    amount: -10,
    percent: -100,
    newBalance: false,
  });
  assert.deepEqual(outstandingChange(0, 0), {
    amount: 0,
    percent: null,
    newBalance: false,
  });
  assert.deepEqual(outstandingChange(15, 10), {
    amount: 5,
    percent: 50,
    newBalance: false,
  });
});

test("accumulated debt can exceed one annual assessment", () => {
  assert.equal(percentageOf(250, 100), 250);
  assert.equal(percentageOf(0, 100), 0);
  assert.equal(percentageOf(10, 0), null);
  assert.equal(percentageOf(10, null), null);
  assert.equal(formatOutstandingPercent(0.0003), "<0.1%");
  assert.equal(formatOutstandingPercent(0), "0%");
});
