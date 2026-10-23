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
  const levels = page.getByRole("group", { name: "Reporting level" });
  assert.equal(await levels.locator('[style*="background-color"]').count(), 4);
  await page
    .getByRole("radio", { name: "Budget chart", exact: true })
    .locator("..")
    .click();
  assert.equal(await levels.getByRole("button").count(), 4);
  assert.equal(await levels.locator('[style*="background-color"]').count(), 0);
  assert.equal(
    await page.getByText("Grouped by region", { exact: true }).count(),
    0,
  );
  const year = await page
    .getByRole("slider")
    .first()
    .getAttribute("aria-valuenow");
  const records = JSON.parse(
    fs.readFileSync(`public/data/geographic-expenses-${year}.json`, "utf8"),
  );
  const totalBefore = await page
    .getByText("Total", { exact: true })
    .first()
    .locator("..")
    .innerText();
  const tile = (name) =>
    page
      .getByRole("button", { name, exact: true })
      .and(page.locator("[aria-describedby]"));
  const description = async (name) => {
    await tile(name).waitFor();
    const id = await tile(name).getAttribute("aria-describedby");
    return page.locator(`[id="${id}"]`).innerText();
  };
  assert.match(await description("South Sudan"), /Africa › Eastern Africa/);
  assert.match(await description("Nigeria"), /Africa › Western Africa/);
  assert.match(await description("Africa"), /Africa › Regional expenditure/);
  const search = page.getByPlaceholder("Search by country or region...");
  await page.screenshot({
    path: "audits/browser/locations-subregions.png",
    fullPage: true,
  });
  for (const name of new Set(
    records.filter((row) => row.total > 0).map((row) => row.name),
  )) {
    // Tiny records can have subpixel area in the full chart; search must
    // still expose them rather than losing them during subgrouping.
    if ((await tile(name).count()) === 0) {
      await search.fill(name);
      await tile(name).waitFor();
    }
    assert.equal(
      await tile(name).count(),
      records.filter((row) => row.total > 0 && row.name === name).length,
      name,
    );
    await search.fill("");
  }
  const global = levels.getByRole("button", { name: "Global", exact: true });
  await global.click();
  await tile("Global").waitFor({ state: "detached" });
  await page
    .getByRole("radio", { name: "Map", exact: true })
    .locator("..")
    .click();
  assert.equal(
    await levels
      .getByRole("button", { name: "Global", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  await levels.getByRole("button", { name: "Global", exact: true }).click();
  await page
    .getByRole("radio", { name: "Budget chart", exact: true })
    .locator("..")
    .click();
  assert.equal(await global.getAttribute("aria-pressed"), "true");
  assert.equal(
    await page
      .getByText("Total", { exact: true })
      .first()
      .locator("..")
      .innerText(),
    totalBefore,
  );
  await search.fill("Eastern Africa");
  await page
    .getByRole("button", { name: "Nigeria", exact: true })
    .waitFor({ state: "detached" });
  await page
    .getByRole("button", { name: "South Sudan", exact: true })
    .waitFor();
  await search.fill("");
  await page.getByRole("button", { name: "Nigeria", exact: true }).waitFor();
  await page.screenshot({
    path: "audits/browser/locations-subregions.png",
    fullPage: true,
  });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Locations: neutral chart filters, nested subregions, preserved records/totals, cross-view selection and subregion search pass",
  );
} finally {
  await browser.close();
}
