import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import fs from "fs";
import assert from "assert";
(async () => {
  const browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const results = [];
  const save = () =>
    fs.writeFileSync(
      "audits/browser/remediation-smoke.json",
      JSON.stringify({ results, errors }, null, 2),
    );
  const base = portalUrl;
  for (const path of [
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
  ]) {
    const response = await page.goto(base + path, { waitUntil: "networkidle" });
    results.push({
      case: path,
      status: response.status(),
      pass: response.ok(),
    });
    save();
  }
  await page.goto(base + "/system/organizations/", {
    waitUntil: "networkidle",
  });
  const fundingYear = page.getByRole("slider").first();
  await fundingYear.focus();
  await fundingYear.press("End");
  while (Number(await fundingYear.getAttribute("aria-valuenow")) > 2024)
    await fundingYear.press("ArrowLeft");
  await page.waitForTimeout(500);
  await page
    .getByRole("radio", { name: "Funding", exact: true })
    .check({ force: true });
  await page.getByRole("searchbox", { name: "Search entities" }).fill("PAHO");
  await page.waitForTimeout(500);
  results.push({
    case: "PAHO-funding",
    pass: (await page.locator("body").innerText()).includes("$1.2B"),
  });
  await page.goto(base + "/system/contributors/", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /^Source:/ })
    .first()
    .click();
  const body = await page.locator("body").innerText();
  results.push({
    case: "signed-contributor-disclosure",
    pass: body.includes("Negative amounts included in the total"),
  });
  await page.goto(base + "/secretariat/?year=2023", {
    waitUntil: "networkidle",
  });
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await slider.press("End");
  await slider.press("ArrowLeft");
  await slider.press("ArrowLeft");
  await page.waitForTimeout(500);
  await page
    .getByRole("button", { name: /^Source:/ })
    .first()
    .click();
  const text = await page.locator("body").innerText();
  results.push({
    case: "signed-secretariat-disclosure",
    pass: text.includes("Negative amounts included in the total"),
  });
  await page.goto(base + "/system/organizations/", {
    waitUntil: "networkidle",
  });
  await page.route("**/entity-spending-2023.json", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await r.continue();
  });
  const s = page.getByRole("slider").first();
  await s.focus();
  await s.press("End");
  while (Number(await s.getAttribute("aria-valuenow")) > 2024)
    await s.press("ArrowLeft");
  await s.press("ArrowLeft");
  await s.press("ArrowRight");
  await page.waitForTimeout(1300);
  const t = await page.locator("body").innerText();
  results.push({
    case: "superseded-year-response",
    pass: t.includes("2024") && t.includes("$66B"),
  });
  await page.unroute("**/entity-spending-2023.json");
  fs.writeFileSync(
    "audits/browser/remediation-smoke.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results, errors);
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
