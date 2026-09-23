import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { moduleAt } from "./moduleAt.mjs";
const require = createRequire(import.meta.url);
const { buildSecretariatFlows, selectionRows, selectedLinkValue, sumRecords, positiveRecords, edgeKey } =
  await moduleAt("src/lib/secretariatFlows.ts");
const { layoutSankey } = await moduleAt(require.resolve("@un-eosg/ui/sankey"));
const read = year => JSON.parse(fs.readFileSync("public/data/secretariat-overview-" + year + ".json"));
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, a + " != " + b);
const ids = rows => rows.map(r => r.id).sort();

test("every family expansion partitions every source occurrence and both signed cuts", () => {
  for (let year = 2019; year <= 2025; year++) {
    const data = read(year), families = Object.keys(data.meta.funding_families);
    for (let mask = 0; mask < 2 ** families.length; mask++) {
      const expanded = new Set(families.filter((_, i) => mask & (1 << i)));
      const model = buildSecretariatFlows(data, data.records, expanded);
      for (let column = 0; column < 3; column++) {
        const members = model.graph.nodes.filter(n => n.column === column).flatMap(n => model.nodeRows.get(n.id));
        assert.deepEqual(ids(members), ids(data.records));
        near(sumRecords(members), data.meta.total);
      }
      const layout = layoutSankey(model.graph);
      assert.ok(layout.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
      for (let column = 0; column < 2; column++) {
        const nodes = new Set(model.graph.nodes.filter(n => n.column === column).map(n => n.id));
        const links = model.graph.links.filter(l => nodes.has(l.source));
        near(links.reduce((s, l) => s + l.value, 0), data.meta.total);
        near(links.reduce((s, l) => s + l.positiveValue, 0), positiveRecords(data.records));
      }
    }
  }
});

test("every selection reconstructs only its own downstream source occurrences", () => {
  for (let year = 2019; year <= 2025; year++) {
    const data = read(year);
    const model = buildSecretariatFlows(data, data.records, new Set(Object.keys(data.meta.funding_families)));
    const selections = [...model.graph.nodes.map(n => ({ kind: "node", id: n.id })),
      ...model.graph.links.map(l => ({ kind: "edge", source: l.source, target: l.target }))];
    for (const selection of selections) {
      const selected = new Set(selectionRows(model, selection).map(r => r.id));
      for (const link of model.graph.links) {
        const expected = positiveRecords(model.edgeRows.get(edgeKey(link.source, link.target)).filter(r => selected.has(r.id)));
        near(selectedLinkValue(model, selection, link.source, link.target), expected);
      }
    }
  }
});

test("negative-only and zero-net activity retain nodes, details, gross flows and original identities", () => {
  const data = read(2025), row = data.records[0];
  for (const amounts of [[-10], [10, -10], [10]]) {
    const rows = amounts.map((amount, i) => ({ ...row, id: String(i), amount, amount_exact: String(amount) }));
    const model = buildSecretariatFlows(data, rows, new Set());
    assert.equal(model.graph.nodes.length, 3);
    assert.equal(model.graph.links.length, 2);
    const layout = layoutSankey(model.graph);
    assert.equal(layout.nodes.length, 3);
    assert.equal(layout.links.length, amounts[0] > 0 ? 2 : 0);
    for (const node of model.graph.nodes) assert.deepEqual(ids(selectionRows(model, { kind: "node", id: node.id })), ids(rows));
  }
});


test("compact funding groups can expand to every named arrangement without changing totals", () => {
  const data = read(2025), expanded = new Set(Object.keys(data.meta.funding_families));
  const compact = buildSecretariatFlows(data, data.records, expanded);
  const complete = buildSecretariatFlows(data, data.records, expanded, Infinity);
  assert.ok(compact.graph.nodes.some(n => n.isAggregate));
  assert.ok(!complete.graph.nodes.some(n => n.isAggregate));
  assert.equal(complete.graph.nodes.filter(n => n.column === 0).length,
    new Set(data.records.map(r => r.arrangement.id)).size);
  assert.ok(complete.graph.nodes.some(n => n.label.includes("Spotlight")));
  near(sumRecords(complete.rows), sumRecords(compact.rows));
});
