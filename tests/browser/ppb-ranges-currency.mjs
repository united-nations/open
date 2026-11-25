import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/secretariat/programme-budget/`, {
    waitUntil: "networkidle",
  });
  const slider = page.getByRole("slider").first();
  for (const [metric, min, max] of [
    ["Expenditure", 2019, 2025],
    ["Approved", 2020, 2026],
    ["Proposed", 2021, 2027],
  ]) {
    await page
      .getByRole("radio", { name: metric, exact: true })
      .check({ force: true });
    assert.equal(Number(await slider.getAttribute("aria-valuemin")), min);
    assert.equal(Number(await slider.getAttribute("aria-valuemax")), max);
    await slider.press("Home");
    assert.equal(Number(await slider.getAttribute("aria-valuenow")), min);
    assert.equal(
      await page.getByRole("radio", { name: metric, exact: true }).isChecked(),
      true,
    );
    await slider.press("End");
    assert.equal(Number(await slider.getAttribute("aria-valuenow")), max);
  }
  await page
    .getByRole("radio", { name: "Expenditure", exact: true })
    .check({ force: true });
  assert.equal(Number(await slider.getAttribute("aria-valuenow")), 2025);
  await page
    .getByRole("group", { name: "Funding sources", exact: true })
    .getByRole("button", { name: "Extrabudgetary", exact: true })
    .click();
  await page.getByText("$8.4B", { exact: true }).first().waitFor();
  const search = page.getByPlaceholder("Search budget sections...");
  await search.fill("International Trade Centre");
  await page.getByText("$141M", { exact: true }).first().waitFor();
  await search.fill("");
  await page.getByText("$8.4B", { exact: true }).first().waitFor();
  await page.evaluate(() => {
    location.hash = "regular-budget=section-13~international-trade-centre";
  });
  const sidebar = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Select year", exact: true }),
  });
  await sidebar.waitFor();
  await sidebar.getByText("$141M", { exact: true }).first().waitFor();
  assert.ok(!(await sidebar.innerText()).includes("$131M"));
  assert.ok((await sidebar.innerText()).includes("CHF 0.7737 per USD"));
  assert.ok((await sidebar.innerText()).includes("2026"));
  const table = sidebar.getByRole("table", {
    name: "Funding-source trend, nominal US dollars",
  });
  await table.waitFor();
  const row2025 = table.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "2025", exact: true }),
  });
  assert.ok((await row2025.innerText()).includes("$141M"));
  assert.ok((await row2025.innerText()).includes("$164M"));
  assert.equal(await sidebar.getByRole("table").count(), 1);
  const xb = sidebar.getByText("$141M", { exact: true }).first();
  await xb.hover();
  await page
    .getByText(/CHF 109M ÷ 0.7737/)
    .first()
    .waitFor();
  await page
    .getByText(/2026 UN budget rate \(CHF per USD\)/)
    .first()
    .waitFor();
  await sidebar.getByText("$141M", { exact: true }).first().focus();
  await page.keyboard.press("Escape");
  await sidebar.getByText("Source references", { exact: true }).click();
  assert.ok((await sidebar.innerText()).includes("Subtotal, 2"));
  assert.ok((await sidebar.innerText()).includes("A/80/480"));
  await page.waitForTimeout(1800); // Finish chart animation before recording evidence.
  await sidebar.screenshot({ path: "audits/browser/itc-chf-sidebar.png" });
  await sidebar
    .getByRole("button", { name: "Close sidebar", exact: true })
    .click();
  await sidebar.waitFor({ state: "hidden" });
  // The tile and sums use USD; the tooltip preserves the original CHF evidence.
  const itc = page
    .getByRole("button", { name: "International Trade Centre", exact: true })
    .first();
  await itc.waitFor();
  await itc.hover();
  await page.getByText("$164M", { exact: true }).last().waitFor();
  await page
    .getByText(/CHF 109M ÷ 0.7737/)
    .last()
    .waitFor();
  assert.equal(await page.getByText("$131M", { exact: true }).count(), 0);
  await page.screenshot({ path: "audits/browser/itc-chf-treemap.png" });
  await page
    .getByRole("radio", { name: "Entities", exact: true })
    .check({ force: true });
  await page.getByText("$8.4B", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "ITC", exact: true }).first().hover();
  await page
    .getByText(/CHF 109M ÷ 0.7737/)
    .last()
    .waitFor();
  await page.mouse.move(0, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("$8.4B", { exact: true }).first().waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Converted totals and controls must fit the mobile viewport",
  );
  await page.screenshot({ path: "audits/browser/itc-usd-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PPB metric ranges, consistent USD equivalents, CHF evidence and budget-rate citations verified.",
  );
} finally {
  await browser.close();
}
