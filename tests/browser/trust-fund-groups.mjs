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
    assert.equal(await sections().count(), 7);
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
    const commonPill = page.getByRole("button", {
      name: "Common support and miscellaneous",
      exact: true,
    });
    assert.equal(await commonPill.getAttribute("aria-pressed"), "true");
    await commonPill.click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          "section[aria-label] button[aria-describedby]",
        ).length === 2,
    );
    assert.equal(await commonPill.getAttribute("aria-pressed"), "false");
    const otherTotal = funds
      .filter(
        (fund) => fund.scheduleGroup.code === "3" && fund.id.includes(":ECA:"),
      )
      .reduce((sum, fund) => sum + fund.amount, 0);
    assert.equal(
      (await page.locator("dl dd").innerText()).trim(),
      formatBudget(otherTotal),
    );
    await commonPill.click();
    await entity.locator("..").click();
    assert.equal(await entity.isChecked(), true);
    assert.equal(await sections().locator("button").count(), 3);
    await page
      .getByRole("button", { name: selectedFund.label, exact: true })
      .click();
    const panel = page.locator('aside[aria-labelledby="trust-fund-title"]');
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
    await common
      .getByRole("button", { name: selectedFund.label, exact: true })
      .waitFor();
    assert.equal(await sections().locator("button").count(), 1);
    assert.equal(
      (await page.locator("dl dd").innerText()).trim(),
      formatBudget(selectedFund.amount),
    );
    await search.fill("");
    const legacySourceNotes = page
      .locator("summary")
      .filter({ hasText: /^Data for selected year$/ });
    if (await legacySourceNotes.count()) await legacySourceNotes.click();
    await page
      .locator("summary")
      .filter({ hasText: /^Funds with zero or negative expenditure$/ })
      .click();
    const nonpositive = funds.find((fund) => fund.amount <= 0);
    await page
      .getByRole("button")
      .filter({ hasText: nonpositive.label })
      .click();
    await panel.waitFor();
    assert.equal(
      decodeURIComponent(new URL(page.url()).hash.split("=")[1]),
      nonpositive.id,
    );
    await page.keyboard.press("Escape");
    const pills = page.locator('[aria-label="Schedule groups"] button');
    for (const pill of await pills.all()) await pill.click();
    await page
      .getByText("Select at least one schedule group.", { exact: true })
      .waitFor();
    assert.equal((await page.locator("dl dd").innerText()).trim(), "$0");
    for (const pill of await pills.all()) await pill.click();
    // The annual heading follows the selected year, even for the same fund ID.
    await search.fill("SIM");
    const slider = page.getByRole("slider", { name: "Select year" });
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
