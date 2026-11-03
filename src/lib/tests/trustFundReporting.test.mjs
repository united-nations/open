import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const { trustFundReportingData } = await moduleAt(
  "src/lib/trustFundReporting.ts",
);
const profiles = JSON.parse(fs.readFileSync("config/features.json", "utf8"));

test("additional trust funds default to off in both site versions", () => {
  assert.equal(profiles.public.additionalTrustFunds, false);
  assert.equal(profiles.preview.additionalTrustFunds, false);
});

test("disabled additional reports preserve each year's signed Volume I ledger and root total", () => {
  const paths = fs
    .readdirSync("public/data")
    .filter((path) => /^budget-trust-funds-\d{4}\.json$/.test(path));
  assert.ok(paths.length > 0);
  for (const path of paths) {
    const original = JSON.parse(fs.readFileSync(`public/data/${path}`, "utf8"));
    const before = JSON.stringify(original);
    const visible = trustFundReportingData(original, false);
    assert.equal(
      JSON.stringify(original),
      before,
      `${path}: source remains intact`,
    );
    const control = original.meta.sourceGroups.find(
      (group) => group.id === "volume_i",
    );
    assert.equal(visible.meta.total, control.amount, path);
    assert.deepEqual(
      visible.meta.sourceGroups.map((group) => group.id),
      ["volume_i"],
    );
    assert.ok(
      visible.nodes.every((node) => node.sourceGroup === "volume_i"),
      path,
    );
    const roots = visible.nodes.filter((node) => node.parentId === null);
    assert.equal(roots.length, 1, path);
    assert.equal(roots[0].amount, control.amount, path);
    const byId = new Map(visible.nodes.map((node) => [node.id, node]));
    for (const node of visible.nodes) {
      if (node.parentId !== null)
        assert.ok(byId.has(node.parentId), `${path}: connected hierarchy`);
      const source = original.nodes.find((item) => item.id === node.id);
      assert.deepEqual(
        { ...node, parentId: source.parentId },
        source,
        `${path}: reported values and source details preserved`,
      );
    }
    assert.equal(
      trustFundReportingData(original, true),
      original,
      `${path}: enabling restores all reports`,
    );
    assert.deepEqual(
      trustFundReportingData(original),
      visible,
      `${path}: default follows flag`,
    );
  }
});

test("other budgets and legacy schedule-only files are unaffected", () => {
  for (const data of [
    { meta: { stream: "ppb" }, nodes: [] },
    { meta: { stream: "trust_funds" }, nodes: [] },
  ])
    assert.equal(trustFundReportingData(data, false), data);
});
