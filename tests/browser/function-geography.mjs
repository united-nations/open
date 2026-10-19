import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };

const variant = process.env.SITE_VARIANT ?? "public";
const flags = profiles[variant];
assert.ok(flags, "Invalid SITE_VARIANT");

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(portalUrl + "/system/locations/", {
    waitUntil: "networkidle",
  });
  const section = page.locator("#function-geography");
  assert.equal(await section.count(), flags.functionGeography ? 1 : 0);
  if (!flags.functionGeography) {
    assert.equal(
      requests.some((url) => url.includes("/data/function-geography-")),
      false,
      "Disabled chart does not load its data",
    );
    assert.deepEqual(errors, []);
    console.log("Function/geography plot is disabled for the public profile.");
  } else {
    const slider = section.getByRole("slider");
    const year = Number(await slider.getAttribute("aria-valuenow"));
    const data = JSON.parse(
      fs.readFileSync(`public/data/function-geography-${year}.json`),
    );
    await section.locator("[data-function]").first().waitFor();
    assert.equal(await section.locator("[data-function]").count(), 4);
    assert.equal(await section.locator("button[data-level]").count(), 12);
    const geometry = await section
      .locator("[data-function]")
      .evaluateAll((columns) =>
        columns.map((column) => ({
          key: column.dataset.function,
          width: column.getBoundingClientRect().width,
          cells: [...column.querySelectorAll("button[data-level]")].map(
            (cell) => ({
              level: cell.dataset.level,
              amount: Number(cell.dataset.amount),
              height:
                cell.getBoundingClientRect().height /
                cell.parentElement.getBoundingClientRect().height,
            }),
          ),
        })),
      );
    const availableWidth = geometry.reduce(
      (sum, column) => sum + column.width,
      0,
    );
    for (const column of geometry) {
      const expected = data.functions.find((item) => item.key === column.key);
      assert.ok(
        Math.abs(column.width / availableWidth - expected.total / data.total) <
          0.001,
      );
      for (const cell of column.cells) {
        assert.equal(
          cell.amount,
          expected.geography.find((item) => item.level === cell.level).amount,
        );
        assert.ok(Math.abs(cell.height - cell.amount / expected.total) < 0.001);
      }
    }
    const country = section.locator(
      '[data-function="humanitarian"] button[data-level="country"]',
    );
    await country.focus();
    await page.getByRole("tooltip").waitFor();
    assert.match(
      await page.getByRole("tooltip").innerText(),
      /Share of function/,
    );
    await page.keyboard.press("Escape");
    await section.screenshot({
      path: "audits/browser/function-geography.png",
      animations: "disabled",
    });
    await slider.press("ArrowLeft");
    await section
      .getByRole("group", {
        name: `Expenditure by function and geographic level in ${year - 1}`,
        exact: true,
      })
      .waitFor();
    assert.equal(await section.locator("button[data-level]").count(), 12);
    await section.getByRole("button", { name: /^Source:/ }).click();
    await section.getByRole("table").waitFor();
    assert.ok(
      await section
        .getByRole("link", {
          name: "Download the CEB geographic source data",
          exact: true,
        })
        .count(),
    );
    await section.getByRole("button", { name: /^Source:/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await section.screenshot({
      path: "audits/browser/function-geography-mobile.png",
      animations: "disabled",
    });
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(
      horizontalOverflow,
      false,
      "Chart scrolls internally on narrow screens",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Function/geography mosaic: reported values and area ratios, year selection, keyboard tooltip, source table, and mobile layout passed.",
    );
  }
} finally {
  await browser.close();
}
