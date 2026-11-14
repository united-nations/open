import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const profile = profiles[process.env.SITE_VARIANT ?? "public"];
const routes = [
  "/system/organizations/",
  "/system/contributors/",
  "/system/contributors/assessments/",
  "/system/locations/",
  "/system/functions/",
  "/system/goals/",
  ...(profile.personnel ? ["/system/personnel/"] : []),
  "/secretariat/",
  ...(profile.programmeBudget
    ? [
        "/secretariat/programme-budget/",
        "/secretariat/programme-budget/contributors/",
      ]
    : []),
  ...(profile.peacekeepingBudget
    ? [
        "/secretariat/peacekeeping-budget/",
        "/secretariat/peacekeeping-budget/contributors/",
      ]
    : []),
  ...(profile.peaceOperations
    ? ["/secretariat/peacekeeping-budget/peace-operations/"]
    : []),
  ...(profile.trustFunds
    ? ["/secretariat/trust-funds/", "/secretariat/trust-funds/contributors/"]
    : []),
];

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    await page.goto(`${portalUrl}${route}`, { waitUntil: "networkidle" });
    assert.equal(
      await page.locator("main h1").count(),
      1,
      `${route}: one route title`,
    );
    const sources = page.locator("main h1 + p + p");
    assert.ok(
      (await sources.getByRole("link").count()) > 0,
      `${route}: source links follow the page summary`,
    );
    assert.equal(
      await sources.evaluate((el) => getComputedStyle(el).fontSize),
      "14px",
      `${route}: secondary source text`,
    );
    const aboutData = page.getByRole("region", { name: "About the data" });
    const aboutHeading = aboutData.locator(":scope > h2");
    assert.equal(await aboutHeading.textContent(), "About the data", route);
    const aboutStyle = await aboutHeading.evaluate((el) => ({
      fontSize: getComputedStyle(el).fontSize,
      fontWeight: getComputedStyle(el).fontWeight,
      background: getComputedStyle(el.parentElement).backgroundColor,
      border: getComputedStyle(el.parentElement).borderTopWidth,
    }));
    assert.deepEqual(
      aboutStyle,
      {
        fontSize: "24px",
        fontWeight: "700",
        background: "rgba(0, 0, 0, 0)",
        border: "0px",
      },
      `${route}: About the data is an unboxed section`,
    );
    const headings = await page
      .locator("main h1, main h2, main h3, main h4")
      .evaluateAll((items) =>
        items
          .filter((el) => el.getBoundingClientRect().height > 0)
          .map((el) => ({
            level: Number(el.tagName.slice(1)),
            text: el.textContent.trim(),
          })),
      );
    let previous = 0;
    for (const heading of headings) {
      assert.ok(
        heading.level <= previous + 1,
        `${route}: skipped heading level before ${heading.text}`,
      );
      previous = heading.level;
    }
    const charts = await page
      .locator('[data-content-heading="chart"]')
      .evaluateAll((items) =>
        items.map((el) => ({
          size: getComputedStyle(el).fontSize,
          weight: getComputedStyle(el).fontWeight,
        })),
      );
    for (const chart of charts)
      assert.deepEqual(chart, { size: "18px", weight: "500" }, route);
    assert.equal(
      await page.getByRole("heading", { name: /^Explore trends/ }).count(),
      0,
      route,
    );
    for (const anchor of await page
      .locator('[data-content-heading="section"] a')
      .all()) {
      const href = await anchor.getAttribute("href");
      assert.ok(await page.locator(href).count(), `${route}: ${href} resolves`);
      await anchor.focus();
      await page.waitForFunction(
        (el) => getComputedStyle(el.querySelector("svg")).opacity === "1",
        await anchor.elementHandle(),
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/system/contributors/assessments/", "/secretariat/"]) {
    await page.goto(`${portalUrl}${route}`, { waitUntil: "networkidle" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route}: mobile fit`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Route H1s, heading hierarchy, consistent chart titles, section anchors and mobile fit passed.",
  );
} finally {
  await browser.close();
}
