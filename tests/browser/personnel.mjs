import { createRequire } from "node:module";
import { moduleAt } from "../../src/lib/tests/moduleAt.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const manifest = JSON.parse(
  fs.readFileSync("public/data/manifest.json", "utf8"),
).personnel;
const source = (year) =>
  JSON.parse(fs.readFileSync(`public/data/personnel-${year}.json`, "utf8"));
const latest = source(manifest.default);
const previous = source(manifest.years.at(-2));
const { formatCount: number, formatPercent } = await moduleAt(
  require.resolve("@un-eosg/ui/format-budget"),
);
const browser = await chromium.launch(browserOptions);
try {
  let page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const openStaffOverview = async () => {
    await page.goto(`${portalUrl}/system/organizations/`);
    await page.locator("#workforce-trends [role=img]").waitFor();
    await page
      .getByRole("radio", { name: "Staff", exact: true })
      .locator("..")
      .click();
  };
  await openStaffOverview();
  await page.getByRole("region", { name: "Staff by organization" }).waitFor();
  assert.equal(await page.locator("h1").count(), 1);
  assert.ok(
    (await page.getByTestId("personnel-dashboard").innerText()).includes(
      number(latest.total),
    ),
  );
  const chart = page.locator("#personnel-organizations");
  assert.equal(
    await chart.getByRole("slider").count(),
    1,
    "Year is grouped in the treemap header",
  );
  assert.equal(
    await chart
      .getByRole("button", { name: "Organization for organization chart" })
      .count(),
    0,
  );
  assert.equal(
    await chart.getByRole("radio", { name: "Staff", exact: true }).count(),
    1,
  );
  assert.equal(
    await page
      .locator(
        '#entities a[href="https://unsceb.org/statistics/human-resources-statistics/"]',
      )
      .count(),
    1,
    "Intro retains the main data source",
  );
  assert.equal(
    await page
      .locator('#entities a[href="/about/#personnel-methodology"]')
      .getAttribute("href"),
    "/about/#personnel-methodology",
  );
  assert.equal(await chart.getByText("Understand the people scale").count(), 0);
  const unicefStaff = latest.organizations.find(
    (item) => item.org === "UNICEF",
  ).total;
  assert.equal(
    await chart
      .getByRole("region", { name: "Peacekeeping", exact: true })
      .count(),
    0,
  );
  const secretariat = chart.getByRole("region", {
    name: "UN Secretariat",
    exact: true,
  });
  for (const entity of ["MINUSCA", "UNAMA", "DPO"]) {
    assert.equal(
      await secretariat
        .getByRole("button", { name: entity, exact: true })
        .count(),
      1,
      `${entity} remains a direct Secretariat tile`,
    );
  }
  await chart.getByRole("button", { name: "DPO", exact: true }).click();
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes(
      "not the financial UN-DPO",
    ),
  );
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "Gender", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "DPO",
  );
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: "DPO personnel" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "DPO",
  );
  const chartSearch = chart.getByRole("searchbox", {
    name: "Search organizations and UN entities",
  });
  await chartSearch.fill(" UNICEF ");
  assert.ok((await chart.innerText()).includes(number(unicefStaff)));
  await chartSearch.fill("");
  const selectOrg = async (label, value) => {
    await page.getByRole("button", { name: label, exact: true }).press("Enter");
    await page
      .getByRole("menuitemradio", { name: value, exact: true })
      .press("Enter");
    await page.getByRole("menu").waitFor({ state: "hidden" });
  };

  await page.goto(`${portalUrl}/system/locations/`);
  const switchMeasure = (name) =>
    page
      .getByRole("group", { name: "Location measure" })
      .getByRole("radio", { name, exact: true })
      .locator("..")
      .click();
  const expenseSearch = page.getByRole("searchbox", {
    name: /Search by country or region/,
  });
  await page.getByTestId("locations-map").waitFor();
  const searchWidth = (await expenseSearch.boundingBox()).width;
  await expenseSearch.fill("Global");
  await switchMeasure("Staff");
  const geography = page.locator("#personnel-geography");
  await geography.getByTestId("personnel-map").waitFor();
  const staffSearch = geography.getByRole("searchbox", {
    name: "Search countries",
  });
  assert.ok(
    Math.abs((await staffSearch.boundingBox()).width - searchWidth) < 2,
  );
  await staffSearch.fill("USA");
  await switchMeasure("Expenditure");
  assert.equal(await expenseSearch.inputValue(), "Global");
  await switchMeasure("Staff");
  assert.equal(await staffSearch.inputValue(), "USA");
  const staffView = geography.getByRole("group", { name: "Geographic view" });
  await staffView.getByRole("radio", { name: "Chart" }).locator("..").click();
  await geography
    .getByRole("button", { name: "United States of America", exact: true })
    .waitFor();
  await staffView.getByRole("radio", { name: "List" }).locator("..").click();
  await geography
    .getByRole("button", { name: /United States of America/ })
    .waitFor();
  await staffView.getByRole("radio", { name: "Map" }).locator("..").click();
  await geography.getByTestId("personnel-map").waitFor();

  // Opening, sharing and changing years inside the panel preserve page position.
  const countrySearch = geography.getByPlaceholder("Search countries…");
  await countrySearch.fill("USA");
  await countrySearch.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await countrySearch.press("Enter");
  await page
    .getByRole("dialog", { name: "United States of America personnel" })
    .waitFor();
  assert.ok(
    Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 5,
    `Open sidebar preserves ${scroll}; actual ${await page.evaluate(() => window.scrollY)}`,
  );
  assert.ok(
    decodeURIComponent(new URL(page.url()).hash).includes(
      `duty|USA|all@${latest.year}`,
    ),
  );
  assert.equal(
    await page.getByRole("button", { name: "Copy link to clipboard" }).count(),
    1,
  );
  await page.getByRole("button", { name: "Select personnel year" }).click();
  await page
    .getByRole("button", { name: String(previous.year), exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText(`Staff at 31 December ${previous.year}`, { exact: true })
    .waitFor();
  assert.ok(
    Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 5,
    "Year changes retain background layout",
  );
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 5);

  await page.goto(
    `${portalUrl}/system/organizations/#personnel=${encodeURIComponent(`org|UNICEF|UNICEF@${previous.year}`)}`,
  );
  await page.getByRole("dialog", { name: "UNICEF personnel" }).waitFor();
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes(
      number(
        previous.organizations.find((item) => item.org === "UNICEF").total,
      ),
    ),
  );
  // Invalid same-prefix hashes must close an already-open panel as well.
  await page.evaluate((year) => {
    history.replaceState(
      null,
      "",
      `#personnel=${encodeURIComponent(`org|UNICEF|unknown-organization@${year}`)}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, previous.year);
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(new URL(page.url()).hash, "");

  // A canceled in-flight deep link must stay canceled after its data arrives.
  await page.goto(
    `${portalUrl}/system/organizations/#personnel=${encodeURIComponent(`org|UNICEF|all@${latest.year}`)}`,
  );
  await page.getByRole("dialog", { name: "UNICEF personnel" }).waitFor();
  let releaseYear;
  let interceptYear;
  const heldYear = new Promise((resolve) => {
    releaseYear = resolve;
  });
  const interceptedYear = new Promise((resolve) => {
    interceptYear = resolve;
  });
  const heldPattern = `**/data/personnel-${previous.year}.json`;
  await page.route(heldPattern, async (route) => {
    interceptYear();
    await heldYear;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(previous),
    });
  });
  await page.evaluate((year) => {
    history.replaceState(
      null,
      "",
      `#personnel=${encodeURIComponent(`org|WHO|all@${year}`)}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, previous.year);
  await interceptedYear;
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  releaseYear();
  await page
    .locator("#personnel-organizations")
    .getByText(`Staff at 31 December ${previous.year}`, { exact: true })
    .waitFor();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(new URL(page.url()).hash, "");
  await page.unroute(heldPattern);

  // Retained error content still exposes controls to recover to a known year.
  await openStaffOverview();
  await page.getByRole("region", { name: "Staff by organization" }).waitFor();
  await page.route(heldPattern, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await chart.getByRole("slider").focus();
  await page.keyboard.press("ArrowLeft");
  await page.getByTestId("personnel-dashboard").getByRole("alert").waitFor();
  assert.equal(
    await page.getByTestId("personnel-dashboard").getByRole("slider").count(),
    1,
  );
  await page.getByTestId("personnel-dashboard").getByRole("slider").focus();
  await page.keyboard.press("End");
  await page
    .locator("#personnel-organizations")
    .getByText(`Staff at 31 December ${latest.year}`, { exact: true })
    .waitFor();
  await page.unroute(heldPattern);

  // Unreported organization-years retain the selection without inventing zeros.
  await page.goto(
    `${portalUrl}/system/locations/#personnel=${encodeURIComponent(`duty|USA|UNICEF@${latest.year}`)}`,
  );
  await page
    .getByRole("dialog", { name: "United States of America personnel" })
    .waitFor();
  await page.getByRole("button", { name: "Close personnel sidebar" }).click();
  assert.equal(
    await page.getByRole("button", { name: "UNICEF", exact: true }).innerText(),
    "UNICEF",
  );
  assert.equal(
    await page.locator("#personnel-organizations, #workforce-trends").count(),
    0,
  );

  await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/system/organizations/`);
  const trends = page.getByRole("region", {
    name: "Workforce trends",
    exact: true,
  });
  await trends.getByRole("img", { name: /Annual staff counts/ }).waitFor();
  for (const view of ["Age", "Length of service"]) {
    await selectOrg("Workforce trend view", view);
    await trends.getByRole("img", { name: /System-wide/ }).waitFor();
    assert.equal(
      await trends
        .getByRole("button", { name: "All organizations", exact: true })
        .count(),
      0,
    );
  }
  await selectOrg("Workforce trend view", "Gender");
  // Sparse organization histories remain visible without filling unavailable years.
  await trends
    .getByRole("button", { name: "All organizations", exact: true })
    .click();
  const organizationPicker = page.getByRole("dialog");
  await organizationPicker.getByPlaceholder("Search...").fill("ICC");
  await organizationPicker
    .getByRole("button", { name: "ICC", exact: true })
    .click();
  await organizationPicker.waitFor({ state: "hidden" });
  await page.waitForFunction(
    () =>
      Array.from(
        document.querySelectorAll("#workforce-trends .recharts-bar-rectangle"),
      ).filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }).length === 2,
  );
  // Hiding a series preserves the original population denominator.
  const sparseTrend = page.locator("#workforce-trends");
  await sparseTrend.getByRole("button", { name: "Men", exact: true }).click();
  await sparseTrend.locator('[role="application"]').focus();
  for (let i = 0; i < manifest.years.length; i++)
    await page.keyboard.press("ArrowRight");
  const women = latest.composition
    .filter((row) => row.org === "ICC" && row.sex === "F")
    .reduce((sum, row) => sum + row.count, 0);
  const iccTotal = latest.organizations.find((row) => row.org === "ICC").total;
  const sparseTooltip = sparseTrend.locator(".recharts-tooltip-wrapper");
  await sparseTooltip.waitFor({ state: "visible" });
  assert.ok(
    (await sparseTooltip.innerText()).includes(
      formatPercent((women / iccTotal) * 100),
    ),
  );
  assert.equal((await sparseTooltip.innerText()).includes("Men"), false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
    null,
    { timeout: 3000 },
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Active keyboard tooltip remains contained after resize and blur",
  );
  await page.screenshot({
    path: "audits/browser/personnel-mobile.png",
    fullPage: true,
  });

  // A failed annual download is unavailable, and retry can recover.
  await page.route(`**/data/personnel-${latest.year}.json`, (route) =>
    route.abort(),
  );
  await openStaffOverview();
  await page
    .getByRole("alert")
    .getByText(`Personnel data could not be loaded for ${latest.year}.`, {
      exact: false,
    })
    .waitFor();
  await page.unroute(`**/data/personnel-${latest.year}.json`);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("region", { name: "Staff by organization" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Personnel browser checks passed.");
} finally {
  await browser.close();
}
