import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

assert.equal(profiles.public.regularBudgetOutstanding, false);
assert.equal(profiles.preview.regularBudgetOutstanding, false);
const flags = profiles[process.env.SITE_VARIANT ?? "public"];
if (flags.programmeBudget && !flags.regularBudgetOutstanding) {
  const browser = await chromium.launch(browserOptions);
  try {
    const page = await browser.newPage();
    const requests = [],
      errors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `${portalUrl}/secretariat/programme-budget/contributors/#regular-budget-contributor=Germany`,
      { waitUntil: "networkidle" },
    );
    const sidebar = page.getByRole("dialog", { name: "Germany", exact: true });
    await sidebar.waitFor();
    await sidebar
      .getByRole("heading", { name: "Payment status history", exact: true })
      .waitFor();
    assert.equal(await page.locator("#regular-budget-outstanding").count(), 0);
    assert.equal(
      await page
        .getByRole("heading", { name: "Assessed contributions", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Outstanding contributions",
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(
      await sidebar.locator("[data-country-outstanding]").count(),
      0,
    );
    assert.doesNotMatch(
      await page.locator("body").textContent(),
      /outstanding balances|autumn debtor|debtor list|Balance \/ annual assessment/i,
    );
    await sidebar
      .getByRole("button", { name: "Select year", exact: true })
      .click();
    assert.equal(
      await page.getByRole("button", { name: "2018", exact: true }).count(),
      0,
    );
    assert.ok(
      !requests.some((url) => /regular-budget-outstanding-\d+\.json/.test(url)),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Programme-budget contributors: outstanding assessments disabled; assessment sidebar retained; no outstanding data fetched.",
    );
  } finally {
    await browser.close();
  }
}
