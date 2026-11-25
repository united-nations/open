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
  // A failed year must remain a gap at its correct position in the trend.
  await page.route("**/data/budget-ppb-expenditure-2023.json", (route) =>
    route.abort(),
  );
  await page.goto(`${portalUrl}/secretariat/programme-budget/`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("radio", { name: "Expenditure", exact: true })
    .check({ force: true });
  await page.evaluate(() => {
    location.hash =
      "regular-budget=section-1~executive-office-of-the-secretary-general";
  });
  const sidebar = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Select year", exact: true }),
  });
  await sidebar.waitFor();
  await sidebar
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2025", exact: true }).click();
  await sidebar.getByText("$34.2M", { exact: true }).first().waitFor();
  for (const amount of ["$17.6M", "$1.2M", "$34.2M"]) {
    assert.ok((await sidebar.innerText()).includes(amount));
  }
  const table = sidebar.getByRole("table", {
    name: "Funding-source trend, nominal US dollars",
  });
  await table.waitFor();
  const missing = table.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "2023", exact: true }),
  });
  await missing.getByText("Unavailable", { exact: true }).first().waitFor();
  assert.equal(
    await missing.getByText("Unavailable", { exact: true }).count(),
    4,
  );
  assert.ok(
    (await sidebar.innerText()).includes(
      "Gaps do not represent zero expenditure",
    ),
  );
  await sidebar.screenshot({ path: "audits/browser/eosg-2025-funding.png" });
  await sidebar
    .getByRole("button", { name: "Close sidebar", exact: true })
    .click();
  await sidebar.waitFor({ state: "hidden" });
  await page.evaluate(() => {
    location.hash =
      "regular-budget=section-32~section-special-purpose-allocations~bank-charges";
  });
  await sidebar.waitFor();
  await sidebar.getByText(/477/).first().waitFor();
  assert.ok((await sidebar.innerText()).match(/[-−]\$477K/));
  assert.deepEqual(errors, []);
  console.log(
    "EOSG 2025 XB, unavailable trend years, and signed bank-charge amounts verified.",
  );
} finally {
  await browser.close();
}
