import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  personnelSexTotals,
  personnelGradeGroups,
  personnelPyramidScale,
  personnelPyramidWidths,
  personnelCompositionTrend,
  personnelTrendHeadcount,
} = await moduleAt("src/lib/personnel.ts");

function record(category, grade, sex, count, subcategory = "High") {
  return { org: "Example", category, subcategory, grade, sex, count };
}

test("gender totals retain NA and aggregate counts rather than averaging shares", () => {
  assert.deepEqual(
    personnelSexTotals([
      { sex: "F", count: 100 },
      { sex: "M", count: 50 },
      { sex: "F", count: 2 },
      { sex: "NA", count: 7 },
    ]),
    { female: 102, male: 50, unknown: 7, total: 159 },
  );
});

test("ranks CEB's above D-2 group above directors and keeps grade families distinct", () => {
  const groups = personnelGradeGroups([
    record("General Service", "G7", "F", 11),
    record("International Professional", "P-3", "F", 4),
    record("International Professional", "UG", "M", 5),
    record("International Professional", "D-1", "M", 7),
    record("National Professional", "NOA", "F", 3),
    record("National Professional", "NOE", "M", 9),
    record("International Professional", "D-2", "F", 2),
    record("General Service", "G10", "M", 1),
    record("International Professional", "P-O", "NA", 6),
  ]);
  assert.deepEqual(
    groups.map((group) => group.category),
    ["International Professional", "National Professional", "General Service"],
  );
  assert.deepEqual(
    groups[0].rows.map((row) => row.label),
    ["Above D-2 (UG)", "D-2", "D-1", "P-3", "P-O"],
  );
  assert.deepEqual(
    groups[1].rows.map((row) => row.label),
    ["NOE", "NOA"],
  );
  assert.deepEqual(
    groups[2].rows.map((row) => row.label),
    ["G10", "G7"],
  );
  assert.equal(groups[0].rows.at(-1).unknown, 6);
});

test("identical grade labels in different staff categories never merge", () => {
  const groups = personnelGradeGroups([
    record("General Service", "Other", "F", 10),
    record("International Professional", "Other", "M", 20),
    record("International Professional", "Other", "F", 2, "Other grades"),
  ]);
  assert.deepEqual(
    groups.map((group) => group.rows[0].total),
    [22, 10],
  );
  assert.equal(new Set(groups.map((group) => group.rows[0].key)).size, 2);
});

test("population-pyramid widths share a symmetric count scale and keep unknown sex separate", () => {
  const rows = [
    { female: 10, male: 20, unknown: 3, total: 33 },
    { female: 0, male: 5, unknown: 0, total: 5 },
  ];
  const maximum = personnelPyramidScale(rows);
  assert.equal(maximum, 20);
  assert.deepEqual(personnelPyramidWidths(rows[0], maximum), {
    female: 25,
    male: 50,
    unknown: 7.5,
  });
  assert.deepEqual(personnelPyramidWidths(rows[1], maximum), {
    female: 0,
    male: 12.5,
    unknown: 0,
  });
  assert.equal(
    personnelPyramidWidths(
      { female: 20, male: 10, unknown: 3, total: 33 },
      maximum,
    ).female,
    50,
  );
});

test("a larger unknown-sex count cannot overflow its separate pyramid track", () => {
  const row = { female: 1, male: 2, unknown: 100, total: 103 };
  const maximum = personnelPyramidScale([row]);
  assert.equal(maximum, 100);
  assert.deepEqual(personnelPyramidWidths(row, maximum), {
    female: 0.5,
    male: 1,
    unknown: 50,
  });
  assert.equal(personnelPyramidScale([]), 1);
});

const compositionHistory = {
  years: [
    {
      year: 2020,
      total: 100,
      organizations: { A: 10, B: 90 },
      female: 60,
      male: 30,
      unknown: 10,
      genderByOrganization: {
        A: { female: 1, male: 8, unknown: 1 },
        B: { female: 59, male: 22, unknown: 9 },
      },
      ageBands: { "40-44 years": 70, "under 25 years": 20, NA: 10 },
      tenureBands: { "10 to 14 years": 60, "under 5 years": 30, NA: 10 },
    },
    {
      year: 2021,
      total: 40,
      organizations: { B: 40 },
      female: 20,
      male: 20,
      unknown: 0,
      genderByOrganization: { B: { female: 20, male: 20, unknown: 0 } },
      ageBands: { "40-44 years": 40 },
      tenureBands: { "under 5 years": 40 },
    },
  ],
};

test("relative gender history weights source counts and includes unknown sex in its denominator", () => {
  const all = personnelCompositionTrend(compositionHistory, "gender", "all");
  assert.deepEqual(all.points[0].shares, { female: 60, male: 30, unknown: 10 });
  const organization = personnelCompositionTrend(
    compositionHistory,
    "gender",
    "A",
  );
  assert.deepEqual(organization.points[0].shares, {
    female: 10,
    male: 80,
    unknown: 10,
  });
  assert.equal(organization.points[0].total, 10);
  assert.deepEqual(organization.points[1], {
    year: 2021,
    total: null,
    counts: null,
    shares: { female: null, male: null, unknown: null },
  });
});

test("age and service trends ignore organization selection, order source bands, and preserve NA", () => {
  for (const kind of ["age", "tenure"]) {
    const all = personnelCompositionTrend(compositionHistory, kind, "all");
    assert.deepEqual(
      personnelCompositionTrend(compositionHistory, kind, "A"),
      all,
    );
    assert.ok(all.series[0].key.startsWith("under"));
    assert.equal(all.series.at(-1).key, "NA");
    assert.equal(all.series.at(-1).label, "Not reported");
    assert.equal(all.series.at(-1).color, "#9ca3af");
    for (const point of all.points) {
      assert.equal(
        Object.values(point.shares).reduce((sum, share) => sum + share, 0),
        100,
      );
      assert.equal(
        Object.values(point.counts).reduce((sum, count) => sum + count, 0),
        point.total,
      );
    }
    assert.equal(all.points[1].counts.NA, 0);
  }
});

test("group trends aggregate reported staff and keep unavailable years as gaps", () => {
  const members = ["A", "B"];
  assert.equal(
    personnelTrendHeadcount(compositionHistory.years[0], members),
    100,
  );
  assert.equal(
    personnelTrendHeadcount(compositionHistory.years[1], members),
    40,
  );
  assert.equal(
    personnelTrendHeadcount(compositionHistory.years[1], ["A"]),
    null,
  );
  const history = personnelCompositionTrend(
    compositionHistory,
    "gender",
    members,
  );
  assert.deepEqual(history.points[0].counts, {
    female: 60,
    male: 30,
    unknown: 10,
  });
  assert.equal(history.points[0].shares.unknown, 10);
  assert.equal(history.points[1].total, 40);
  assert.equal(
    personnelCompositionTrend(compositionHistory, "gender", ["A"]).points[1]
      .total,
    null,
  );
});
