import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const formatExports = {};
new Function(
  "exports",
  ts.transpileModule(
    fs.readFileSync(require.resolve("@un-eosg/ui/format-budget"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(formatExports);

const module = { exports: {} };
const code = ts.transpileModule(
  fs.readFileSync("src/lib/budgetFunding.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
new Function("require", "exports", code)(
  (name) =>
    name === "@/lib/entities"
      ? formatExports
      : {
          BUDGET_FUNDING_SOURCES: [
            "regular_budget",
            "other_assessed",
            "extrabudgetary",
          ],
        },
  module.exports,
);
const {
  budgetFundingEntries,
  budgetFundingPoint,
  formatBudgetNode,
  formatBudgetFunding,
} = module.exports;
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
assert.equal(data.meta.publishedUsdTotal, 12085071200);
for (const funding of ["regular_budget", "other_assessed", "extrabudgetary"]) {
  assert.ok(eosg.metricSources.expenditure[funding].length > 0);
  assert.ok(
    eosg.metricSources.expenditure[funding].every((ref) => ref.pdfPage === 34),
  );
}
console.log("Budget funding regression checks passed");

const itc = data.nodes.find(
  (node) => node.tier === "budget_unit" && node.entity?.acronym === "ITC",
);
assert.equal(itc.chf.amount, 109410100);
assert.equal(formatBudgetFunding(itc, "extrabudgetary"), "CHF 109.4M");
assert.equal(formatBudgetNode(itc), "$22.5M + CHF 109.4M");
assert.ok(
  !formatBudgetNode(itc).includes("131.5"),
  "Converted layout weight must not be printed as USD expenditure",
);
assert.ok(itc.values.extrabudgetary > 131000000);
const root = data.nodes.find((node) => node.parentId === null);
assert.equal(root.chf.amount, itc.chf.amount);
assert.equal(root.chf.usdForLayout, itc.chf.usdForLayout);
