import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

// Exercise the production collector, following tests/secretariat-flows.mjs.
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
const { fundingSources } = load(
  createRequire(import.meta.url).resolve("@un-eosg/ui/funding-sources"),
);
const {
  collectBudgetNodeSources,
  collectBudgetHierarchySources,
  uniqueBudgetSources,
} = load("src/lib/budgetSourceCollection.ts", {
  "@/lib/sourceReferences": load("src/lib/sourceReferences.ts"),
  "@/lib/budgetGroupings": { FUNDING_SOURCES: fundingSources },
});
const read = (filename) => JSON.parse(fs.readFileSync(filename, "utf8"));
const data = read("public/data/budget-ppb-expenditure-2024.json");
const eosg = data.nodes.find(
  (node) => node.id === "section-1~executive-office-of-the-secretary-general",
);
const before = structuredClone(eosg);
const references = collectBudgetNodeSources(eosg);
assert.equal(
  references.length,
  3,
  "EOSG needs three funding rows, not five citations",
);
assert.deepEqual(
  references.map((source) => source.rowLabel),
  ["Subtotal, 1", "Subtotal, 2", "Subtotal, 3"],
);
assert.deepEqual(
  references.map((source) => source.label),
  ["regular budget", "other assessed", "extrabudgetary"],
);
assert.ok(references.every((source) => source.pdfPage === 31));
assert.deepEqual(
  eosg,
  before,
  "Collecting citations must not mutate financial data",
);

// A distinct printed total remains inspectable, including when it disagrees.
const total = {
  ...eosg.sources.total_all_sources,
  rowLabel: "Total",
  tableTitle: "All resources",
};
const withTotal = {
  ...eosg,
  sources: { ...eosg.sources, total_all_sources: total },
  source: total,
};
assert.equal(collectBudgetNodeSources(withTotal).length, 4);
assert.equal(
  collectBudgetNodeSources(withTotal).at(-1).label,
  "All funding sources",
);

// Older records lacking metricSources must still prefer funding rows.
assert.equal(
  collectBudgetNodeSources({ ...eosg, metricSources: undefined }).length,
  3,
);
assert.equal(
  collectBudgetNodeSources({
    ...eosg,
    metricSources: { expenditure: { regular_budget: [] } },
  }).length,
  3,
);
// Legacy peacekeeping and trust-fund nodes can rely entirely on general evidence.
const generic = {
  ...eosg,
  sources: undefined,
  metricSources: undefined,
  supportingSources: [eosg.source],
};
assert.equal(collectBudgetNodeSources(generic).length, 1);

// Preserve actual differences in table, row, column, page, and budget item.
const source = references[0];
const extra = [
  { ...source, tableTitle: "Other table" },
  { ...source, rowLabel: "Other row" },
  { ...source, columnHeader: "2023 expenditure" },
  { ...source, pdfPage: 32 },
  { ...source, budgetItem: "Another entity" },
];
assert.equal(
  collectBudgetNodeSources({ ...eosg, supportingSources: [source, ...extra] })
    .length,
  8,
);
assert.equal(
  uniqueBudgetSources([
    source,
    { ...source, url: source.url.split("#")[0], pdfPages: [31, 31] },
  ]).length,
  1,
);

// Metric-specific labels can be filled from funding keys, but expenditure
// evidence must never leak into approved or proposed views.
const approved = { ...source, label: undefined, columnHeader: "2025 approved" };
const metricNode = {
  ...eosg,
  metricSources: { approved: { regular_budget: [approved] } },
};
assert.equal(collectBudgetNodeSources(metricNode, "approved").length, 1);
assert.equal(
  collectBudgetNodeSources(metricNode, "approved")[0].label,
  fundingSources.regular_budget.label,
);
assert.deepEqual(collectBudgetNodeSources(metricNode, "proposed"), []);

// Hierarchy references retain child context and tolerate accidental cycles.
const child = { ...eosg, id: "child", label: "Child entity" };
const hierarchy = collectBudgetHierarchySources(eosg, {
  [eosg.id]: [child],
  child: [eosg],
});
assert.equal(hierarchy.length, 6);
assert.equal(new Set(hierarchy.map((source) => source.budgetItem)).size, 2);

// Audit every exported budget node: collection must preserve every distinct
// expenditure source row, even when it removes legacy aliases of that row.
const evidenceKey = (source) =>
  JSON.stringify([
    source.url.split("#")[0],
    [
      ...new Set(source.pdfPages ?? (source.pdfPage ? [source.pdfPage] : [])),
    ].sort((a, b) => a - b),
    source.symbol,
    source.tableTitle,
    source.rowLabel,
    source.columnHeader,
    source.budgetItem,
  ]);
let audited = 0;
for (const file of fs
  .readdirSync("public/data")
  .filter((name) => /^budget-.*\.json$/.test(name))) {
  for (const node of read(`public/data/${file}`).nodes ?? []) {
    const contextualize = (reference) => ({
      ...reference,
      budgetItem:
        reference.budgetItem ??
        (node.code && !node.label.includes(node.code)
          ? `${node.code} · ${node.label}`
          : node.label),
    });
    const metricSources = node.metricSources?.expenditure ?? {};
    const original = [
      ...Object.values(metricSources).flat(),
      ...Object.entries(node.sources ?? {})
        .filter(([funding]) => !metricSources[funding]?.length)
        .map(([, source]) => source),
      node.source,
      ...(node.supportingSources ?? []),
    ]
      .filter(Boolean)
      .map(contextualize);
    assert.deepEqual(
      new Set(collectBudgetNodeSources(node).map(evidenceKey)),
      new Set(original.map(evidenceKey)),
      `${file}: ${node.id} lost distinct evidence`,
    );
    audited++;
  }
}
console.log(
  `Budget citation regressions passed; preserved distinct evidence for ${audited} exported nodes.`,
);
