import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };
const flags = profiles[process.env.SITE_VARIANT ?? "public"];
const enabled = (route) =>
  Object.entries(profiles.routes).every(
    ([parent, feature]) => !route.startsWith(parent) || flags[feature],
  );

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
    assert.equal(await page.locator("[data-page-methodology]").count(), 0);
    if (route !== "/about/") {
      const link = page.locator("[data-methodology-link]");
      assert.equal(await link.count(), 1);
      assert.equal(await link.getAttribute("href"), "/about/#ceb-methodology");
      assert.equal(await page.locator("[data-ceb-methodology]").count(), 0);
      assert.equal(
        await page
          .getByRole("region", { name: "Notes published by CEB", exact: true })
          .count(),
        0,
      );
      if (route !== "/")
        assert.ok(
          (await page
            .locator(
              'a[href="https://unsceb.org/statistics/financial-statistics/"]',
            )
            .count()) > 0,
          "intro source retained",
        );
      const isAfterCharts = await page.evaluate(() => {
        const notes = document.querySelector("[data-page-references]");
        return Array.from(document.querySelectorAll("[data-chart-hint]")).every(
          (chart) =>
            Boolean(
              chart.compareDocumentPosition(notes) &
              Node.DOCUMENT_POSITION_FOLLOWING,
            ),
        );
      });
      assert.ok(isAfterCharts, route + ": references follow charts");
      for (const hint of await page.locator("[data-chart-hint]").all()) {
        assert.equal(
          await hint.locator("svg.lucide-mouse-pointer-click").count(),
          1,
        );
      }
      if (route === "/system/contributors/") {
        await link.click();
        await page.waitForURL("**/about/#ceb-methodology");
        await page.locator("[data-ceb-methodology]").waitFor();
      }
    } else {
      const sourceNotes = page.getByRole("button", {
        name: "Notes published by CEB",
        exact: true,
      });
      assert.equal(await sourceNotes.getAttribute("aria-expanded"), "false");
      await sourceNotes.click();
      const notes = page.getByRole("region", {
        name: "Notes published by CEB",
        exact: true,
      });
      assert.equal(await notes.locator("ol > li").count(), 7);
      for (const note of methodology.officialNotes)
        assert.ok((await notes.innerText()).includes(note.text));
      assert.ok(
        (await notes.innerText()).includes(
          "Terminology has already been made consistent",
        ),
      );
      assert.equal(
        await page
          .getByRole("heading", { name: "Field Missions", exact: true })
          .count(),
        flags.fieldMissions ? 1 : 0,
      );
      assert.equal(
        await page.locator("#uninfo-methodology").count(),
        flags.uninfo ? 1 : 0,
      );
      // About never points readers at feature-pruned data routes.
      for (const link of await page.locator('a[href^="/secretariat"]').all())
        assert.ok(enabled(await link.getAttribute("href")));
      await page.screenshot({
        path: "audits/browser/ceb-about-desktop.png",
        fullPage: false,
      });
    }
    assert.equal(
      await page
        .getByRole("group", { name: "Currency basis", exact: true })
        .count(),
      0,
    );
    results.push(
      route +
        ": centralized methodology, source links and chart hints retained",
    );
  }
  await page.goto(
    portalUrl +
      "/system/contributors/?year=2015#donor=" +
      encodeURIComponent("United Nations Development Programme"),
    { waitUntil: "networkidle" },
  );
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.locator("[data-unresolved-financing]").count(), 0);
  await page
    .getByRole("dialog")
    .getByText("Other financing instruments", { exact: true })
    .first()
    .waitFor();
  assert.doesNotMatch(
    await page.getByRole("dialog").innerText(),
    /Source records with unresolved financing/,
  );
  results.push(
    "2015 UNDP: fifth financing category integrated into sidebar without a source-record table",
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
  const total2015 = financingTable.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "2015", exact: true }),
  });
  assert.equal(await total2015.count(), 1);
  assert.ok(!(await total2015.innerText()).includes("Unavailable"));
  assert.doesNotMatch(
    await financingTable.innerText(),
    /Other financing instruments/,
  );
  assert.equal(await page.locator("[data-unresolved-financing]").count(), 0);
  assert.equal(
    await page
      .locator("[data-chart-hint]")
      .getByText(/Negative amounts included/)
      .count(),
    0,
  );
  results.push(
    "Overall 2015 financing totals remain available despite unresolved donor attribution",
  );
  for (const [route, anchor] of [
    ["/secretariat/", "overview"],
    ["/secretariat/programme-budget/", "programme-budget"],
    [
      "/secretariat/programme-budget/contributors/",
      "programme-budget-contributors",
    ],
    ["/secretariat/peacekeeping-budget/", "peacekeeping-budget"],
    [
      "/secretariat/peacekeeping-budget/contributors/",
      "peacekeeping-contributors",
    ],
    ["/secretariat/trust-funds/", "trust-funds"],
    ["/secretariat/trust-funds/contributors/", "trust-fund-contributors"],
  ]) {
    if (!enabled(route)) continue;
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    const section = page.locator("[data-page-references]");
    assert.equal(await section.count(), 1);
    assert.equal(
      await page.locator("[data-secretariat-methodology]").count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("complementary", { name: "Data disclaimer", exact: true })
        .count(),
      0,
    );
    const link = section.locator("[data-methodology-link]");
    assert.equal(
      await link.getAttribute("href"),
      "/about/#secretariat-" + anchor,
    );
    assert.equal(await page.locator("[data-chart-source-notes]").count(), 0);
    assert.equal(
      await page.getByText("Data for selected year", { exact: true }).count(),
      0,
    );
    if (route === "/secretariat/trust-funds/") {
      const funds = page.locator(
        'details[aria-label="Funds with zero or negative expenditure"]',
      );
      if (await funds.count()) {
        assert.equal(
          await funds.evaluate((node) =>
            Boolean(node.parentElement.closest("details")),
          ),
          false,
        );
        await funds.locator(":scope > summary").click();
        await funds.getByRole("button").first().click();
        await page.getByRole("dialog").waitFor();
        await page
          .getByRole("button", { name: "Close fund details", exact: true })
          .click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      }
    }
    for (const hint of await page.locator("[data-chart-hint]").all())
      assert.equal(
        await hint.locator("svg.lucide-mouse-pointer-click").count(),
        1,
      );
    await link.click();
    await page.waitForURL("**/about/#secretariat-" + anchor);
    const target = page.locator('[id="secretariat-' + anchor + '"]');
    await page.waitForFunction(
      (id) =>
        document.getElementById(id)?.getAttribute("aria-expanded") === "true",
      "secretariat-" + anchor,
    );
    assert.equal(await target.getAttribute("aria-expanded"), "true");
    await page
      .locator('[data-secretariat-methodology="' + anchor + '"]')
      .waitFor();
    results.push(
      route + ": clean footer; methodology link opens matching About section",
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
