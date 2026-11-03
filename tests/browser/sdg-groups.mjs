import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  const missing = [];
  page.on("pageerror", (error) =>
    errors.push(`${page.url()}: ${error.message}`),
  );
  page.on("response", (response) => {
    if (response.status() === 404 && response.url().includes("/data/"))
      missing.push(response.url());
  });
  const dialog = page.getByRole("dialog");
  const close = async () => {
    await dialog
      .getByRole("button", { name: "Close modal", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
  };

  await page.goto(`${portalUrl}/system/goals/#sdg=0`, {
    waitUntil: "networkidle",
  });
  await dialog.getByRole("heading", { name: "Non-SDG", exact: true }).waitFor();
  assert.match(await dialog.innerText(), /Total expenditure\s+\$10\.1B/);
  assert.equal(
    await dialog.getByText("Targets and indicators", { exact: true }).count(),
    0,
  );
  assert.equal(await dialog.getByText("0", { exact: true }).count(), 0);
  await close();

  assert.equal(
    await page
      .getByRole("button", { name: /^Open (Non-SDG|Not specified) details$/ })
      .count(),
    0,
  );
  await page.goto(`${portalUrl}/system/goals/#sdg=-1`, {
    waitUntil: "networkidle",
  });
  await dialog
    .getByRole("heading", { name: "Not specified", exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).hash, "#sdg=-1");
  assert.match(await dialog.innerText(), /Calculated balance\s+-\$63\.8M/);
  await dialog
    .getByRole("heading", { name: "Reconciliation by entity", exact: true })
    .waitFor();
  assert.match(
    await dialog
      .getByRole("button", { name: "IOM", exact: true })
      .locator("..")
      .innerText(),
    /-\$/,
  );
  assert.equal(await dialog.getByText("-1", { exact: true }).count(), 0);

  await dialog.getByText("IOM", { exact: true }).click();
  await page.waitForURL(/\/system\/organizations\/\?year=2025#entity=IOM/);
  await dialog
    .getByRole("heading", { name: "Revenue by contributor", exact: true })
    .waitFor();
  await dialog
    .getByRole("button", { name: "European Union", exact: true })
    .click();
  await page.waitForURL(
    /\/system\/contributors\/\?year=2025#donor=European%20Union/,
  );
  await dialog
    .getByRole("heading", { name: "European Union", exact: true })
    .waitFor();
  await page.goBack();
  await page.waitForURL(/\/system\/organizations\/\?year=2025#entity=IOM/);
  await dialog
    .getByRole("heading", { name: "Revenue by contributor", exact: true })
    .waitFor();
  await dialog.getByText("Not specified", { exact: true }).click();
  await page.waitForURL(/\/system\/goals\/\?year=2025#sdg=-1/);
  await dialog
    .getByRole("heading", { name: "Not specified", exact: true })
    .waitFor();

  await dialog
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2024", exact: true }).click();
  await dialog.getByText("ITU", { exact: true }).waitFor();
  assert.match(await dialog.innerText(), /Calculated balance\s+\$65M/);
  await close();

  await page.getByText("Expenditure", { exact: true }).click();
  await page.waitForTimeout(1500);
  await page
    .getByRole("button", { name: "Non-SDG", exact: true })
    .first()
    .click();
  await dialog.getByRole("heading", { name: "Non-SDG", exact: true }).waitFor();
  assert.match(await dialog.innerText(), /Total expenditure\s+\$10\.1B/);
  await close();
  await page.waitForTimeout(1500);
  const tile = page
    .getByRole("button", { name: "Non-SDG", exact: true })
    .first();
  await tile.focus();
  await tile.press("Enter");
  await dialog.getByRole("heading", { name: "Non-SDG", exact: true }).waitFor();

  await page.goto(`${portalUrl}/system/goals/?year=2018#sdg=non_sdg`, {
    waitUntil: "networkidle",
  });
  await dialog.getByRole("heading", { name: "Non-SDG", exact: true }).waitFor();
  assert.match(await dialog.innerText(), /Total expenditure\s+Unavailable/);
  assert.match(
    await dialog.innerText(),
    /No entity breakdown is available for 2018/,
  );

  await page.goto(`${portalUrl}/system/goals/?year=2024#sdg=1`, {
    waitUntil: "networkidle",
  });
  await dialog.getByText("Targets and indicators", { exact: true }).waitFor();
  assert.deepEqual(missing, []);
  assert.deepEqual(errors, []);
  console.log(
    "SDG groups: both sidebars, signed balances, entity contributor navigation, year changes, deep links and keyboard activation passed",
  );
} finally {
  await browser.close();
}
