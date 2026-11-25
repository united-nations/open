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
  await page.evaluate(() => {
    location.hash = "regular-budget=section-13~international-trade-centre";
  });
  const sidebar = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Select year", exact: true }),
  });
  await sidebar.waitFor();
  await sidebar.getByText("CHF 109M", { exact: true }).first().waitFor();
  assert.ok(!(await sidebar.innerText()).includes("$131M"));
  await sidebar
    .getByRole("heading", {
      name: "Extrabudgetary resources (CHF)",
      exact: true,
    })
    .waitFor();
  const table = sidebar.getByRole("table", {
    name: "Funding-source trend, nominal Swiss francs",
  });
  await table.waitFor();
  assert.ok((await table.innerText()).includes("CHF 109M"));
  await sidebar.getByText("Source references", { exact: true }).click();
  assert.ok((await sidebar.innerText()).includes("Subtotal, 2"));
  await page.waitForTimeout(1800); // Finish chart animation before recording evidence.
  await sidebar.screenshot({ path: "audits/browser/itc-chf-sidebar.png" });
  await sidebar
    .getByRole("button", { name: "Close sidebar", exact: true })
    .click();
  await sidebar.waitFor({ state: "hidden" });
  // The tile, including its assistive description and summary, must retain CHF.
  const itc = page
    .getByRole("button", { name: "International Trade Centre", exact: true })
    .first();
  await itc.waitFor();
  await itc.hover();
  await page.getByText("CHF 109M", { exact: true }).last().waitFor();
  assert.equal(await page.getByText("$131M", { exact: true }).count(), 0);
  await page.screenshot({ path: "audits/browser/itc-chf-treemap.png" });
  assert.deepEqual(errors, []);
  console.log("PPB metric ranges and source-currency CHF labels verified.");
} finally {
  await browser.close();
}
