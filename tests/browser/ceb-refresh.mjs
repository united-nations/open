import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  const missing = [];
  const results = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 404 && /\/data\/.*\.json/.test(response.url()))
      missing.push(response.url());
  });
  for (const route of ["organizations", "contributors", "locations"]) {
    await page.goto(`${portalUrl}/system/${route}/`, {
      waitUntil: "networkidle",
    });
    const slider = page.getByRole("slider").first();
    assert.equal(await slider.getAttribute("aria-valuenow"), "2025");
    results.push(`${route}: defaults to 2025`);
  }
  await page.goto(`${portalUrl}/system/organizations/#entity=UNICEF`, {
    waitUntil: "networkidle",
  });
  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor();
  await page.waitForTimeout(300);
  assert.match(
    await dialog.innerText(),
    /SDG spending breakdown unavailable for 2025/,
  );
  results.push(
    "2025 entity: SDGs unavailable without requesting nonexistent file",
  );
  await page.goto(`${portalUrl}/system/organizations/#entity=ITC`, {
    waitUntil: "networkidle",
  });
  await dialog.waitFor();
  await page.waitForTimeout(300);
  assert.match(await dialog.innerText(), /did not submit data for 2025/);
  assert.match(await dialog.innerText(), /Total spending\s+Unavailable/);
  results.push("ITC: non-reporting disclosed as unavailable");
  await page.goto(`${portalUrl}/system/goals/`, { waitUntil: "networkidle" });
  assert.equal(
    await page.getByRole("slider").first().getAttribute("aria-valuenow"),
    "2024",
  );
  results.push("Goals: retains 2024 latest available actuals");
  await page.goto(`${portalUrl}/system/locations/#country=HTI`, {
    waitUntil: "networkidle",
  });
  await dialog.waitFor();
  await page.waitForTimeout(300);
  assert.match(await dialog.innerText(), /Data only available for 2024/);
  results.push("2025 country: independent UNINFO period preserved");
  assert.deepEqual(missing, []);
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/ceb-refresh.json",
    JSON.stringify({ results, errors, missing }, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
