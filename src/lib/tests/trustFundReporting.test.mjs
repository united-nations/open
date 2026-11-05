import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  trustFundReportingData,
  trustFundScheduleGroups,
  trustFundSearchText,
  findTrustFundYearNode,
} = await moduleAt("src/lib/trustFundReporting.ts");
const profiles = JSON.parse(fs.readFileSync("config/features.json", "utf8"));

test("matrix accounts have no invented history before their first source column", () => {
  const latest = JSON.parse(
    fs.readFileSync("public/data/budget-trust-funds-2024.json"),
  );
  for (const [slug, firstYear] of [
    ["spotlight-initiative-2-0-fund", 2024],
    ["digital-cooperation-fund", 2023],
  ]) {
    const selected = latest.nodes.find((node) =>
      node.id.endsWith(`:fund:mptf:${slug}`),
    );
    assert.ok(selected);
    for (let year = 2017; year <= 2024; year++) {
      const annual = JSON.parse(
        fs.readFileSync(`public/data/budget-trust-funds-${year}.json`),
      );
      const matched = findTrustFundYearNode(annual.nodes, selected);
      if (year < firstYear) assert.equal(matched, undefined, `${slug} ${year}`);
      else assert.equal(matched.id, selected.id, `${slug} ${year}`);
    }
  }
});

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

test("schedule grouping preserves every signed fund and its original sidebar identity across years", () => {
  for (const year of [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]) {
    const data = JSON.parse(
      fs.readFileSync(`public/data/budget-trust-funds-${year}.json`),
    );
    const before = JSON.stringify(data);
    const groups = trustFundScheduleGroups(data);
    const funds = groups.flatMap((group) => group.funds);
    const originals = data.nodes.filter(
      (node) => node.tier === "detail" && node.sourceGroup === "volume_i",
    );
    assert.deepEqual(
      funds.map((node) => node.id).sort(),
      originals.map((node) => node.id).sort(),
    );
    assert.equal(new Set(funds.map((node) => node.id)).size, originals.length);
    assert.equal(
      groups.reduce((sum, group) => sum + group.amount, 0),
      data.meta.sourceGroups.find((group) => group.id === "volume_i").amount,
    );
    assert.ok(funds.some((fund) => fund.amount <= 0));
    assert.ok(funds.some((fund) => fund.id.includes("UNMAPPED")));
    assert.equal(
      funds.find((fund) => fund.code === "SIM").scheduleGroup.code,
      year < 2020 ? "4" : "2",
    );
    assert.equal(JSON.stringify(data), before);
    const byId = new Map(data.nodes.map((node) => [node.id, node]));
    const sna = funds.find((fund) => fund.code === "SNA");
    const parent = byId.get(sna.parentId);
    assert.match(trustFundSearchText(sna, parent, "group"), /DGC/);
    assert.match(
      trustFundSearchText(sna, parent, "group"),
      /Common support and miscellaneous/,
    );
    assert.match(trustFundSearchText(sna, parent, "entity"), /SNA/);
    assert.equal(
      groups
        .find((group) => group.code === "5")
        .funds.some((fund) => fund.code === "SNA"),
      false,
    );
    assert.equal(
      groups.find((group) => group.code === "6").funds.includes(sna),
      true,
    );
  }
});
