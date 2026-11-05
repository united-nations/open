import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moduleAt } from "./moduleAt.mjs";

const { buildFieldMissionModel } = await moduleAt("src/lib/fieldMissions.ts");
const geography = JSON.parse(
  fs.readFileSync("public/data/secretariat-entities.json"),
);
const read = (year) =>
  JSON.parse(fs.readFileSync(`public/data/secretariat-overview-${year}.json`));
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);

test("the full annual composition conserves expenditure and anchors each mission to its bar segment", () => {
  for (let year = 2019; year <= 2025; year++) {
    const data = read(year);
    const model = buildFieldMissionModel(data, geography, ["spm", "pko"]);
    assert.deepEqual(
      Object.keys(model.groups).sort(),
      Object.keys(data.meta.groups).sort(),
    );
    near(
      Object.values(model.totals).reduce((sum, amount) => sum + amount, 0),
      data.meta.total,
    );
    const ordered = Object.keys(data.meta.groups).sort(
      (a, b) => data.meta.groups[a].order - data.meta.groups[b].order,
    );
    for (const connector of model.connectors) {
      const before = ordered.slice(0, ordered.indexOf(connector.group));
      const start =
        (before.reduce((sum, group) => sum + model.totals[group], 0) /
          data.meta.total) *
        100;
      near(connector.start, start);
      near(
        connector.end - connector.start,
        (model.totals[connector.group] / data.meta.total) * 100,
      );
    }
    near(model.connectors[0].expandedStart, 0);
    near(model.connectors.at(-1).expandedEnd, 100);
    near(model.connectors[0].expandedEnd, model.connectors[1].expandedStart);
  }
  const model = buildFieldMissionModel(read(2025), geography, ["spm", "pko"]);
  near(
    model.totals.regional + model.totals.common + model.totals.unallocated,
    1114725018.79,
  );
  near(
    model.connectors.reduce(
      (sum, connector) => sum + connector.end - connector.start,
      0,
    ),
    43.50850768756021,
  );
});

test("map eligibility retains location evidence while annual classifications determine mission membership", () => {
  for (let year = 2019; year <= 2025; year++) {
    const data = read(year);
    const model = buildFieldMissionModel(data, geography, ["spm", "pko"]);
    assert.ok(
      !model.locatedMissions.some(({ location }) => location.code === "UNRoD"),
    );
    assert.ok(
      model.locatedMissions.every(
        ({ location }) => location.kind !== "support",
      ),
    );
    for (const mission of model.locatedMissions) {
      const source = data.entities.filter(
        (entity) =>
          (geography.aliases[entity.code] ?? entity.code) ===
            mission.location.code && entity.group === mission.group,
      );
      near(
        mission.amount,
        source.reduce((sum, entity) => sum + entity.total, 0),
      );
    }
  }
});

test("connector anchors follow changed group order and preserve non-mission groups between missions", () => {
  const data = structuredClone(read(2025));
  const order = [
    "pko",
    "regional",
    "secretariat",
    "common",
    "spm",
    "other",
    "unallocated",
  ];
  order.forEach((group, index) => {
    data.meta.groups[group].order = index;
  });
  const model = buildFieldMissionModel(data, geography, ["spm", "pko"]);
  assert.deepEqual(
    model.connectors.map(({ group }) => group),
    ["pko", "spm"],
  );
  near(model.connectors[0].start, 0);
  assert.ok(model.connectors[1].start > model.connectors[0].end);
  near(model.connectors[0].expandedEnd, model.connectors[1].expandedStart);
});

test("zero and signed-only activity never creates invalid connector geometry", () => {
  const data = structuredClone(read(2025));
  data.entities = data.entities.map((entity) => ({
    ...entity,
    total: entity.group === "spm" ? -1 : 0,
  }));
  const model = buildFieldMissionModel(data, geography, ["spm", "pko"]);
  assert.equal(model.connectors.length, 0);
  assert.equal(model.locatedMissions.length, 0);
  assert.ok(model.totals.spm < 0);
});
