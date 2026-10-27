import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [],
    missing = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().includes("/data/"))
      missing.push(response.url());
  });
  await page.goto(portalUrl + "/system/organizations/", {
    waitUntil: "networkidle",
  });
  const flows = page.locator("#system-flows");
  const slider = flows.getByRole("slider");
  assert.equal(await slider.getAttribute("aria-valuenow"), "2025");
  await flows
    .getByRole("button", { name: "Expenditure by", exact: true })
    .click();
  await page.getByRole("menuitemradio", { name: "Goal", exact: true }).click();
  await flows
    .getByText("Goal breakdown unavailable", { exact: true })
    .first()
    .waitFor();
  await slider.press("Home");
  await page.waitForFunction(
    () =>
      document
        .querySelector("#system-flows [role=slider]")
        ?.getAttribute("aria-valuenow") === "2011",
  );
  await flows.getByText(/Government donor detail is unavailable/).waitFor();
  assert.equal(await slider.getAttribute("aria-valuemin"), "2011");
  await slider.press("ArrowLeft");
  assert.equal(await slider.getAttribute("aria-valuenow"), "2011");
  assert.match(await flows.innerText(), /Total revenue\s+\$39\.6B/);
  assert.match(await flows.innerText(), /Total expenditure\s+\$41\.5B/);
  await page.screenshot({
    path: "audits/browser/historical-flows.png",
    fullPage: true,
  });

  await page.goto(portalUrl + "/system/contributors/", {
    waitUntil: "networkidle",
  });
  const donors = page;
  await donors.getByRole("slider").press("Home");
  await donors.getByText(/Partial non-government donor records only/).waitFor();
  await donors.getByText("Partial reported total", { exact: true }).waitFor();
  await page.screenshot({
    path: "audits/browser/historical-contributors.png",
    fullPage: true,
  });

  await page.goto(portalUrl + "/system/functions/", {
    waitUntil: "networkidle",
  });
  await page.getByRole("slider").press("Home");
  await page
    .getByText(/Before 2018, CEB used a different classification/)
    .waitFor();
  await page
    .getByText("Other (legacy classification)", { exact: true })
    .first()
    .waitFor();

  await page.goto(portalUrl + "/system/organizations/?year=2011#entity=UNDP", {
    waitUntil: "networkidle",
  });
  await page.getByRole("dialog").waitFor();
  assert.doesNotMatch(
    await page.getByRole("dialog").innerText(),
    /Data could not be loaded/,
  );
  if (profiles[process.env.SITE_VARIANT ?? "public"].functionGeography) {
    await page.goto(portalUrl + "/system/locations/", {
      waitUntil: "networkidle",
    });
    const cross = page.locator("#function-geography");
    await cross.getByRole("slider").press("Home");
    await cross
      .getByText(/Function attribution is incomplete for 2010/)
      .waitFor();
    await cross
      .getByText("Function not reported", { exact: true })
      .first()
      .waitFor();
  }
  if (profiles[process.env.SITE_VARIANT ?? "public"].programmeBudget) {
    await page.goto(portalUrl + "/secretariat/programme-budget/", {
      waitUntil: "networkidle",
    });
    const year = page.getByRole("slider").first();
    await year.press("Home");
    assert.equal(await year.getAttribute("aria-valuenow"), "2018");
    await page
      .getByText(/Partial coverage:/)
      .first()
      .waitFor();
    await page
      .getByText(/not comparable/)
      .first()
      .waitFor();
    await page.screenshot({
      path: "audits/browser/historical-ppb.png",
      fullPage: true,
    });
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(errors, []);
  console.log(
    "Historical coverage: early donors, organization revenue, legacy functions, missing flow dimensions and partial geography pass.",
  );
} finally {
  await browser.close();
}
