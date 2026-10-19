import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(`${page.url()}: ${error.message}`),
  );
  await page.goto(portalUrl + "/", { waitUntil: "networkidle" });
  assert.ok(await page.locator('a[href$="/system/functions/"]').count());
  await page.goto(portalUrl + "/system/functions/", {
    waitUntil: "networkidle",
  });
  const nav = page.getByRole("navigation", { name: "UN System financials" });
  assert.deepEqual(await nav.getByRole("link").allTextContents(), [
    "Organizations",
    "Contributors",
    "Locations",
    "Functions",
    "Goals",
  ]);
  await page
    .getByRole("heading", {
      name: "Which functions do funds support?",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("heading", {
      name: "Expenditure by function over time",
      exact: true,
    })
    .waitFor();
  const slider = page.getByRole("slider");
  assert.equal(await slider.count(), 1);
  const originalYear = Number(await slider.getAttribute("aria-valuenow"));
  await slider.press("ArrowLeft");
  assert.equal(
    Number(await slider.getAttribute("aria-valuenow")),
    originalYear - 1,
  );
  await page.screenshot({
    path: "audits/browser/system-functions.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(
    portalUrl + "/system/functions/?year=2023#function=development",
    { waitUntil: "networkidle" },
  );
  await page
    .getByRole("dialog", { name: "Development assistance", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Close function details", exact: true })
    .click();
  await page.goto(portalUrl + "/system/goals/?year=2023#function=development", {
    waitUntil: "networkidle",
  });
  await page.waitForURL(
    /\/system\/functions\/\?year=2023#function=development$/,
  );
  await page
    .getByRole("dialog", { name: "Development assistance", exact: true })
    .waitFor();

  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(portalUrl + "/system/goals/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^SDG 1:/ }).waitFor();
  assert.equal(
    await page.getByRole("group", { name: "Goals view", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("heading", {
        name: "Expenditure by function over time",
        exact: true,
      })
      .count(),
    0,
  );
  assert.ok(
    !requests.some((url) => url.endsWith("/data/function-expenses.json")),
  );
  assert.ok(
    (await page.locator("body").innerText()).includes(
      "Annual snapshots are not directly comparable",
    ),
  );
  await page.screenshot({
    path: "audits/browser/system-goals-treemap.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /^SDG 1:/ }).click();
  await page
    .getByRole("button", { name: "Close modal", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Functions and Goals: tab order, separate charts, annual selection, current/legacy deep links, and SDG sidebar passed.",
  );
} finally {
  await browser.close();
}
