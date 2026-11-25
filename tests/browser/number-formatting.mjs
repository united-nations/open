import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const flags = profiles[process.env.SITE_VARIANT ?? "public"];
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function checkMoney(label) {
    const text = await page
      .locator("body")
      .evaluate((body) =>
        [
          body.innerText,
          ...Array.from(
            body.querySelectorAll("[aria-label], [title]"),
            (node) =>
              [
                node.getAttribute("aria-label"),
                node.getAttribute("title"),
              ].join(" "),
          ),
        ].join("\n"),
      );
    const amounts = Array.from(
      text.matchAll(
        /(?:\$|CHF\s+)(\d[\d,.]*)([KMBT]?)(\s+per\s+(?:USD|CHF|EUR))?/g,
      ),
    );
    assert.ok(amounts.length > 0, `${label}: actual monetary data is rendered`);
    for (const [match, digits, , exchangeRate] of amounts) {
      // Published exchange rates are ratios and retain their source precision.
      if (exchangeRate) continue;
      assert.ok(
        !digits.includes(","),
        `${label}: full amount leaked: ${match}`,
      );
      assert.ok(
        (digits.split(".")[1]?.length ?? 0) <= 1,
        `${label}: extra decimals: ${match}`,
      );
      assert.ok(
        digits.replace(".", "").length <= 3,
        `${label}: extra digits: ${match}`,
      );
    }
  }

  for (const route of [
    "/system/organizations/",
    "/system/contributors/",
    "/system/contributors/assessments/",
    "/system/locations/",
    "/system/functions/",
    "/system/goals/",
    ...(flags.pooledFunds ? ["/system/pooled-funds/"] : []),
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
    "/about/",
  ]) {
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    if (route === "/about/") {
      const closed = page.locator(
        'main button[aria-expanded="false"][aria-controls]',
      );
      while (await closed.count()) await closed.first().click();
    }
    await checkMoney(route);
    if (route === "/system/contributors/assessments/") {
      const chart = page.getByRole("region", {
        name: "Assessed contributions and payments",
        exact: true,
      });
      const text = await chart.innerText();
      const percentages = Array.from(text.matchAll(/(\d+(?:\.\d+)?)%/g));
      assert.ok(percentages.length > 0, "payment percentages are rendered");
      for (const [, value] of percentages) {
        assert.ok(
          Number(value) < 10 || !value.includes("."),
          `Payment coverage at least 10% must be whole: ${value}%`,
        );
        assert.ok((value.split(".")[1]?.length ?? 0) <= 1);
      }
      await chart.screenshot({
        path: "audits/browser/percentage-rounding-assessments-desktop.png",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await chart.screenshot({
        path: "audits/browser/percentage-rounding-assessments-mobile.png",
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }

  if (flags.programmeBudget) {
    const manifest = JSON.parse(
      fs.readFileSync("public/data/manifest.json", "utf8"),
    );
    const year = manifest.regularBudgetContributors.default;
    const data = JSON.parse(
      fs.readFileSync(
        `public/data/regular-budget-contributors-${year}.json`,
        "utf8",
      ),
    );
    // Exercise a rounding collision with a local fixture. Published source
    // discrepancies can disappear when the source is corrected.
    const fixtureMember = [...data.contributors].sort(
      (a, b) => b.assessment_amount - a.assessment_amount,
    )[0];
    const fixture = structuredClone(data);
    fixture.meta.amount_reconciliation.discrepancies = [
      {
        name: fixtureMember.name,
        assessment_document_amount: fixtureMember.assessment_amount,
        honour_roll_amount: fixtureMember.assessment_amount - 100,
      },
    ];
    const assessmentRoute = `**/data/regular-budget-contributors-${year}.json`;
    await page.route(assessmentRoute, (route) =>
      route.fulfill({ json: fixture }),
    );
    await page.goto(
      `${portalUrl}/secretariat/programme-budget/contributors/#regular-budget-contributor=${encodeURIComponent(fixtureMember.name)}`,
      { waitUntil: "networkidle" },
    );
    const discrepancy = page.locator("[data-assessment-discrepancy]");
    await discrepancy.waitFor();
    assert.match(await discrepancy.innerText(), /difference is <\$1K/);
    assert.match(
      await discrepancy.innerText(),
      /Both totals round to the same displayed amount/,
    );
    await checkMoney("assessment discrepancy and sidebar");
    await page.screenshot({
      path: "audits/browser/number-formatting-desktop.png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await checkMoney("mobile sidebar");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "audits/browser/number-formatting-mobile.png",
    });

    // An official 0.001% assessment rate must remain distinguishable from 0.01%.
    await page.unroute(assessmentRoute);
    const member = data.contributors.find(
      (row) => row.assessment_rate === 0.001,
    );
    assert.ok(member, "source contains the smallest official rate");
    await page.goto(
      `${portalUrl}/secretariat/programme-budget/contributors/#regular-budget-contributor=${encodeURIComponent(member.name)}`,
      { waitUntil: "networkidle" },
    );
    await page.getByText("0.001%", { exact: true }).last().waitFor();
    await checkMoney("small official assessment");
  }

  // Static data remains downloadable with all its original precision.
  const manifest = JSON.parse(
    fs.readFileSync("public/data/manifest.json", "utf8"),
  );
  const filename = `entity-spending-${manifest.entitySpending.default}.json`;
  const response = await page.request.get(`${portalUrl}/data/${filename}`);
  assert.ok(response.ok());
  assert.deepEqual(
    await response.json(),
    JSON.parse(fs.readFileSync(`public/data/${filename}`, "utf8")),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Compact financial displays, official rates, mobile layout and unrounded downloads verified.",
  );
} finally {
  await browser.close();
}
