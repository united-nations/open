import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const outstandingYears = JSON.parse(
  fs.readFileSync("public/data/manifest.json", "utf8"),
).regularBudgetOutstanding.years;
const hoverFraction =
  (2025 - Math.min(...outstandingYears)) /
  (Math.max(...outstandingYears) - Math.min(...outstandingYears));
const url = `${portalUrl}/secretariat/programme-budget/contributors/`;
try {
  await page.goto(url, { waitUntil: "networkidle" });
  const section = page.locator("#regular-budget-outstanding");
  await section
    .getByRole("heading", { name: "Outstanding contributions", exact: true })
    .waitFor();
  await section
    .locator("[data-outstanding-trend] .recharts-line-curve")
    .first()
    .waitFor();
  await section.getByText("Sep 30", { exact: true }).waitFor();
  const spacing = await section.evaluate((element) => {
    const plot = element.querySelector('[style*="--grouped-treemap-height"]');
    const controls = element.querySelector("[data-outstanding-controls]");
    return {
      above:
        plot.getBoundingClientRect().top -
        controls.getBoundingClientRect().bottom,
    };
  });
  assert.ok(
    Math.abs(spacing.above - 12) < 1,
    "Toolbar gap should use the shared chart frame spacing",
  );
  assert.equal(await page.locator("[data-chart-hint]").count(), 0);

  assert.equal(
    await section.locator("[data-outstanding-summary] dd").count(),
    2,
  );
  assert.ok(
    await section.locator("[data-outstanding-controls]").evaluate((element) => {
      const children = [...element.children].map((child) =>
        child.getBoundingClientRect(),
      );
      return (
        Math.max(...children.map((box) => box.top)) <
        Math.min(...children.map((box) => box.bottom))
      );
    }),
    "Desktop controls and totals should share one line",
  );
  await section.getByRole("button", { name: "Mexico", exact: true }).hover();
  await page.getByRole("tooltip").waitFor();
  assert.match(
    await page.getByRole("tooltip").innerText(),
    /Balance \/ annual assessment/,
  );
  await section.getByRole("button", { name: "Mexico", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("[data-country-outstanding]").waitFor();
  assert.match(
    await dialog.locator("[data-country-outstanding]").innerText(),
    /32\.8/,
  );
  assert.doesNotMatch(
    await dialog.innerText(),
    /Share of reported total|Historical balances and changes/,
  );
  assert.match(await dialog.innerText(), /Change \(%\)/);
  await dialog
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2025", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector("[data-country-outstanding]")
      ?.textContent.includes("19.9"),
  );
  await dialog
    .getByRole("button", { name: "Close contributor details", exact: true })
    .click();

  const snapshotYear = section.getByRole("slider");
  await snapshotYear.press("Home");
  for (let i = 0; i < outstandingYears.indexOf(2021); i++)
    await snapshotYear.press("ArrowRight");
  await section
    .locator("[data-outstanding-summary]")
    .getByText("$1.3B", { exact: true })
    .waitFor();
  await snapshotYear.press("Home");
  await section.getByText("Sep 30", { exact: true }).waitFor();
  await section
    .getByRole("button", { name: "United States of America", exact: true })
    .click();
  await dialog.getByText("At 30 September 2018", { exact: true }).waitFor();
  assert.match(
    await dialog.locator("[data-country-outstanding]").innerText(),
    /842/,
  );
  await dialog
    .getByText("Assessment and honour-roll status unavailable for 2018.", {
      exact: true,
    })
    .waitFor();
  await dialog
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2018", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Close contributor details", exact: true })
    .click();
  await section.getByRole("slider").press("ArrowRight");
  await section.getByText("Oct 4", { exact: true }).waitFor();
  await section.getByRole("button", { name: "Mexico", exact: true }).click();
  await dialog.getByText("At 4 October 2019", { exact: true }).waitFor();
  await dialog
    .getByRole("button", { name: "Close contributor details", exact: true })
    .click();
  await page.evaluate(() => {
    window.location.hash = "regular-budget-contributor=Japan";
  });
  await dialog.getByText("At 30 September 2026", { exact: true }).waitFor();
  await dialog
    .getByRole("button", { name: "Close contributor details", exact: true })
    .click();
  await section.getByRole("slider").press("End");
  await section.getByText("Sep 30", { exact: true }).waitFor();
  await section.getByText("Table", { exact: true }).click();
  const table = section.locator("[data-outstanding-table]");
  assert.equal(await table.locator("tbody tr").count(), 193);
  assert.ok(
    await table.evaluate(
      (element) => element.scrollWidth <= element.parentElement.clientWidth + 1,
    ),
    "Table headers should fit desktop width",
  );
  assert.ok(
    await table
      .locator("thead button")
      .evaluateAll((buttons) =>
        buttons.every(
          (button) =>
            getComputedStyle(button).whiteSpace === "nowrap" &&
            button.querySelector("svg"),
        ),
      ),
    "Sort chevrons should stay beside single-line headings",
  );
  const body = table.locator("tbody");
  assert.ok(
    await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
    "Only table rows should scroll vertically",
  );
  const headerY = (await table.locator("thead").boundingBox()).y;
  await body.evaluate((element) => {
    element.scrollTop = 500;
  });
  assert.equal(
    (await table.locator("thead").boundingBox()).y,
    headerY,
    "Body scrolling must not move the header",
  );
  await body.evaluate((element) => {
    element.scrollTop = 0;
  });
  assert.ok(
    await table.evaluate((element) => {
      const header = [...element.querySelectorAll("thead th")];
      const cells = [...element.querySelector("tbody tr").children];
      return header.every(
        (cell, index) =>
          Math.abs(
            cell.getBoundingClientRect().left -
              cells[index].getBoundingClientRect().left,
          ) < 1,
      );
    }),
    "Header and body columns should align despite the body scrollbar",
  );
  const france = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "France", exact: true }) });
  assert.equal(await france.locator("td").last().innerText(), "–");

  const mexico = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "Mexico", exact: true }) });
  assert.match(await mexico.innerText(), /2\.2%/);
  assert.match(await mexico.innerText(), /64\.8%/);
  const search = section.getByRole("searchbox", {
    name: "Search Member States",
  });
  await search.fill("China");
  assert.equal(await table.locator("tbody tr").count(), 1);
  assert.match(await table.locator("tbody tr").innerText(), /0%/);
  assert.equal(
    await section.locator("[data-outstanding-summary] dd").last().innerText(),
    "$0",
  );
  await table.getByRole("button", { name: "China", exact: true }).click();
  await dialog.locator("[data-country-outstanding]").waitFor();
  assert.equal(
    await dialog.locator("[data-country-outstanding]").innerText(),
    "$0",
  );
  await dialog
    .getByRole("button", { name: "Close contributor details", exact: true })
    .click();
  await search.clear();
  await section.getByRole("button", { name: /Change \(\$\)/ }).click();

  const comparison = section.locator("[data-outstanding-comparison]");
  await comparison
    .getByRole("button", { name: "Remove All Member States", exact: true })
    .waitFor();
  assert.ok(
    await comparison.evaluate(
      (element) =>
        element.getBoundingClientRect().width <
        element.parentElement.getBoundingClientRect().width * 0.55,
    ),
  );
  await comparison.getByRole("button", { name: /Select/ }).click();
  const dropdown = page.getByRole("dialog");
  await dropdown.getByPlaceholder("Search...", { exact: true }).fill("Mexico");
  await dropdown.getByRole("button", { name: "Mexico", exact: true }).click();
  await dropdown.getByPlaceholder("Search...", { exact: true }).fill("China");
  await dropdown.getByRole("button", { name: "China", exact: true }).click();
  await page.keyboard.press("Escape");
  await comparison
    .getByRole("button", { name: "Remove All Member States", exact: true })
    .waitFor();
  assert.equal(
    await section.locator("[data-outstanding-trend] .recharts-line").count(),
    3,
  );
  await comparison
    .getByRole("button", { name: "Remove All Member States", exact: true })
    .click();
  assert.equal(
    await section.locator("[data-outstanding-trend] .recharts-line").count(),
    2,
  );
  await comparison.getByRole("button", { name: /Select/ }).click();
  await dropdown.getByPlaceholder("Search...", { exact: true }).clear();
  await dropdown
    .getByText("All Member States", { exact: true })
    .locator("..")
    .getByRole("button")
    .click();
  await page.keyboard.press("Escape");
  await comparison
    .getByRole("button", { name: "Remove Mexico", exact: true })
    .waitFor();
  assert.equal(
    await comparison.getByText("Combined balance", { exact: true }).count(),
    0,
  );
  assert.equal(
    await comparison.getByText("Compare countries", { exact: true }).count(),
    0,
  );
  assert.equal(
    await section.locator("[data-outstanding-trend] .recharts-line").count(),
    3,
  );
  await comparison.locator(".recharts-wrapper").scrollIntoViewIfNeeded();
  const plot = comparison.locator(".recharts-wrapper");
  const chart = await plot.boundingBox();
  const axisRange = await plot
    .locator(".recharts-cartesian-grid-horizontal line")
    .first()
    .evaluate((line) => ({
      start: Number(line.getAttribute("x1")),
      end: Number(line.getAttribute("x2")),
    }));
  await page.mouse.move(
    chart.x +
      axisRange.start +
      (axisRange.end - axisRange.start) * hoverFraction,
    chart.y + chart.height / 2,
  );
  const tooltip = section.locator(".recharts-tooltip-wrapper");
  await tooltip
    .getByText("2025 · 30 September 2025", { exact: true })
    .waitFor();
  await tooltip.getByText("All Member States", { exact: true }).waitFor();
  await tooltip.getByText("$1.9B", { exact: true }).waitFor();
  await tooltip.getByText("Mexico", { exact: true }).waitFor();
  await tooltip.getByText("China", { exact: true }).waitFor();
  assert.doesNotMatch(
    await tooltip.innerText(),
    /Share of reported total|Balance \/ annual assessment|Change/,
  );
  // The user's eight-series comparison fits compact country rows in the viewport.
  await page.mouse.move(0, 0);
  await comparison.getByRole("button", { name: /Select/ }).click();
  for (const country of [
    "United States of America",
    "Venezuela (Bolivarian Republic of)",
    "Saudi Arabia",
    "Iran (Islamic Republic of)",
    "Chile",
  ]) {
    await dropdown.getByPlaceholder("Search...", { exact: true }).fill(country);
    await dropdown.getByRole("button", { name: country, exact: true }).click();
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await plot.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.mouse.move(0, 0);
  const comparisonBounds = await plot.boundingBox();
  await page.mouse.move(
    comparisonBounds.x +
      axisRange.start +
      (axisRange.end - axisRange.start) * hoverFraction,
    comparisonBounds.y + comparisonBounds.height / 2,
    { steps: 5 },
  );
  const scrollableTooltip = tooltip.locator("[data-outstanding-tooltip]");
  await scrollableTooltip.waitFor({ state: "visible" });
  assert.equal(
    await scrollableTooltip
      .locator("[data-outstanding-tooltip-series]")
      .count(),
    8,
  );
  const tooltipBounds = await scrollableTooltip.boundingBox();
  assert.ok(
    tooltipBounds.y >= 0 && tooltipBounds.y + tooltipBounds.height <= 900,
    "The complete tooltip scroll area must fit inside the viewport",
  );
  assert.ok(
    await scrollableTooltip
      .locator("[data-outstanding-tooltip-series]")
      .evaluateAll((elements) =>
        elements.every(
          (element) =>
            getComputedStyle(element).whiteSpace === "nowrap" &&
            element.clientHeight < 30,
        ),
      ),
    "Each country should occupy one compact line",
  );
  await section.screenshot({
    path: "audits/browser/regular-budget-outstanding-desktop.png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await section.getByRole("radio", { name: "Chart", exact: true }).check({ force: true });
  await page.mouse.move(0, 0);
  await section.screenshot({
    path: "audits/browser/regular-budget-outstanding-mobile.png",
  });
  assert.equal(
    await section.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
    true,
    "New section should fit mobile width",
  );
  assert.deepEqual(errors, []);

  const missing = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await missing.route(
    "**/regular-budget-outstanding-2025.json",
    async (route) => {
      const response = await route.fetch();
      const snapshot = await response.json();
      snapshot.contributors = snapshot.contributors.filter(
        (row) => row.name !== "Mexico",
      );
      await route.fulfill({ response, json: snapshot });
    },
  );
  await missing.goto(url, { waitUntil: "networkidle" });
  const missingComparison = missing.locator("[data-outstanding-comparison]");
  await missingComparison.getByRole("button", { name: /Select/ }).click();
  const missingDropdown = missing.getByRole("dialog");
  await missingDropdown
    .getByPlaceholder("Search...", { exact: true })
    .fill("Mexico");
  await missingDropdown
    .getByRole("button", { name: "Mexico", exact: true })
    .click();
  await missing.keyboard.press("Escape");
  const missingPlot = missingComparison.locator(".recharts-wrapper");
  await missingPlot.scrollIntoViewIfNeeded();
  const missingBounds = await missingPlot.boundingBox();
  await missing.mouse.move(
    missingBounds.x +
      axisRange.start +
      (axisRange.end - axisRange.start) * hoverFraction,
    missingBounds.y + missingBounds.height / 2,
  );
  const missingGroup = missingComparison
    .locator("[data-outstanding-tooltip-series]")
    .filter({ has: missing.getByText("Mexico", { exact: true }) });
  await missingGroup
    .getByText("Unavailable", { exact: true })
    .first()
    .waitFor();
  assert.equal(
    await missingGroup.getByText("$0", { exact: true }).count(),
    0,
    "A missing country observation must not become a zero balance in the tooltip",
  );
  await missing.close();
  const failed = await browser.newPage();
  await failed.route("**/regular-budget-outstanding-2024.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await failed.goto(url, { waitUntil: "networkidle" });
  await failed
    .getByRole("alert")
    .filter({ hasText: "Outstanding-contribution data could not be loaded" })
    .waitFor();
  assert.equal(
    await failed.locator("[data-outstanding-summary]").count(),
    0,
    "A failed snapshot must not publish a partial total",
  );
  await failed.close();
  fs.writeFileSync(
    "audits/browser/regular-budget-outstanding.json",
    JSON.stringify(
      {
        errors,
        checks: [
          "Shared sidebar and selected-year navigation",
          "Autumn date exceptions",
          "193-country sortable table with percentages and differences",
          "Zero balances",
          "Filtered and comparison trends",
          "Eight-series tooltip viewport containment and single-line country rows",
          "Sidebar year reset before hash navigation",
          "Desktop/mobile rendering",
          "Failed snapshot disclosure",
          "Missing country tooltip remains unavailable",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "Regular-budget outstanding contributions: browser checks passed",
  );
} finally {
  await browser.close();
}
