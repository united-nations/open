import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moduleAt } from "./moduleAt.mjs";
const { adjustMoneyData, moneyAdjustmentFactor, missingAdjustmentPeriods } =
  await moduleAt("src/lib/moneyBasis.ts");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("published unadjusted CPI-U annual averages and a fixed 2025 base", () => {
  const source = JSON.parse(fs.readFileSync("public/data/us-cpi.json"));
  assert.equal(source.seriesId, "CUUR0000SA0");
  assert.equal(source.baseYear, 2025);
  assert.equal(source.annual["2011"], 224.939);
  assert.equal(source.annual["2024"], 313.689);
  assert.equal(source.annual["2025"], 321.943);
  assert.match(source.notes["2025"], /excludes October/);
  near(moneyAdjustmentFactor(2025), 1);
  near(moneyAdjustmentFactor(2011), 321.943 / 224.939);
});

test("nominal is an exact identity; conversion cannot mutate chart source totals", () => {
  const rows = Object.freeze([
    Object.freeze({
      year: "2011",
      revenue: 100,
      expenses: -10,
      countries: 5,
      gap: null,
    }),
  ]);
  assert.equal(adjustMoneyData(rows, ["revenue", "expenses"], "nominal"), rows);
  const adjusted = adjustMoneyData(
    rows,
    ["revenue", "expenses", "gap"],
    "adjusted",
  )[0];
  near(adjusted.revenue, (100 * 321.943) / 224.939);
  near(adjusted.expenses, (-10 * 321.943) / 224.939);
  assert.equal(adjusted.countries, 5);
  assert.equal(adjusted.gap, null);
  assert.equal(rows[0].revenue, 100);
});

test("future years are gaps, never extrapolated, zero-filled, or dropped", () => {
  const rows = [
    { year: "2025", amount: 0 },
    { year: "2026", amount: 100 },
    { year: "2027", amount: -10 },
  ];
  const adjusted = adjustMoneyData(rows, ["amount"], "adjusted");
  assert.equal(adjusted.length, rows.length);
  assert.deepEqual(
    adjusted.map((row) => row.amount),
    [0, null, null],
  );
  assert.deepEqual(missingAdjustmentPeriods(rows, ["amount"]), [
    "2026",
    "2027",
  ]);
  assert.equal(moneyAdjustmentFactor("not-a-year"), null);
});

test("fiscal cycles use both annual indices and require both observations", () => {
  near(moneyAdjustmentFactor("2024/25"), 321.943 / ((313.689 + 321.943) / 2));
  assert.equal(
    moneyAdjustmentFactor("2024/2025"),
    moneyAdjustmentFactor("2024/25"),
  );
  assert.equal(moneyAdjustmentFactor("2025/26"), null);
  assert.equal(moneyAdjustmentFactor("2023–2025"), null);
});
