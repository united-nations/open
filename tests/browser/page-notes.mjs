import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };
import manifest from "../../public/data/manifest.json" with { type: "json" };
const flags = profiles[process.env.SITE_VARIANT ?? "public"];
const read = (filename) =>
  JSON.parse(fs.readFileSync(`public/data/${filename}.json`, "utf8"));
const browser = await chromium.launch(browserOptions);
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "/system/organizations/",
    "/system/contributors/",
    "/system/locations/",
    "/system/functions/",
    "/system/goals/",
    "/secretariat/",
    ...(flags.programmeBudget
      ? [
          "/secretariat/programme-budget/",
          "/secretariat/programme-budget/contributors/",
        ]
      : []),
    ...(flags.peacekeepingBudget
      ? [
          "/secretariat/peacekeeping-budget/",
          "/secretariat/peacekeeping-budget/contributors/",
        ]
      : []),
    ...(flags.trustFunds
      ? ["/secretariat/trust-funds/", "/secretariat/trust-funds/contributors/"]
      : []),
    ...(flags.peaceOperations
      ? ["/secretariat/peacekeeping-budget/peace-operations/"]
      : []),
  ];
  for (const route of routes) {
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator("[data-chart-source-notes]").count(),
      0,
      route,
    );
    assert.equal(
      await page.getByText("Data for selected year", { exact: true }).count(),
      0,
      route,
    );
    assert.equal(
      await page.getByText("Show negative amounts", { exact: true }).count(),
      0,
      route,
    );
    assert.equal(
      await page.getByText("Show reported amounts", { exact: true }).count(),
      0,
      route,
    );
    assert.equal(
      await page.locator("[data-assessment-discrepancy]").count(),
      0,
      route,
    );
    if (route === "/secretariat/trust-funds/") {
      const funds = page.locator(
        'details[aria-label="Funds with zero or negative expenditure"]',
      );
      assert.equal(await funds.count(), 1);
      assert.equal(
        await funds.evaluate((node) =>
          Boolean(node.parentElement.closest("details")),
        ),
        false,
      );
      await funds.locator("summary").click();
      await funds.getByRole("button").first().click();
      await page.getByRole("dialog").waitFor();
      await page
        .getByRole("button", { name: "Close fund details", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
    }
    if (
      route === "/secretariat/peacekeeping-budget/" ||
      route === "/secretariat/peacekeeping-budget/peace-operations/"
    ) {
      const notes = page.locator("[data-map-notes]");
      await notes.waitFor();
      assert.equal(await notes.locator("details, summary").count(), 0);
      assert.equal(
        await notes.evaluate((node) => Boolean(node.closest(".text-gray-500"))),
        true,
      );
      assert.match(await notes.innerText(), /legal status/);
      if (route === "/secretariat/peacekeeping-budget/")
        assert.doesNotMatch(
          await notes.innerText(),
          /envoy|Syria|Yemen|Geneva|Amman|Nairobi/,
        );
      else
        assert.match(
          await notes.innerText(),
          /envoy for Syria works from Geneva/,
        );
      const map = page
        .locator(
          route.includes("peacekeeping-budget")
            ? ".pko-dot-map"
            : ".relative.border.border-gray-200.bg-white",
        )
        .first();
      const mapBounds = await map.boundingBox();
      const notesBounds = await notes.boundingBox();
      assert.ok(
        mapBounds &&
          notesBounds &&
          notesBounds.y >= mapBounds.y + mapBounds.height - 1,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      );
      assert.equal(await notes.isVisible(), true);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  if (flags.regularBudgetOutstanding) {
    await page.goto(
      `${portalUrl}/about/#secretariat-programme-budget-contributors`,
      {
        waitUntil: "networkidle",
      },
    );
    await page
      .locator('[data-secretariat-methodology="programme-budget-contributors"]')
      .getByText(/a difference of \$732,202/)
      .waitFor();
  }
  if (flags.programmeBudget) {
    const year = manifest.regularBudgetContributors.default;
    const data = read(`regular-budget-contributors-${year}`);
    const discrepancy = data.meta.amount_reconciliation.discrepancies[0];
    assert.ok(discrepancy);
    await page.goto(
      `${portalUrl}/secretariat/programme-budget/contributors/#regular-budget-contributor=${encodeURIComponent(discrepancy.name)}`,
      { waitUntil: "networkidle" },
    );
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const note = dialog.locator("[data-assessment-discrepancy]");
    await note.waitFor();
    assert.match(await note.innerText(), /assessment circular reports/);
    assert.match(await note.innerText(), /honour roll reports/);
    const exactCurrency = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    for (const amount of [
      discrepancy.assessment_document_amount,
      discrepancy.honour_roll_amount,
    ]) {
      assert.ok(
        (await note.innerText()).includes(exactCurrency.format(amount)),
      );
    }
    assert.equal(
      await page.locator("[data-assessment-discrepancy]").count(),
      1,
    );
    await page
      .getByRole("button", { name: "Close contributor details", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("[data-assessment-discrepancy]").count(),
      0,
    );
    const other = data.contributors.find(
      (member) =>
        !data.meta.amount_reconciliation.discrepancies.some(
          (item) => item.name === member.name,
        ),
    );
    await page.goto(
      `${portalUrl}/secretariat/programme-budget/contributors/#regular-budget-contributor=${encodeURIComponent(other.name)}`,
      { waitUntil: "networkidle" },
    );
    await dialog.waitFor();
    assert.equal(
      await dialog.locator("[data-assessment-discrepancy]").count(),
      0,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Page notes: clean footers, the 2021 outstanding balance note, plain map notes, nonpositive-fund navigation and Member State discrepancy isolation passed.",
  );
} finally {
  await browser.close();
}
