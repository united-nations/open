import assert from "node:assert/strict";
import { test } from "node:test";
import { moduleAt } from "./moduleAt.mjs";

const {
  getDisplayName,
  contributorCategoryViews,
  getTotalContributions,
  contributorOriginLabel,
  contributorFinancingPoint,
} = await moduleAt("src/lib/contributors.ts");

test("contributor displays preserve meaningful parentheses and unfamiliar markers", () => {
  for (const name of [
    "Falkland Islands (Malvinas)",
    "Saint Martin (French part)",
    "Sint Maarten (Dutch part)",
    "Global Environment Facility (thru UNDP or UNEP)",
    "University (College) of the West Indies",
    "UNDP (as donor)",
    "Taiwan Province of China",
    "Unrecognized contributor*",
  ]) {
    assert.equal(getDisplayName(name), name);
  }
});

test("financing trends distinguish complete totals, incomplete detail and missing observations", () => {
  const control = {
    year: 2015,
    assessed: 10,
    voluntary_unearmarked: 20,
    voluntary_earmarked: 30,
    other: -2,
    financingIncomplete: false,
    attributionIncomplete: true,
  };
  assert.equal(contributorFinancingPoint(control).Other, -2);
  assert.equal(contributorFinancingPoint(control).Assessed, 10);
  const missing = contributorFinancingPoint({ ...control, available: false });
  assert.equal(missing.year, "2015");
  assert.ok(
    Object.entries(missing)
      .filter(([key]) => key !== "year")
      .every(([, value]) => value === null),
  );
  assert.equal(
    contributorFinancingPoint({ ...control, financingIncomplete: true })
      .Assessed,
    null,
  );
  assert.equal(
    contributorFinancingPoint({ ...control, assessed: 0 }).Assessed,
    0,
  );
});

test("one contributor retains its source categories without duplicating amounts", () => {
  const donor = {
    name: "UN OCHA",
    category: "Multiple categories",
    status: "organization",
    contributions: { A: { Other: 30 } },
    categoryContributions: {
      "Multilateral - UN organizations excluding pooled funds": {
        A: { Other: 10 },
      },
      "Multilateral - UN Inter-agency pooled funds": { A: { Other: 20 } },
    },
    record_kind: "reported_named",
  };
  const views = contributorCategoryViews(donor);
  assert.equal(views.length, 2);
  assert.ok(views.every((view) => view.name === "UN OCHA"));
  assert.equal(
    views.reduce(
      (total, view) => total + getTotalContributions(view.contributions),
      0,
    ),
    30,
  );
  assert.equal(
    contributorOriginLabel("reported_aggregate"),
    "Reported aggregate",
  );
  assert.equal(
    contributorOriginLabel("calculated_balance"),
    "Calculated balance",
  );
});
