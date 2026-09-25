import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { browserOptions, portalUrl } from "./helpers.mjs";
const routes = [
  "/",
  "/system/",
  "/system/organizations/",
  "/system/contributors/",
  "/system/locations/",
  "/system/goals/",
  "/secretariat/",
  "/secretariat/programme-budget/",
  "/secretariat/programme-budget/contributors/",
  "/secretariat/peacekeeping-budget/",
  "/secretariat/peacekeeping-budget/contributors/",
  "/secretariat/field-missions/",
  "/secretariat/trust-funds/",
  "/secretariat/trust-funds/contributors/",
];
(async () => {
  const browser = await chromium.launch(browserOptions);
  const errors = [],
    results = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) =>
      errors.push({ url: page.url(), message: e.message }),
    );
    page.on("console", (m) => {
      if (m.type() === "error" && /hydrat|didn't match|#418/i.test(m.text()))
        errors.push({ url: page.url(), message: m.text() });
    });
    for (
      let repeat = 0;
      repeat < Number(process.env.HYDRATION_REPEATS || 5);
      repeat++
    ) {
      for (const route of routes) {
        const response = await page.goto(portalUrl + route, {
          waitUntil: "networkidle",
        });
        assert.ok(response.ok(), route);
        results.push({ repeat, route, status: response.status() });
      }
    }
    assert.deepEqual(errors, []);
    console.log(`${results.length} page loads passed without hydration errors`);
  } finally {
    fs.writeFileSync(
      "audits/browser/hydration.json",
      JSON.stringify({ results, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
