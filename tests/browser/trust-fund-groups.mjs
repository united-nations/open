import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moduleAt } from "../../src/lib/tests/moduleAt.mjs";

const { formatBudget } = await moduleAt(
  "node_modules/@un-eosg/ui/lib/format-budget.ts",
);
const { sourcePageUrl } = await moduleAt("src/lib/sourceReferences.ts");

const data = JSON.parse(
  fs.readFileSync("public/data/budget-trust-funds-2024.json"),
);
const funds = data.nodes.filter(
  (node) => node.tier === "detail" && node.sourceGroup === "volume_i",
);
const browser = await chromium.launch(browserOptions);
try {
  for (const viewport of [
    { width: 1440, height: 1200 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${portalUrl}/secretariat/trust-funds/`);
    const grouped = page.getByRole("radio", { name: "By group", exact: true });
    const entity = page.getByRole("radio", { name: "By entity", exact: true });
    await grouped.waitFor();
    const slider = page.getByRole("slider", { name: "Select year" });
    await slider.press("ArrowLeft");
    const separateSource = page
      .getByRole("group", { name: "Reporting source" })
      .getByRole("button", {
        name: "Separately reported entities",
        exact: true,
      });
    if (await separateSource.count()) await separateSource.click();
    await page
      .locator("dl dd")
      .getByText(
        formatBudget(
          data.meta.sourceGroups.find((group) => group.id === "volume_i")
            .amount,
        ),
        { exact: true },
      )
      .waitFor();
    assert.equal(await grouped.isChecked(), true);
    await page
      .getByRole("button", {
        name: "Central Emergency Response Fund",
        exact: true,
      })
      .waitFor();
    const sections = () =>
      page
        .locator("section[aria-label]")
        .filter({ has: page.locator("button[aria-describedby]") });
    assert.equal(await sections().count(), 8);
    assert.equal(
      await sections().locator("button").count(),
      funds.filter((fund) => fund.amount > 0).length,
    );
    await page.waitForTimeout(600);
    for (const section of await sections().all()) {
      const header = section.locator(":scope > .z-20");
      const bounds = await header.boundingBox();
      const tiles = await section
        .locator("button")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().toJSON()),
        );
      const right = Math.max(...tiles.map((rect) => rect.right));
      assert.ok(
        bounds.x + bounds.width <= right + 1,
        "Group header stays inside its own packed rectangle",
      );
    }
    const smallHeadings = [
      "International justice and law",
      "Public information",
      "United Nations Office for Partnerships",
    ];
    const bottomBlock = await page
      .locator('section[aria-label="Political affairs"] button')
      .first()
      .boundingBox();
    for (const name of smallHeadings) {
      const tile = page.locator(`section[aria-label="${name}"] button`).first();
      await tile.waitFor();
      const rect = await tile.boundingBox();
      assert.ok(
        rect.y >= bottomBlock.y - 2,
        "Small groups share the bottom block",
      );
      assert.ok(rect.height > 10, "Small groups have usable height");
    }
    const search = page.getByRole("searchbox");
    await search.fill("UN Secretariat");
    await page.waitForFunction(
      (expected) =>
        document.querySelectorAll(
          "section[aria-label] button[aria-describedby]",
        ).length === expected,
      funds.filter((fund) => fund.amount > 0).length,
    );
    assert.equal(
      (await page.locator("dl dd").innerText()).trim(),
      formatBudget(
        data.meta.sourceGroups.find((group) => group.id === "volume_i").amount,
      ),
    );
    await search.fill("ECA");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          "section[aria-label] button[aria-describedby]",
        ).length === 3,
    );
    const selectedFund = funds.find((fund) => fund.code === "CFE");
    const common = page.locator(
      'section[aria-label="Common support and miscellaneous"]',
    );
    await common
      .getByRole("button", { name: selectedFund.label, exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator('section[aria-label="Economic and social development"] button')
        .count(),
      2,
    );
    assert.equal(
      await page.locator('[aria-label="Schedule groups"]').count(),
      0,
    );
    await entity.locator("..").click();
    assert.equal(await entity.isChecked(), true);
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          "section[aria-label] button[aria-describedby]",
        ).length === 3,
    );
    assert.equal(await sections().locator("button").count(), 3);
    await page
      .getByRole("button", { name: selectedFund.label, exact: true })
      .click();
    const panel = page.locator(
      '[role="dialog"][aria-labelledby="trust-fund-title"]',
    );
    await panel.waitFor();
    const hash = new URL(page.url()).hash;
    assert.equal(decodeURIComponent(hash.split("=")[1]), selectedFund.id);
    await page.keyboard.press("Escape");
    await grouped.locator("..").click();
    await common
      .getByRole("button", { name: selectedFund.label, exact: true })
      .click();
    await panel.waitFor();
    assert.equal(new URL(page.url()).hash, hash);
    const sourceDisclosure = panel.locator("[data-expenditure-sources]");
    await sourceDisclosure.locator(":scope > summary").click();
    await sourceDisclosure
      .getByText(`Schedule group: ${selectedFund.scheduleGroup.label}`, {
        exact: true,
      })
      .waitFor();
    const headingUrl = sourcePageUrl(
      selectedFund.scheduleGroup.source.url,
      selectedFund.scheduleGroup.source.pdfPage,
    );
    assert.ok(
      await sourceDisclosure.locator(`a[href="${headingUrl}"]`).count(),
    );
    await page.keyboard.press("Escape");
    await search.fill("CFE");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          "section[aria-label] button[aria-describedby]",
        ).length === 1,
    );
    await common
      .getByRole("button", { name: selectedFund.label, exact: true })
      .waitFor();
    assert.equal(await sections().locator("button").count(), 1);
    assert.equal(
      (await page.locator("dl dd").innerText()).trim(),
      formatBudget(selectedFund.amount),
    );
    await search.fill("");
    const dataView = page.getByRole("group", { name: "Data view" });
    await dataView.getByRole("radio", { name: "List" }).locator("..").click();
    const rankedFunds = page.getByRole("group", { name: "Ranked chart data" });
    const largest = funds.reduce((a, b) => (a.amount > b.amount ? a : b));
    const emergency = funds.find(
      (fund) => fund.label === "Central Emergency Response Fund",
    );
    const measureBar = (label) =>
      rankedFunds
        .getByRole("button")
        .filter({ has: page.getByText(label, { exact: true }) })
        .evaluate((row) => {
          const [name, bar, amount] = row.children;
          const fill = bar.querySelector('[style*="width"]');
          const bounds = bar.getBoundingClientRect();
          const filled = fill.getBoundingClientRect();
          const labelBounds = name.getBoundingClientRect();
          const amountBounds = amount.getBoundingClientRect();
          return {
            inline:
              labelBounds.right < bounds.left &&
              bounds.right < amountBounds.left,
            stacked:
              labelBounds.right < amountBounds.left &&
              bounds.top >= Math.max(labelBounds.bottom, amountBounds.bottom) &&
              Math.abs(bounds.left - labelBounds.left) < 1 &&
              Math.abs(bounds.right - amountBounds.right) < 1,
            left: bounds.left,
            right: bounds.right,
            offset: filled.left - bounds.left,
            ratio: filled.width / bounds.width,
          };
        });
    const largestBar = await measureBar(largest.label);
    const emergencyBar = await measureBar(emergency.label);
    const layout = viewport.width < 640 ? "stacked" : "inline";
    assert.ok(largestBar[layout] && emergencyBar[layout]);
    assert.equal(largestBar.left, emergencyBar.left);
    assert.equal(largestBar.right, emergencyBar.right);
    assert.equal(largestBar.offset, 0);
    assert.equal(emergencyBar.offset, 0);
    assert.equal(largestBar.ratio, 1);
    assert.ok(
      Math.abs(emergencyBar.ratio - emergency.amount / largest.amount) < 0.001,
    );
    const nonpositive = funds.find((fund) => fund.amount <= 0);
    await search.fill(nonpositive.label);
    const row = rankedFunds
      .getByRole("group", {
        name: nonpositive.scheduleGroup.label,
        exact: true,
      })
      .getByRole("button")
      .filter({ hasText: nonpositive.label });
    assert.ok(
      (await row.innerText()).includes(formatBudget(nonpositive.amount)),
    );
    assert.equal((await measureBar(nonpositive.label)).ratio, 0);
    await row.click();
    await panel.waitFor();
    assert.equal(
      decodeURIComponent(new URL(page.url()).hash.split("=")[1]),
      nonpositive.id,
    );
    await page.keyboard.press("Escape");
    await dataView.getByRole("radio", { name: "Chart" }).locator("..").click();
    // The annual heading follows the selected year, even for the same fund ID.
    await search.fill("SIM");
    await slider.press("Home");
    await page
      .locator(
        'section[aria-label="Human rights and humanitarian affairs"] button',
      )
      .waitFor();
    await slider.press("End");
    await page
      .locator('section[aria-label="International justice and law"] button')
      .waitFor();
    assert.equal(await grouped.isChecked(), true);
    await search.fill("");
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600); // Let the shared 500 ms layout transition finish.
    await page.screenshot({
      path: `audits/browser/trust-fund-groups-${viewport.width}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log(
      `PASS ${viewport.width}px: small-group row, both lenses, search, unchanged fund links, heading citations and nonpositive navigation`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
