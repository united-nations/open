import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const require = createRequire(import.meta.url);
const {
  formatBudget,
  formatCount,
  formatPercent,
  formatAssessmentRate,
  formatBudgetTick,
} = await moduleAt(require.resolve("@un-eosg/ui/format-budget"));
const { formatChf, formatCurrencyParts } = await moduleAt(
  "src/lib/budgetFunding.ts",
);
const { formatPeople } = await moduleAt("src/lib/personnel.ts");
const { formatOutstandingPercent } = await moduleAt(
  "src/lib/regularBudgetOutstanding.ts",
);

test("money uses the same short digit budget across scales and currencies", () => {
  for (const [amount, expected] of [
    [12_345_678_000, "$12.3B"],
    [123_456_789, "$123M"],
    [12_345_678, "$12.3M"],
    [1_234_567, "$1.2M"],
    [123_456, "$123K"],
    [12_000, "$12K"],
    [1_000, "$1K"],
    [1_234_567_890_000, "$1.2T"],
  ]) {
    assert.equal(formatBudget(amount), expected);
    assert.equal(formatBudget(-amount), "−" + expected);
    assert.equal(formatChf(amount), expected.replace("$", "CHF "));
  }
  assert.equal(formatCurrencyParts(12_345_678, 1_234_567), "$12.3M + CHF 1.2M");
});

test("rounding promotes units without producing 1000K or adding trailing zeros", () => {
  for (const unit of [1_000, 1_000_000, 1_000_000_000]) {
    assert.match(formatBudget(999.49 * unit), /999[KMB]$/);
    assert.match(formatBudget(999.5 * unit), /1[MBT]$/);
    assert.match(formatBudget(99.95 * unit), /100[KMB]$/);
    assert.match(formatBudget(9.95 * unit), /10[KMB]$/);
  }
});

test("small money, signed adjustments, actual zero and unavailable stay distinct", () => {
  assert.equal(formatBudget(456), "<$1K");
  assert.equal(formatBudget(0.001), "<$1K");
  assert.equal(formatBudget(-456), "−(<$1K)");
  assert.equal(formatBudget(0), "$0");
  assert.equal(formatBudget(-0), "$0");
  assert.equal(formatBudget(NaN), "—");
  assert.equal(formatBudget(Infinity), "—");
  assert.equal(formatChf(-456), "−(<CHF 1K)");
  assert.equal(formatChf(0), "CHF 0");
});

test("ordinary percentages preserve tiny amounts, signs and near-complete shares", () => {
  for (const [amount, expected] of [
    [42, "42%"],
    [12.345, "12.3%"],
    [0.4, "0.4%"],
    [0.001, "<0.1%"],
    [-0.001, "−(<0.1%)"],
    [0, "0%"],
    [-0, "0%"],
    [99.96, "<100%"],
    [100, "100%"],
    [100.04, ">100%"],
    [250, "250%"],
  ])
    assert.equal(formatPercent(amount), expected);
  assert.equal(formatPercent(99.96, { bounded: false }), "100%");
  assert.equal(formatOutstandingPercent(99.96, true), "+100%");
  assert.equal(formatOutstandingPercent(-0.001, true), "−(<0.1%)");
  assert.equal(formatOutstandingPercent(null), "Unavailable");
  assert.equal(formatPercent(NaN), "—");
});

test("official assessment rates distinguish the smallest Member State rates", () => {
  for (const [rate, expected] of [
    [22, "22%"],
    [0.125, "0.125%"],
    [0.001, "0.001%"],
    [0.01, "0.01%"],
    [1.23456, "1.235%"],
    [0, "0%"],
    [0.0001, "<0.001%"],
  ])
    assert.equal(formatAssessmentRate(rate), expected);
});

test("staff counts are compact while small counts remain whole", () => {
  assert.equal(formatCount(193), "193");
  assert.equal(formatPeople(27), "27");
  assert.equal(formatPeople(0), "0");
  assert.equal(formatPeople(123_456), "123K");
  assert.equal(formatPeople(12_345), "12.3K");
  assert.equal(formatPeople(1_000), "1K");
  assert.equal(formatPeople(NaN), "—");
});

test("the committed shared UI patch and dependency lock agree", () => {
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync("patches/@un-eosg__ui@0.1.5.patch"))
    .digest("hex");
  assert.ok(
    fs
      .readFileSync("pnpm-lock.yaml", "utf8")
      .includes(`'@un-eosg/ui@0.1.5': ${hash}`),
  );
});

test("monetary axes suppress repeated sub-thousand tick labels without hiding tooltip values", () => {
  assert.equal(formatBudgetTick(0), "$0");
  assert.equal(formatBudgetTick(0.25), "");
  assert.equal(formatBudgetTick(-250), "");
  assert.equal(formatBudgetTick(1_000), "$1K");
  assert.equal(formatBudget(250), "<$1K");
});
