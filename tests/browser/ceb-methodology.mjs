import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const methodology = JSON.parse(
  fs.readFileSync("data/ceb-methodology.json", "utf8"),
);
const browser = await chromium.launch(browserOptions);
const errors = [];
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/system/organizations/",
    "/system/contributors/",
    "/system/locations/",
    "/system/functions/",
    "/system/goals/",
    "/about/",
  ]) {
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    assert.equal(await page.locator('header a[href$="/about"]').count(), 1);
    if (route !== "/about/") {
      assert.equal(await page.locator("[data-page-methodology]").count(), 1);
      await page
        .getByRole("button", { name: "Sources and methodology", exact: true })
        .click();
      const isAfterCharts = await page.evaluate(() => {
        const notes = document.querySelector("[data-page-methodology]");
        return Array.from(document.querySelectorAll("[data-chart-hint]")).every(
          (chart) =>
            Boolean(
              chart.compareDocumentPosition(notes) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        );
      });
      assert.ok(isAfterCharts, `${route}: methodology follows charts`);
      for (const hint of await page.locator("[data-chart-hint]").all()) {
        assert.equal(
          await hint.locator("svg.lucide-mouse-pointer-click").count(),
          1,
          `${route}: click icon retained`,
        );
      }
    }
    const notes = page.getByRole("region", {
      name: "Notes published by CEB",
      exact: true,
    });
    assert.equal(await notes.locator("ol > li").count(), 7);
    for (const note of methodology.officialNotes)
      assert.ok(
        (await notes.innerText()).includes(note.text),
        `${route}: official note preserved`,
      );
    assert.ok(
      (await notes.innerText()).includes(
        "Terminology has already been made consistent",
      ),
    );
    assert.equal(
      await page
        .getByRole("group", { name: "Currency basis", exact: true })
        .count(),
      0,
    );
    if (route === "/about/") {
      assert.equal(
        await page
          .getByRole("heading", {
            name: "UN Secretariat methodology",
            exact: true,
          })
          .count(),
        1,
      );
      await page.screenshot({
        path: "audits/browser/ceb-about-desktop.png",
        fullPage: false,
      });
    }
    results.push(
      `${route}: one shared seven-note methodology; no CPI controls`,
    );
  }
  await page.goto(
    portalUrl +
      "/system/contributors/?year=2015#donor=" +
      encodeURIComponent("United Nations Development Programme"),
    { waitUntil: "networkidle" },
  );
  await page.getByRole("dialog").waitFor();
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes(
      "Source records with unresolved financing",
    ),
  );
  assert.ok((await page.getByRole("dialog").innerText()).includes("R08"));
  results.push(
    "2015 UNDP: unresolved financing preserved in an explorable source-record disclosure",
  );
  await page.goto(
    portalUrl +
      "/system/contributors/?year=2024#donor=" +
      encodeURIComponent("Private Donors / Private Sector"),
    { waitUntil: "networkidle" },
  );
  await page.getByRole("dialog").waitFor();
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes("Reported aggregate"),
  );
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes("Foundations"),
  );
  results.push(
    "2024 private reported aggregate: one identity with source categories and details",
  );
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2011", exact: true }).click();
  await page
    .getByText(
      "No data available for Private Donors / Private Sector in 2011.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await dialog
      .getByText("CEB contributor categories", { exact: true })
      .count(),
    0,
  );
  assert.equal(await dialog.locator("[data-unresolved-financing]").count(), 0);
  results.push(
    "Sidebar switching to an unavailable year does not retain earlier category amounts",
  );
  await page.goto(portalUrl + "/system/contributors/", {
    waitUntil: "networkidle",
  });
  const financingTable = page.getByRole("table", {
    name: "Revenue by financing instrument, nominal US dollars",
    exact: true,
  });
  const total2015 = financingTable
    .getByRole("row")
    .filter({
      has: page.getByRole("rowheader", { name: "2015", exact: true }),
    });
  assert.equal(await total2015.count(), 1);
  assert.ok(!(await total2015.innerText()).includes("Unavailable"));
  results.push(
    "Overall 2015 financing totals remain available despite unresolved donor attribution",
  );
  for (const route of [
    "/secretariat/",
    "/secretariat/programme-budget/",
    "/secretariat/programme-budget/contributors/",
    "/secretariat/peacekeeping-budget/",
    "/secretariat/peacekeeping-budget/contributors/",
    "/secretariat/trust-funds/",
    "/secretariat/trust-funds/contributors/",
  ]) {
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    const section = page.locator("[data-page-methodology]");
    assert.equal(
      await section.count(),
      1,
      `${route}: one page-end methodology`,
    );
    assert.equal(
      await page
        .getByRole("complementary", { name: "Data disclaimer", exact: true })
        .count(),
      1,
    );
    assert.ok(
      await page.evaluate(() =>
        Boolean(
          document
            .querySelector('[aria-label="Data disclaimer"]')
            .compareDocumentPosition(
              document.querySelector("[data-page-methodology]"),
            ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
      `${route}: extraction disclaimer precedes methodology`,
    );
    await section.locator("summary#methodology").click();
    await page.waitForTimeout(100);
    assert.equal(
      await section.locator("#secretariat-chart-source-notes").count(),
      1,
    );
    await section
      .locator("[data-chart-source-notes]")
      .first()
      .waitFor({ state: "attached" });
    assert.equal(
      await page.getByRole("button", { name: /^Source:/ }).count(),
      0,
    );
    for (const hint of await page.locator("[data-chart-hint]").all())
      assert.equal(
        await hint.locator("svg.lucide-mouse-pointer-click").count(),
        1,
      );
    results.push(
      `${route}: original page-specific notes and dynamic evidence at bottom, extraction disclaimer above, click hints retained`,
    );
  }
  await page.goto(portalUrl + "/about/", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "About fits a mobile viewport",
  );
  await page.screenshot({
    path: "audits/browser/ceb-about-mobile.png",
    fullPage: false,
  });
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/ceb-methodology.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results.join("\n"));
} finally {
  await browser.close();
}
