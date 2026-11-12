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
  assert.match(await page.locator("body").innerText(), /\$5.4B/);
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

  const supportMarker = page.getByRole("button", {
    name: "Support account",
    exact: true,
  });
  assert.equal(
    await supportMarker.locator("circle").evaluate((circle) => {
      const style = getComputedStyle(circle);
      return `${style.fillOpacity} ${style.strokeWidth}`;
    }),
    "0.28 1.5px",
  );
  await supportMarker.click();
  const supportDetails = page.getByRole("dialog", {
    name: "Peacekeeping support account",
  });
  await supportDetails.waitFor();
  assert.match(await supportDetails.innerText(), /Post resources/);
  assert.match(await supportDetails.innerText(), /Corporate costs/);
  assert.ok(
    await supportDetails
      .getByRole("link", { name: /A\/80\/631, PDF page 4/ })
      .count(),
  );
  await supportDetails
    .getByRole("button", { name: "Close account details" })
    .click();
  await page
    .getByRole("button", { name: "Peacekeeping support account", exact: true })
    .click();
  await supportMarker.waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Peacekeeping support account", exact: true })
    .click();
  await supportMarker.waitFor();
  results.push(
    "Support account map marker, official citation, and category filter",
  );

  const view = page.getByRole("group", { name: "Peacekeeping view" });
  assert.deepEqual(await view.locator("label").allTextContents(), [
    "Chart",
    "Map",
    "List",
  ]);
  await view.getByRole("radio", { name: "List" }).locator("..").click();
  await page
    .getByText("Liquidation of the closed mission during 2024/25.", {
      exact: true,
    })
    .click();
  const liquidation = page.getByRole("dialog", {
    name: /Stabilization Mission in Mali/,
  });
  await liquidation.waitFor();
  assert.match(await liquidation.innerText(), /\$164\.8M/);
  assert.ok(
    await liquidation
      .getByRole("link", { name: /A\/80\/590, PDF page 3/ })
      .count(),
  );
  await liquidation
    .getByRole("button", { name: "Close account details" })
    .click();
  await view.getByRole("radio", { name: "Map" }).locator("..").click();
  results.push(
    "MINUSMA liquidation list row, amount, and performance citation",
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
  assert.match(await page.locator("body").innerText(), /\$5.4B/);
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
    ["Approved", 2025, "$5.7B"],
    ["Approved", 2026, "$5.1B"],
    ["Proposed", 2026, "$5.2B"],
    ["Expenditure", 2024, "$5.4B"],
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
  await page
    .getByRole("radio", { name: "Proposed", exact: true })
    .check({ force: true });
  await supportMarker.click();
  await supportDetails.getByText("$383.4M", { exact: true }).first().waitFor();
  await supportDetails
    .getByRole("button", { name: "Close account details" })
    .click();
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
  await view.getByRole("radio", { name: "List" }).locator("..").click();
  const missions = page.getByRole("group", {
    name: "Peacekeeping budget accounts",
  });
  await missions.getByRole("listitem").first().waitFor();
  await view.getByRole("radio", { name: "Chart" }).locator("..").click();
  await page
    .locator(
      "main [style*='--grouped-treemap-height'] button[aria-describedby]",
    )
    .first()
    .waitFor();
  assert.doesNotMatch(
    await page.locator("body").innerText(),
    /Loading peacekeeping|Unavailable/,
  );
  await view.getByRole("radio", { name: "Map" }).locator("..").click();
  await page
    .getByRole("button", { name: "Service centres", exact: true })
    .click();
  results.push("List, chart, and map honor the active mission filters");

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
  assert.match(await page.locator("body").innerText(), /\$5.4B/);
  results.push("Failure disclosure and recovery");
  await page.setViewportSize({ width: 390, height: 844 });
  await supportMarker.waitFor();
  const mapBounds = await map.boundingBox();
  const markerBounds = await supportMarker.boundingBox();
  assert.ok(markerBounds.x >= mapBounds.x);
  assert.ok(
    markerBounds.x + markerBounds.width <= mapBounds.x + mapBounds.width,
  );
  assert.ok(
    markerBounds.y + markerBounds.height <= mapBounds.y + mapBounds.height,
  );
  await supportMarker.press("Enter");
  await supportDetails.waitFor();
  await supportDetails
    .getByRole("button", { name: "Close account details" })
    .click();
  results.push(
    "Support account marker fits mobile and opens with the keyboard",
  );

  await page.goto(
    `${portalUrl}/secretariat/peacekeeping-budget/#pko-mission=MINUSMA%7Cexpenditure%7C2022`,
  );
  const minusmaTrend = page
    .getByRole("dialog", { name: "MINUSMA", exact: true })
    .getByRole("table", { name: /Expenditure by budget group/ });
  await minusmaTrend.waitFor({ state: "attached" });
  for (const [fiscalYear, total] of [
    ["2023/24", "$833.8M"],
    ["2024/25", "$164.8M"],
  ]) {
    const row = minusmaTrend.getByRole("row").filter({ hasText: fiscalYear });
    assert.ok((await row.textContent()).includes(total));
  }
  results.push(
    "MINUSMA trend includes the sourced drawdown and liquidation years",
  );

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(
    `${portalUrl}/secretariat/peacekeeping-budget/#pko-mission=UNSOH%7Capproved%7C2025`,
  );
  const haiti = page.getByRole("dialog", {
    name: "United Nations Support Office in Haiti",
  });
  await haiti.getByText("$269.4M", { exact: true }).waitFor();
  await haiti.getByRole("button", { name: "Copy link to clipboard" }).click();
  await haiti.getByRole("status").filter({ hasText: "Link copied!" }).waitFor();
  const sharedLink = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(
    new URL(sharedLink).hash,
    "#pko-mission=UNSOH%7Capproved%7C2025",
  );
  const recipient = await browser.newPage();
  await recipient.goto(sharedLink);
  await recipient
    .getByRole("dialog", { name: "United Nations Support Office in Haiti" })
    .getByText("$269.4M", { exact: true })
    .waitFor();
  await recipient.close();
  results.push(
    "Shared Haiti account links restore the approved stage and fiscal year",
  );
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
