import assert from "node:assert/strict";
import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import fs from "fs";
(async () => {
  const browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) =>
    errors.push({ url: page.url(), message: e.message }),
  );
  const results = [];
  const save = () =>
    fs.writeFileSync(
      "audits/browser/remediation-browser.json",
      JSON.stringify({ results, errors }, null, 2),
    );
  for (const [path, glob] of [
    ["/system/organizations/", "**/entity-spending-2023.json"],
    ["/system/locations/", "**/geographic-expenses-2023.json"],
  ]) {
    await page.goto(portalUrl + path, { waitUntil: "networkidle" });
    await page.route(glob, (r) =>
      r.fulfill({ status: 503, body: "unavailable" }),
    );
    const slider = page.getByRole("slider").first();
    await slider.focus();
    await slider.press("End");
    await slider.press("ArrowLeft");
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    results.push({
      path,
      case: "failed-year",
      pass: body.includes("could not be loaded for 2023"),
      text: body,
    });
    save();
    await page.unroute(glob);
  }
  for (const hash of ["COD", "BRN", "MYS"]) {
    await page.goto(
      portalUrl + "/system/locations/?year=2024#country=" + hash,
      { waitUntil: "networkidle" },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const body = await page.locator("body").innerText();
    results.push({
      case: hash,
      pass: body.includes(
        hash === "COD"
          ? "no verified reporting period"
          : "Shared workspace totals",
      ),
      text: body,
    });
    save();
  }
  await page.goto(portalUrl + "/system/organizations/", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("radio", { name: "Funding", exact: true })
    .check({ force: true });
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await slider.press("Home");
  await page.waitForTimeout(600);
  const body = await page.locator("body").innerText();
  results.push({
    case: "funding-2011",
    pass:
      body.includes("No funding data available for 2011") &&
      body.includes("Unavailable"),
    text: body,
  });
  fs.writeFileSync(
    "audits/browser/remediation-browser.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(
    results.map(({ case: c, path, pass }) => ({ case: c, path, pass })),
    errors,
  );
  await browser.close();
  assert.ok(
    results.every((r) => r.pass),
    "A browser check failed",
  );
  assert.deepEqual(errors, []);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
