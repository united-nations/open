import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { moduleAt } from "./moduleAt.mjs";
const require = createRequire(import.meta.url);
const { buildSecretariatColumnFlows, secretariatFlowDimensions, buildSecretariatFundingFlows, buildSecretariatFlows, selectionRows, selectedLinkValue, sumRecords, positiveRecords, edgeKey } =
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
  // Unitemized resources already expand by reporting entity, rather than by
  // the single generic source arrangement used in the ledger.
  const namedArrangements = new Set(data.records.filter(r => r.arrangement.family !== "unitemized").map(r => r.arrangement.id));
  const unitemizedEntities = new Set(data.records.filter(r => r.arrangement.family === "unitemized").map(r => r.code));
  assert.equal(complete.graph.nodes.filter(n => n.column === 0).length,
    namedArrangements.size + unitemizedEntities.size);
  assert.ok(complete.graph.nodes.some(n => n.label.includes("Spotlight")));
  near(sumRecords(complete.rows), sumRecords(compact.rows));
});


test("direct funding flows conserve both columns and every source-priority intersection", () => {
  for (let year = 2019; year <= 2025; year++) {
    const data = read(year);
    const model = buildSecretariatFundingFlows(data);
    const layout = layoutSankey(model.graph, 2);
    assert.ok(layout.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
    assert.deepEqual([...new Set(model.graph.nodes.map(n => n.column))].sort(), [0, 1]);
    for (const column of [0, 1]) {
      const ranked = layout.nodes.filter(node => node.column === column).sort((a, b) => a.y - b.y);
      const totals = ranked.map(node => sumRecords(model.nodeRows.get(node.id)));
      assert.deepEqual(totals, [...totals].sort((a, b) => b - a));
      const members = model.graph.nodes.filter(n => n.column === column).flatMap(n => model.nodeRows.get(n.id));
      assert.deepEqual(ids(members), ids(data.records));
      near(sumRecords(members), data.meta.total);
    }
    near(model.graph.links.reduce((sum, link) => sum + link.value, 0), data.meta.total);
    near(model.graph.links.reduce((sum, link) => sum + link.positiveValue, 0), positiveRecords(data.records));
    for (const link of model.graph.links) {
      const expected = data.records.filter(row => link.source === "source:" + row.funding_source && link.target === "priority:" + row.priority_area);
      assert.deepEqual(ids(selectionRows(model, { kind: "edge", source: link.source, target: link.target })), ids(expected));
      const source = model.graph.nodes.find(node => node.id === link.source);
      assert.equal(link.color, source.color);
      const ribbon = layout.links.find(ribbon => ribbon.source === link.source && ribbon.target === link.target);
      if (ribbon) assert.equal(ribbon.color, source.color);
      near(link.value, sumRecords(expected));
      near(selectedLinkValue(model, { kind: "node", id: link.source }, link.source, link.target), positiveRecords(expected));
    }
    for (const node of model.graph.nodes.filter(n => n.column === 0)) {
      const token = node.id.slice("source:".length).replaceAll("_", "-");
      assert.equal(node.color, `var(--color-open-funding-${token})`);
    }
  }
});

test("direct funding flows retain negative-only and zero-net records in details", () => {
  const data = read(2025), row = data.records[0];
  for (const amounts of [[-10], [10, -10], [10]]) {
    const rows = amounts.map((amount, i) => ({ ...row, id: String(i), amount, amount_exact: String(amount) }));
    const model = buildSecretariatFundingFlows(data, rows);
    assert.equal(model.graph.nodes.length, 2);
    assert.equal(model.graph.links.length, 1);
    const layout = layoutSankey(model.graph, 2);
    assert.equal(layout.nodes.length, 2);
    assert.equal(layout.links.length, amounts[0] > 0 ? 1 : 0);
    for (const node of model.graph.nodes) assert.deepEqual(ids(selectionRows(model, { kind: "node", id: node.id })), ids(rows));
  }
});

test("every valid column combination preserves source occurrences, signed totals and positive ribbons", () => {
  const years = fs.readdirSync("public/data").flatMap(name => {
    const match = /^secretariat-overview-(\d+)\.json$/.exec(name);
    return match ? [Number(match[1])] : [];
  });
  for (const year of years) {
    const data = read(year);
    for (const funding of ["mechanism", "arrangement", "none"]) {
      for (const entity of ["category", "entity", "none"]) {
        for (const priority of ["priority", "none"]) {
          const choices = { funding, entity, priority };
          const dimensions = secretariatFlowDimensions(choices);
          if (dimensions.length < 2) {
            assert.throws(() => buildSecretariatColumnFlows(data, choices), /at least two/);
            continue;
          }
          for (const limit of [12, Infinity]) {
            const model = buildSecretariatColumnFlows(data, choices, limit);
            const layout = layoutSankey(model.graph, 3);
            const columns = [choices.funding, choices.entity, choices.priority].flatMap((dimension, column) => dimension === "none" ? [] : [column]);
            for (const node of layout.nodes) {
              near(node.x, 190 + node.column * 345);
              near(node.revenue, sumRecords(model.nodeRows.get(node.id)));
              near(node.spending, sumRecords(model.nodeRows.get(node.id)));
            }
            assert.ok(layout.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
            for (const column of columns) {
              const nodes = model.graph.nodes.filter(node => node.column === column);
              assert.deepEqual(ids(nodes.flatMap(node => model.nodeRows.get(node.id))), ids(data.records));
              if (column === columns.at(-1)) continue;
              const sources = new Set(nodes.map(node => node.id));
              const links = model.graph.links.filter(link => sources.has(link.source));
              near(links.reduce((total, link) => total + link.value, 0), data.meta.total);
              near(links.reduce((total, link) => total + link.positiveValue, 0), positiveRecords(data.records));
              for (const link of links) {
                const expected = data.records.filter(row =>
                  model.nodeRows.get(link.source).includes(row) &&
                  model.nodeRows.get(link.target).includes(row)
                );
                assert.deepEqual(ids(selectionRows(model, { kind: "edge", source: link.source, target: link.target })), ids(expected));
              }
            }
            if (limit === Infinity) assert.ok(!model.graph.nodes.some(node => node.isAggregate));
          }
        }
      }
    }
  }
});

test("configurable default matches the original direct mapping", () => {
  const data = read(2025);
  const original = buildSecretariatFundingFlows(data);
  const configured = buildSecretariatColumnFlows(data, { funding: "mechanism", entity: "none", priority: "priority" });
  assert.deepEqual(configured.graph, {
    ...original.graph,
    nodes: original.graph.nodes.map(node => ({ ...node, column: node.column === 1 ? 2 : 0 })),
  });
});

test("configurable two and three column flows retain negative-only and net-zero activity", () => {
  const data = read(2025), row = data.records[0];
  for (const amounts of [[-10], [10, -10], [10]]) {
    const rows = amounts.map((amount, i) => ({ ...row, id: String(i), amount, amount_exact: String(amount) }));
    for (const choices of [
      { funding: "none", entity: "entity", priority: "priority" },
      { funding: "arrangement", entity: "entity", priority: "none" },
      { funding: "mechanism", entity: "category", priority: "priority" },
    ]) {
      const model = buildSecretariatColumnFlows(data, choices, 12, rows);
      for (const node of model.graph.nodes) assert.deepEqual(ids(selectionRows(model, { kind: "node", id: node.id })), ids(rows));
      for (const link of model.graph.links) {
        near(link.value, sumRecords(rows));
        near(link.positiveValue, positiveRecords(rows));
      }
      const layout = layoutSankey(model.graph, 3);
      assert.equal(layout.nodes.length, secretariatFlowDimensions(choices).length);
      assert.equal(layout.links.length, amounts[0] > 0 ? model.graph.links.length : 0);
    }
  }
});
