import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/system/locations/`, {
    waitUntil: "networkidle",
  });
  const map = page.getByTestId("locations-map");
  await map.scrollIntoViewIfNeeded();
  const year = await page
    .getByRole("slider")
    .first()
    .getAttribute("aria-valuenow");
  const records = JSON.parse(
    fs.readFileSync(`public/data/geographic-expenses-${year}.json`, "utf8"),
  );
  const levels = page.getByRole("group", { name: "Reporting level" });
  const search = page.getByPlaceholder("Search by country or region...");
  const snapshot = () =>
    map
      .locator("svg circle")
      .evaluateAll((circles) =>
        Object.fromEntries(
          circles.map((circle) => [
            circle.parentElement.getAttribute("transform"),
            Number(circle.getAttribute("r")),
          ]),
        ),
      );
  await page.waitForTimeout(700);
  assert.equal(
    await map
      .locator('svg path[style*="fill"]')
      .first()
      .evaluate((path) => getComputedStyle(path).fill),
    "rgb(243, 244, 246)",
  );
  assert.equal(
    await map
      .locator("svg circle")
      .first()
      .evaluate((circle) => getComputedStyle(circle).fillOpacity),
    "0.28",
  );
  const before = await snapshot();
  assert.ok(Object.keys(before).length > 100);
  await levels.getByRole("button", { name: "Global", exact: true }).click();
  await page.waitForTimeout(700);
  const withoutGlobal = await snapshot();
  assert.ok(Object.keys(withoutGlobal).length < Object.keys(before).length);
  for (const [position, radius] of Object.entries(withoutGlobal)) {
    assert.ok(
      Math.abs(radius - before[position]) < 0.001,
      "Hiding Global resized another circle",
    );
  }
  await levels.getByRole("button", { name: "Global", exact: true }).click();
  await search.fill("South Sudan");
  const southSudan = records.find((row) => row.iso3 === "SSD");
  const allRadius = 12 * Math.sqrt(southSudan.total / 1_000_000_000);
  const expectRadius = async (expected) => {
    await page.waitForFunction((radius) => {
      const circles = document.querySelectorAll(
        '[data-testid="locations-map"] svg circle',
      );
      return (
        circles.length === 1 &&
        Math.abs(Number(circles[0].getAttribute("r")) - radius) < 0.001
      );
    }, expected);
  };
  await expectRadius(allRadius);
  await page.getByRole("button", { name: "All entities", exact: true }).click();
  await page.getByPlaceholder("Search...", { exact: true }).fill("UNICEF");
  await page.getByText("UNICEF", { exact: true }).click();
  const allTotal = records.reduce(
    (sum, row) => sum + Math.max(0, row.total),
    0,
  );
  const entityTotal = records.reduce(
    (sum, row) => sum + Math.max(0, row.entities.UNICEF ?? 0),
    0,
  );
  const reference = (1_000_000_000 * entityTotal) / allTotal;
  const entityRadius = 12 * Math.sqrt(southSudan.entities.UNICEF / reference);
  const unadjustedRadius =
    12 * Math.sqrt(southSudan.entities.UNICEF / 1_000_000_000);
  assert.ok(
    entityRadius > unadjustedRadius,
    "Entity selection did not enlarge the scale",
  );
  await expectRadius(entityRadius);
  await levels.getByRole("button", { name: "Global", exact: true }).click();
  await expectRadius(entityRadius);
  await search.fill("");
  await page.waitForTimeout(700);
  const entityAll = await snapshot();
  await search.fill("South Sudan");
  await expectRadius(entityRadius);
  const entitySingle = await snapshot();
  for (const [position, radius] of Object.entries(entitySingle)) {
    assert.ok(
      Math.abs(radius - entityAll[position]) < 0.001,
      "Search resized an entity circle",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Locations bubbles: Global toggle/search preserve sizes; entity selection enlarges its scale; area follows expenditure",
  );
} finally {
  await browser.close();
}
