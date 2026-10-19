import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moduleAt } from "./moduleAt.mjs";
const { functionGeographyColumns } = await moduleAt(
  "src/lib/functionGeography.ts",
);
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, `${a} != ${b}`);

test("reported cells conserve money and both dimensions of mosaic area", () => {
  for (let year = 2020; year <= 2025; year++) {
    const data = JSON.parse(
      fs.readFileSync(`public/data/function-geography-${year}.json`),
    );
    const columns = functionGeographyColumns(data);
    near(
      columns.reduce((sum, column) => sum + column.width, 0),
      1,
    );
    near(
      columns.reduce((sum, column) => sum + column.total, 0),
      data.total,
    );
    for (const column of columns) {
      near(column.width, column.total / data.total);
      near(
        column.cells.reduce((sum, cell) => sum + cell.height, 0),
        1,
      );
      for (const cell of column.cells) {
        near(cell.height, cell.amount / column.total);
        near(column.width * cell.height, cell.amount / data.total);
        assert.ok(cell.top >= 0 && cell.top + cell.height <= 1.000001);
      }
    }
    assert.deepEqual(
      columns.map((column) => column.total),
      columns.map((column) => column.total).sort((a, b) => b - a),
    );
  }
});

test("negative cells and zero totals remain explicit without invalid areas", () => {
  const make = (amounts) => ({
    total: amounts.reduce((a, b) => a + b, 0),
    functions: [
      {
        key: "development",
        total: amounts.reduce((a, b) => a + b, 0),
        geography: ["global", "regional", "country"].map((level, i) => ({
          level,
          amount: amounts[i],
          negativeAdjustments: Math.min(0, amounts[i]),
        })),
      },
    ],
  });
  const [column] = functionGeographyColumns(make([-20, 0, 100]));
  assert.equal(column.cells[0].amount, -20);
  assert.equal(column.cells[0].height, 0);
  assert.equal(column.cells[2].height, 1);
  assert.equal(column.cells[2].share, 1.25);
  const [zero] = functionGeographyColumns(make([0, 0, 0]));
  assert.equal(zero.width, 0);
  assert.equal(zero.share, null);
  assert.ok(
    zero.cells.every((cell) => cell.height === 0 && cell.share === null),
  );
});
