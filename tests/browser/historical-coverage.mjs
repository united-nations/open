import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };
import manifest from "../../public/data/manifest.json" with { type: "json" };

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
  await flows.scrollIntoViewIfNeeded();
  const slider = flows.getByRole("slider");
  assert.equal(await slider.getAttribute("aria-valuenow"), "2025");
  await flows
    .getByRole("button", { name: "Expenditure by", exact: true })
    .click();
  await page.getByRole("menuitemradio", { name: "Goal", exact: true }).click();
  if (!manifest.sdgExpenses.years.includes(manifest.entitySpending.default)) {
    await flows
      .getByText("Goal breakdown unavailable", { exact: true })
      .first()
      .waitFor();
  }
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
  assert.equal(
    await donors.getByText(/Government donor detail is unavailable/).count(),
    0,
  );
  assert.equal(
    await donors.locator("[data-methodology-link]").getAttribute("href"),
    "/about/#ceb-methodology",
  );
  const about = await browser.newPage();
  await about.goto(portalUrl + "/about/#ceb-methodology", {
    waitUntil: "networkidle",
  });
  await about.locator("[data-ceb-methodology]").waitFor();
  await about.close();
  assert.equal(
    await donors.getByRole("slider").getAttribute("aria-valuenow"),
    "2011",
  );
  assert.equal(
    await donors.getByRole("slider").getAttribute("aria-valuemin"),
    "2011",
  );
  await donors.getByRole("slider").press("ArrowLeft");
  assert.equal(
    await donors.getByRole("slider").getAttribute("aria-valuenow"),
    "2011",
  );
  const contributorTrends = await page.evaluate(async () =>
    (await fetch("/data/contributor-trends.json")).json(),
  );
  assert.equal(contributorTrends.meta.years[0], 2011);
  for (const rows of Object.values({
    ...contributorTrends.aggregates,
    ...contributorTrends.contributors,
  }))
    assert.ok(rows.every((row) => row.year >= 2011));
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
    .getByText("Other (combined Normative and Technical Cooperation)", {
      exact: true,
    })
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
  {
    await page.goto(portalUrl + "/system/locations/", {
      waitUntil: "networkidle",
    });
    const cross = page.locator("#function-geography");
    await cross.getByRole("slider").press("Home");
    await cross
      .getByRole("heading", {
        name: "Function not reported",
        exact: true,
      })
      .waitFor();
  }
  if (profiles[process.env.SITE_VARIANT ?? "public"].programmeBudget) {
    await page.goto(portalUrl + "/secretariat/programme-budget/", {
      waitUntil: "networkidle",
    });
    const year = page.getByRole("slider").first();
    await year.press("Home");
    assert.equal(
      await year.getAttribute("aria-valuenow"),
      String(manifest.budgetPpb.min),
    );
    const firstYear = await page.evaluate(
      async (value) =>
        (await fetch(`/data/budget-ppb-expenditure-${value}.json`)).json(),
      manifest.budgetPpb.min,
    );
    if (firstYear.meta.partial) {
      await page
        .getByText(/Partial coverage:/)
        .first()
        .waitFor();
      await page
        .getByText(/not comparable/)
        .first()
        .waitFor();
    }
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
