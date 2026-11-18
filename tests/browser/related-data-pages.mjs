import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const flags = profiles[process.env.SITE_VARIANT ?? "public"];
const enabled = (route) =>
  Object.entries(profiles.routes).every(
    ([parent, feature]) =>
      !(route === parent || route.startsWith(`${parent}/`)) || flags[feature],
  );
const organizations = "/system/organizations";
const contributors = "/system/contributors";
const assessments = "/system/contributors/assessments";
const overview = "/secretariat";
const programme = "/secretariat/programme-budget";
const peacekeeping = "/secretariat/peacekeeping-budget";
const extrabudgetary = "/secretariat/trust-funds";
const operations = `${peacekeeping}/peace-operations`;
const budgets = [programme, peacekeeping, extrabudgetary];
const contributorsFor = budgets.map((href) => `${href}/contributors`);
const expected = {
  [organizations]: [assessments, overview],
  [contributors]: [assessments, ...contributorsFor],
  [assessments]: [organizations, contributors, `${programme}/contributors`],
  [overview]: [...budgets, organizations],
  [operations]: [peacekeeping, programme, overview],
};
for (const budget of budgets) {
  expected[budget] = [
    `${budget}/contributors`,
    overview,
    ...(budget === peacekeeping ? [operations] : []),
  ];
  expected[`${budget}/contributors`] = [
    budget,
    ...contributorsFor.filter((href) => href !== `${budget}/contributors`),
    contributors,
  ];
}

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, targets] of Object.entries(expected)) {
    if (!enabled(route)) continue;
    const response = await page.goto(`${portalUrl}${route}/`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200, route);
    const related = page.locator("[data-related-data-pages]");
    assert.equal(await related.count(), 1, route);
    assert.equal(
      await related
        .getByRole("heading", { name: "Related pages", exact: true })
        .count(),
      1,
    );
    assert.deepEqual(
      await related
        .locator("a")
        .evaluateAll((links) =>
          links.map((link) => new URL(link.href).pathname.replace(/\/$/, "")),
        ),
      targets.filter(enabled),
      route,
    );
    for (const link of await related.locator("a").all()) {
      const href = await link.getAttribute("href");
      assert.match(
        await link.innerText(),
        href.startsWith("/system/") ? /UN System/ : /UN Secretariat/,
      );
      assert.equal(
        await link
          .locator('svg[aria-hidden="true"][viewBox^="0 0 320"]')
          .count(),
        1,
        href,
      );
    }
    for (const group of await related
      .locator("[data-related-data-group]")
      .all())
      assert.ok(await group.locator("a").count(), "No orphaned group headings");
    assert.equal(
      await page.locator("[data-extraction-disclaimer]").count(),
      (route.startsWith("/secretariat") &&
        route !== overview &&
        route !== operations) ||
        route === assessments
        ? 1
        : 0,
      route,
    );
    if (route === assessments)
      assert.match(
        await page.locator("[data-extraction-disclaimer]").innerText(),
        /Assessments and payments are compiled from CEB Financial Statistics\. Only the reported outstanding balances were automatically extracted/,
      );
    assert.equal(
      await page
        .getByRole("complementary", { name: "Data disclaimer", exact: true })
        .count(),
      0,
      "Notice is merged into About the data",
    );
    assert.ok(
      await related.evaluate((node) => {
        const references = document.querySelector("[data-page-references]");
        return Boolean(
          references.compareDocumentPosition(node) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }),
      "Related links follow About the data",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await related.evaluate((node) =>
        [node, ...node.querySelectorAll("a, p")].every((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth + 1;
        }),
      ),
      `${route}: related content fits mobile`,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  for (const route of [
    "/",
    "/system/locations/",
    "/system/functions/",
    "/system/goals/",
  ]) {
    await page.goto(portalUrl + route, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator("[data-related-data-pages]").count(),
      0,
      route,
    );
    assert.equal(
      await page.locator("[data-extraction-disclaimer]").count(),
      0,
      route,
    );
  }
  await page.goto(`${portalUrl}/secretariat/`, { waitUntil: "networkidle" });
  const nav = page.getByRole("navigation", {
    name: "UN Secretariat financials",
    exact: true,
  });
  assert.equal(
    await nav
      .getByRole("link", { name: "Extrabudgetary", exact: true })
      .count(),
    flags.trustFunds ? 1 : 0,
  );
  assert.equal(
    await nav.getByRole("link", { name: "Trust Funds", exact: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Related pages: destinations, scope labels, previews, profile visibility, merged extraction notices, page order and mobile fit passed.",
  );
} finally {
  await browser.close();
}
