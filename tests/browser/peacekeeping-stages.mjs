import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
(async () => {
  const browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const results = [];
  const base = process.env.PORTAL_URL || portalUrl;
  await page.goto(base + "/secretariat/peacekeeping-budget/", {
    waitUntil: "networkidle",
  });
  const stage = page.getByRole("combobox", {
    name: "Peacekeeping budget stage",
  });
  await assert.equal(await stage.inputValue(), "expenditure");
  assert.match(await page.locator("body").innerText(), /2024\/25/);
  assert.match(await page.locator("body").innerText(), /\$4.9B/);
  results.push("Default expenditure 2024/25");
  for (const [metric, year, total] of [
    ["approved", 2025, "$5B"],
    ["proposed", 2026, "$4.4B"],
    ["expenditure", 2024, "$4.9B"],
  ]) {
    await stage.selectOption(metric);
    const slider = page.getByRole("slider").first();
    await slider.focus();
    await slider.press("End");
    await page.waitForTimeout(300);
    const body = await page.locator("body").innerText();
    assert.ok(body.includes(total), body.slice(0, 1800));
    if (metric === "proposed") {
      assert.match(body, /Mission detail is unavailable for UNSOH/);
      assert.match(body, /2026\/27/);
    }
    results.push(`${metric} latest ${year}/${year + 1}`);
  }
  await stage.selectOption("proposed");
  await page.getByRole("slider").first().press("End");
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    history.pushState(null, "", "#pko-mission=MINURSO");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  const dialog = page.getByRole("dialog", { name: "MINURSO", exact: true });
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /Proposed budget/);
  assert.doesNotMatch(await dialog.innerText(), /Total expenditure/);
  results.push("Proposed mission sidebar and trend");
  await page.getByRole("button", { name: "Close mission details" }).click();
  await page.waitForTimeout(400);
  await page.route("**/budget-pko-approved-2025.json", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await stage.selectOption("approved");
  await page.waitForTimeout(400);
  assert.match(await page.locator("body").innerText(), /Unavailable/);
  assert.match(
    await page.locator("body").innerText(),
    /Failed to load approved budget/,
  );
  results.push("Failed stage request does not display previous proposal");
  await page.unroute("**/budget-pko-approved-2025.json");
  await stage.selectOption("expenditure");
  await page.waitForTimeout(400);
  assert.match(await page.locator("body").innerText(), /\$4.9B/);
  results.push("Recovery after failure");
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/peacekeeping-stages-browser.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  await page.screenshot({
    path: "audits/browser/peacekeeping-stages.png",
    fullPage: true,
  });
  console.log(results);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
