import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };

const variant = process.env.SITE_VARIANT ?? "public";
const flags = profiles[variant];
assert.ok(flags, "Invalid SITE_VARIANT");
// The CI static server starts immediately before this check.
for (let attempt = 0; ; attempt++) {
  try {
    const response = await fetch(portalUrl);
    assert.equal(response.status, 200);
    break;
  } catch (error) {
    if (attempt >= 29) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  const routes = {
    programmeBudget: "/secretariat/programme-budget/",
    peacekeepingBudget: "/secretariat/peacekeeping-budget/",
    trustFunds: "/secretariat/trust-funds/",
    fieldMissions: "/secretariat/field-missions/",
  };
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  for (const [feature, route] of Object.entries(routes)) {
    assert.equal(
      (await page.locator(`a[href$="${route}"]`).count()) > 0,
      flags[feature],
      route,
    );
    const response = await page.goto(portalUrl + route, {
      waitUntil: "networkidle",
    });
    assert.equal(response.status(), flags[feature] ? 200 : 404, route);
    if (feature !== "fieldMissions") {
      const child = await page.goto(portalUrl + route + "contributors/", {
        waitUntil: "networkidle",
      });
      assert.equal(
        child.status(),
        flags[feature] ? 200 : 404,
        route + "contributors/",
      );
    }
    await page.goto(portalUrl, { waitUntil: "networkidle" });
  }
  for (const [route, heading] of [
    [
      "/system/locations/?year=2024#country=HTI",
      "UNSDG Cooperation Framework financials",
    ],
    [
      "/system/goals/?year=2024#sdg=1",
      "UNSDG Cooperation Framework financials",
    ],
  ]) {
    requests.length = 0;
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    // Both deep links must open their CEB sidebar even when UNINFO is disabled.
    await page
      .getByRole("button", { name: /^Close (sidebar|modal)$/, exact: true })
      .waitFor();
    assert.equal(
      requests.some((url) => url.includes("/data/uninfo-")),
      flags.uninfo,
      route,
    );
    const uninfoHeading = page.getByRole("heading", {
      name: heading,
      exact: true,
    });
    if (flags.uninfo) await uninfoHeading.waitFor();
    assert.equal(await uninfoHeading.isVisible(), flags.uninfo, route);
  }
  assert.deepEqual(errors, []);
  console.log(`Feature browser checks passed (${variant}).`);
} finally {
  await browser.close();
}
