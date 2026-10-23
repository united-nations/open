import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
const selectYear = async (year) => {
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await slider.press("Home");
  for (let y = 2022; y < year; y++) await slider.press("ArrowRight");
};
try {
  await page.goto(portalUrl + "/secretariat/peacekeeping-budget/", {
    waitUntil: "networkidle",
  });
  assert.ok(
    await page
      .getByRole("radio", { name: "Expenditure", exact: true })
      .isChecked(),
  );
  assert.match(await page.locator("body").innerText(), /2024\/25/);
  assert.match(await page.locator("body").innerText(), /\$4.9B/);
  const map = page.locator(".pko-dot-map");
  await map.locator("svg circle").first().waitFor({ state: "attached" });
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
  const primary = await page
    .getByTestId("peacekeeping-primary-controls")
    .boundingBox();
  const secondary = await page
    .getByRole("group", { name: "Peacekeeping view", exact: true })
    .boundingBox();
  assert.ok(primary.y + primary.height <= secondary.y);
  results.push(
    "Programme Budget segmented control and two-row layout; default expenditure 2024/25",
  );

  await page.evaluate(() => {
    window.savedMap = document.querySelector(".pko-dot-map svg");
  });
  await page.route("**/budget-pko-approved-2024.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page
    .getByRole("radio", { name: "Approved", exact: true })
    .check({ force: true });
  await page.waitForTimeout(150);
  assert.match(await page.locator("body").innerText(), /\$4.9B/);
  assert.equal(
    await page.evaluate(
      () => window.savedMap === document.querySelector(".pko-dot-map svg"),
    ),
    true,
  );
  assert.doesNotMatch(await page.locator("body").innerText(), /Unavailable/);
  await page.waitForTimeout(1100);
  await page.unroute("**/budget-pko-approved-2024.json");
  results.push(
    "Delayed stage request retains the chart and correctly labelled loaded total",
  );

  for (const [metric, year, total] of [
    ["Approved", 2025, "$5B"],
    ["Proposed", 2026, "$4.4B"],
    ["Expenditure", 2024, "$4.9B"],
  ]) {
    await selectYear(year);
    await page
      .getByRole("radio", { name: metric, exact: true })
      .check({ force: true });
    await page.waitForTimeout(400);
    assert.ok((await page.locator("body").innerText()).includes(total));
    results.push(`${metric} ${year}/${year + 1}`);
  }
  await selectYear(2026);
  await page.waitForTimeout(400);
  assert.ok(
    await page
      .getByRole("radio", { name: "Expenditure", exact: true })
      .isDisabled(),
  );
  await page.evaluate(() => {
    history.pushState(null, "", "#pko-mission=MINURSO");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  const dialog = page.getByRole("dialog", { name: "MINURSO", exact: true });
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /Proposed budget/);
  await page.getByRole("button", { name: "Close mission details" }).click();
  await page.waitForTimeout(400);
  results.push("Latest proposal sidebar and unavailable stages");

  await page
    .getByRole("button", { name: "Service centres", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Budget chart", exact: true })
    .check({ force: true });
  assert.doesNotMatch(
    await page.locator("body").innerText(),
    /Loading peacekeeping|Unavailable/,
  );
  await page
    .getByRole("radio", { name: "Map", exact: true })
    .check({ force: true });
  await page
    .getByRole("button", { name: "Service centres", exact: true })
    .click();
  results.push("View and mission filters keep the chart mounted");

  // Reload to test a genuinely uncached request.
  await page.reload({ waitUntil: "networkidle" });
  await page.route("**/budget-pko-approved-2025.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await selectYear(2025);
  await page.waitForTimeout(400);
  assert.match(
    await page.locator("body").innerText(),
    /Failed to load approved budget/,
  );
  assert.match(await page.locator("body").innerText(), /Unavailable/);
  await page.unroute("**/budget-pko-approved-2025.json");
  await selectYear(2024);
  await page
    .getByRole("radio", { name: "Expenditure", exact: true })
    .check({ force: true });
  await page.waitForTimeout(400);
  assert.match(await page.locator("body").innerText(), /\$4.9B/);
  results.push("Failure disclosure and recovery");
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: "audits/browser/peacekeeping-stages.png",
    fullPage: true,
  });
  console.log(results);
} finally {
  fs.writeFileSync(
    "audits/browser/peacekeeping-stages-browser.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
