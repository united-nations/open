import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const features = profiles[process.env.SITE_VARIANT ?? "public"];
const routes = [
  ["/system/organizations/"],
  ["/system/organizations/", "staff"],
  ["/system/contributors/"],
  ["/system/contributors/assessments/"],
  ["/system/locations/"],
  ["/system/locations/", "staff"],
  ["/system/functions/"],
  ["/system/goals/"],
  ...(features.pooledFunds ? [["/system/pooled-funds/"]] : []),
  ["/secretariat/"],
  ...(features.programmeBudget
    ? [
        ["/secretariat/programme-budget/"],
        ["/secretariat/programme-budget/contributors/"],
      ]
    : []),
  ...(features.peacekeepingBudget
    ? [
        ["/secretariat/peacekeeping-budget/"],
        ["/secretariat/peacekeeping-budget/contributors/"],
      ]
    : []),
  ...(features.peaceOperations
    ? [["/secretariat/peacekeeping-budget/peace-operations/"]]
    : []),
  ...(features.trustFunds
    ? [
        ["/secretariat/trust-funds/"],
        ["/secretariat/trust-funds/contributors/"],
      ]
    : []),
];

const browser = await chromium.launch(browserOptions);
try {
  for (const [route, mode] of routes) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
      reducedMotion: "reduce",
    });
    page.setDefaultNavigationTimeout(90000);
    page.setDefaultTimeout(20000);
    try {
      await page.goto(`${portalUrl}${route}`, { waitUntil: "networkidle" });
      if (mode === "staff") {
        await page
          .getByRole("radio", { name: "Staff", exact: true })
          .locator("..")
          .click();
      }
      const toggles = page.getByRole("radio", { name: "List", exact: true });
      await toggles.first().waitFor();
      for (let index = 0; index < (await toggles.count()); index++) {
        await toggles.nth(index).locator("..").click();
        await page.locator("[data-ranked-list-item]:visible").first().waitFor();
        for (const width of [1440, 768, 390]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.waitForFunction(
            () => document.documentElement.scrollWidth <= innerWidth,
          );
          const rows = await page
            .locator("[data-ranked-list-item]:visible")
            .evaluateAll((elements) =>
              elements.map((element) => {
                const rect = (node) => {
                  const { x, y, width, right, bottom } =
                    node.getBoundingClientRect();
                  return { x, y, width, right, bottom };
                };
                const [label, track, value] = element.children;
                const fill = track.querySelector("[style]");
                return {
                  label: rect(label),
                  track: rect(track),
                  value: rect(value),
                  fill: rect(fill),
                  percent: parseFloat(fill.style.width),
                  color: getComputedStyle(fill).backgroundColor,
                };
              }),
            );
          const context = `${route} ${mode ?? "financing"}, list ${index}, ${width}px`;
          assert.ok(rows.length > 0, context);
          assert.ok(
            rows.some((row) => row.percent >= 1),
            `Expected comparable positive amounts: ${context}`,
          );
          for (const row of rows) {
            const detail = `${context}: ${JSON.stringify(row)}`;
            assert.ok(row.track.width > 0, `Collapsed bar column: ${context}`);
            if (row.percent >= 1) {
              assert.ok(
                row.fill.width > 0,
                `Invisible positive bar: ${context}`,
              );
              assert.notEqual(row.color, "rgba(0, 0, 0, 0)", context);
            }
            assert.ok(row.fill.right <= row.track.right + 1, detail);
            if (width >= 640) {
              assert.ok(row.label.right <= row.track.x + 1, detail);
              assert.ok(row.track.right <= row.value.x + 1, detail);
            } else {
              assert.ok(
                row.track.y >= Math.max(row.label.bottom, row.value.bottom) - 1,
                context,
              );
            }
          }
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `Horizontal overflow: ${context}`,
          );
        }
        await page.setViewportSize({ width: 1440, height: 1050 });
      }
      console.log(
        `Visible list bars and separate columns: ${route} ${mode ?? ""}`,
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
