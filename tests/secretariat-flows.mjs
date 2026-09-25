import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

// Exercise the production TypeScript model without a browser or a second bundler.
function load(relative, overrides = {}) {
  const filename = path.resolve(relative);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  const require = createRequire(filename);
  new Function("require", "exports", source)(
    (name) => overrides[name] ?? require(name),
    exports,
  );
  return exports;
}
const { buildSecretariatFlows, sumRecords, selectionRows } = load(
  "src/lib/secretariatFlows.ts",
  {
    "./secretariatGroupings": load("src/lib/secretariatGroupings.ts"),
  },
);
for (const year of [2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
  const data = JSON.parse(
    fs.readFileSync(`public/data/secretariat-overview-${year}.json`),
  );
  const collapsed = buildSecretariatFlows(data, data.records, new Set());
  const expanded = buildSecretariatFlows(
    data,
    data.records,
    new Set(["unitemized"]),
    Infinity,
  );
  const unitemized = data.records.filter(
    (row) => row.arrangement.family === "unitemized",
  );
  const codes = [...new Set(unitemized.map((row) => row.code))];
  const nodes = expanded.graph.nodes.filter((node) =>
    node.id.startsWith("fund:unitemized:entity:"),
  );
  assert.equal(nodes.length, codes.length);
  assert.equal(
    expanded.graph.nodes.some((node) => node.id === "fund:unitemized"),
    false,
  );
  for (const code of codes) {
    const rows = selectionRows(expanded, {
      kind: "node",
      id: `fund:unitemized:entity:${code}`,
    });
    assert.deepEqual(
      rows.map((row) => row.id).sort(),
      unitemized
        .filter((row) => row.code === code)
        .map((row) => row.id)
        .sort(),
    );
  }
  for (const model of [collapsed, expanded]) {
    const records = model.graph.nodes
      .filter((node) => node.column === 0)
      .flatMap((node) => model.nodeRows.get(node.id));
    assert.deepEqual(
      records.map((row) => row.id).sort(),
      data.records.map((row) => row.id).sort(),
    );
    assert.ok(Math.abs(sumRecords(records) - sumRecords(data.records)) < 0.01);
    assert.ok(model.graph.nodes.some((node) => node.id === "fund:trust_funds"));
    assert.ok(
      !model.graph.nodes.some((node) =>
        node.id.startsWith("fund:trust_funds:"),
      ),
    );
  }
}
console.log(
  "Unitemized expansion preserves every source record and signed total across all seven years.",
);
