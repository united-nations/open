import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const flags = profiles[process.env.SITE_VARIANT ?? "public"];
const views = [
  { route: "/system/organizations/" },
  { route: "/system/contributors/" },
  { route: "/system/locations/", chartToggle: true },
  ...(flags.programmeBudget
    ? [
        { route: "/secretariat/programme-budget/" },
        {
          route: "/secretariat/programme-budget/contributors/",
          scope: "#regular-budget-contributors",
        },
        ...(flags.regularBudgetOutstanding
          ? [
              {
                route: "/secretariat/programme-budget/contributors/",
                scope: "#regular-budget-outstanding",
              },
            ]
          : []),
      ]
    : []),
  ...(flags.peacekeepingBudget
    ? [{ route: "/secretariat/peacekeeping-budget/contributors/" }]
    : []),
  ...(flags.trustFunds
    ? [
        { route: "/secretariat/trust-funds/" },
        { route: "/secretariat/trust-funds/contributors/" },
      ]
    : []),
];

// Check the printed name, not the accessible description: tiny tiles retain
// screen-reader text even when their visual labels have been omitted.
function printedNameFits(tile) {
  const name = tile.getAttribute("aria-label");
  const bounds = tile.getBoundingClientRect();
  return [...tile.querySelectorAll("span")].some((element) => {
    if (element.textContent.trim() !== name) return false;
    if (element.closest(".sr-only")) return false;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      style.visibility === "visible" &&
      style.display !== "none" &&
      box.width > 0 &&
      box.height > 0 &&
      box.left >= bounds.left - 1 &&
      box.right <= bounds.right + 1 &&
      box.top >= bounds.top - 1 &&
      box.bottom <= bounds.bottom + 1
    );
  });
}

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const view of views) {
    await page.goto(`${portalUrl}${view.route}`, { waitUntil: "networkidle" });
    if (view.chartToggle) {
      await page
        .getByRole("radio", { name: "Chart", exact: true })
        .locator("..")
        .click();
    }
    const scope = view.scope ? page.locator(view.scope) : page;
    const search = scope.locator('input[placeholder^="Search"]').first();
    await search.waitFor();
    const tileSelector =
      "button[aria-describedby]" +
      (view.scope === "#regular-budget-contributors"
        ? ":not(#regular-budget-outstanding *)"
        : "");
    const tiles = scope.locator(tileSelector);
    await tiles.first().waitFor();
    await page.waitForTimeout(650); // Allow the initial layout transition to settle.
    const count = await tiles.count();
    const candidates = await tiles.evaluateAll((elements) =>
      elements
        .filter((element) => !element.querySelector(".font-semibold"))
        .map((element) => element.getAttribute("aria-label"))
        .filter((name, index, names) => name && names.indexOf(name) === index)
        .slice(-3),
    );
    assert.ok(
      candidates.length,
      `${view.route}: starts with unlabelled tiny tiles`,
    );
    for (const name of candidates) {
      const tile = tiles
        .and(page.getByRole("button", { name, exact: true }))
        .first();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await search.fill(name);
        await tile.waitFor();
        await page.waitForFunction(
          printedNameFits,
          await tile.elementHandle(),
          { timeout: 10000 },
        );
        const filteredCount = await tiles.count();
        assert.ok(
          filteredCount < count,
          `${view.route}: search filters the chart`,
        );
        await page.setViewportSize({ width: 1440, height: 1000 });
        await search.fill("");
        await page.waitForFunction(
          ({ selector, count }) =>
            document.querySelectorAll(selector).length === count,
          { selector: `${view.scope ?? ""} ${tileSelector}`, count },
        );
        await page.waitForTimeout(650);
      }
    }
    if (view.route === "/secretariat/trust-funds/") {
      // EOSG is small in the full dataset. Its group heading must return
      // when search expands its funds, independently of the leaf labels.
      const heading = page
        .locator("div.contents > div.pointer-events-none")
        .filter({ hasText: /^EOSG\s/ });
      assert.equal(
        await heading.count(),
        0,
        "EOSG heading is hidden in the full chart",
      );
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await search.fill("EOSG");
        await heading.waitFor({ state: "visible" });
        assert.ok(
          (await tiles.count()) > 1,
          "EOSG search retains its individual funds",
        );
        await search.fill("no-such-trust-fund");
        await heading.waitFor({ state: "detached" });
        await search.fill("EOSG");
        await heading.waitFor({ state: "visible" });
        await search.fill("");
        await heading.waitFor({ state: "detached" });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log(
      `${view.route}${view.scope ?? ""}: tiny tile labels return after search on desktop and mobile`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
