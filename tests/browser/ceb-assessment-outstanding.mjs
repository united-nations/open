import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/system/organizations/`, {
    waitUntil: "networkidle",
  });
  const chart = page.getByRole("region", {
    name: "Reported outstanding assessments",
    exact: true,
  });
  await chart.getByRole("slider").press("Home");
  await chart
    .getByRole("button", { name: "Show all 30 reported balances", exact: true })
    .click();
  const row = chart.getByRole("button", { name: /^ISA:/ });
  await row.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await row.click();
  const dialog = page.getByRole("dialog");
  const outstanding = dialog.getByRole("region", {
    name: "Outstanding assessments",
    exact: true,
  });
  await outstanding
    .getByText("Reported outstanding balance", { exact: true })
    .waitFor();
  assert.match(await outstanding.innerText(), /Unavailable/);
  assert.match(await dialog.innerText(), /Total expenditure\s+Unavailable/);
  await page.waitForTimeout(400);
  assert.ok(Math.abs((await page.evaluate(() => scrollY)) - before) < 4);
  assert.match(page.url(), /#entity=ISA%402020$/);
  assert.equal(await outstanding.locator("details").getAttribute("open"), null);

  await page.goto(`${portalUrl}/system/organizations/#entity=UNCCD%402020`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: "UNCCD", exact: true })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("region", { name: "Outstanding assessments", exact: true })
    .getByText("Reported outstanding balance", { exact: true })
    .waitFor();
  assert.match(page.url(), /#entity=UNCCD%402020$/);

  // A directory entry without any same-year financial observation remains invalid.
  await page.goto(`${portalUrl}/system/organizations/#entity=ACABQ%402020`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => location.hash === "");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Outstanding-only organization rows open existing sidebars, retain unavailable amounts and scroll position; directory-only entries remain rejected.",
  );
} finally {
  await browser.close();
}
