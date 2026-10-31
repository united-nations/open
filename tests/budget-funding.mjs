import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const module = { exports: {} };
const code = ts.transpileModule(
  fs.readFileSync("src/lib/budgetFunding.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
new Function("require", "exports", code)(
  () => ({
    BUDGET_FUNDING_SOURCES: [
      "regular_budget",
      "other_assessed",
      "extrabudgetary",
    ],
  }),
  module.exports,
);
const { budgetFundingEntries, budgetFundingPoint } = module.exports;
const node = { values: { regular_budget: 0, extrabudgetary: -476500 } };
assert.deepEqual(budgetFundingEntries(node), [
  ["regular_budget", 0],
  ["extrabudgetary", -476500],
]);
assert.deepEqual(budgetFundingPoint(2025, node), {
  year: "2025",
  regular_budget: 0,
  other_assessed: null,
  extrabudgetary: -476500,
});
assert.deepEqual(budgetFundingPoint(2024), {
  year: "2024",
  regular_budget: null,
  other_assessed: null,
  extrabudgetary: null,
});
const read = (year) =>
  JSON.parse(
    fs.readFileSync(`public/data/budget-ppb-expenditure-${year}.json`, "utf8"),
  );
const data = read(2025);
const eosg = data.nodes.find((n) => n.entity?.acronym === "EOSG");
assert.deepEqual(eosg.values, {
  regular_budget: 17602100,
  other_assessed: 1195900,
  extrabudgetary: 34180200,
});
assert.equal(eosg.amount, 52978200);
assert.equal(budgetFundingPoint(2025, eosg).extrabudgetary, 34180200);
assert.equal(data.meta.total, 12085071200);
for (const funding of ["regular_budget", "other_assessed", "extrabudgetary"]) {
  assert.ok(eosg.metricSources.expenditure[funding].length > 0);
  assert.ok(
    eosg.metricSources.expenditure[funding].every((ref) => ref.pdfPage === 34),
  );
}
console.log("Budget funding regression checks passed");
