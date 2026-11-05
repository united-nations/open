import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moduleAt } from "../../src/lib/tests/moduleAt.mjs";

const { formatBudget } = await moduleAt(
  "node_modules/@un-eosg/ui/lib/format-budget.ts",
);
const data = JSON.parse(
  fs.readFileSync("public/data/budget-trust-funds-2024.json"),
);
const funds = data.nodes.filter((node) => node.fundAccountType === "mptf");
const heading = funds[0].scheduleGroup.label;
const browser = await chromium.launch(browserOptions);
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${portalUrl}/secretariat/trust-funds/contributors/`);
    const unspecified = page.getByRole("region", {
      name: "Contributors unspecified",
      exact: true,
    });
    await unspecified
      .getByRole("button", {
        name: "MPTF voluntary contributions",
        exact: true,
      })
      .press("Enter");
    const contributions = page.getByRole("dialog", {
      name: "MPTF voluntary contributions",
      exact: true,
    });
    await contributions
      .getByText(/\$6 million transfer from the Peacebuilding Account/)
      .waitFor();
    await contributions
      .getByText(formatBudget(147355357), { exact: true })
      .first()
      .waitFor();
    await contributions
      .locator("summary")
      .filter({ hasText: "Source references" })
      .click();
    assert.ok(await contributions.locator('a[href$="#page=436"]').count());
    await page.goto(`${portalUrl}/secretariat/trust-funds/`);
    await page.getByRole("slider", { name: "Select year" }).press("ArrowLeft");
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
    const group = page.locator(`section[aria-label="${heading}"]`);
    await group.locator("button").first().waitFor();
    assert.equal(await group.locator("button").count(), 4);
    // Group-name search includes the signed amounts from the entire group.
    const search = page.getByRole("searchbox");
    await search.fill(heading);
    await page
      .locator("dl dd")
      .getByText(formatBudget(163733038), { exact: true })
      .waitFor();
    const peace = funds.find((node) => node.label === "UN Peacebuilding Fund");
    await group.getByRole("button", { name: peace.label, exact: true }).click();
    const panel = page.locator('aside[aria-labelledby="trust-fund-title"]');
    await panel.waitFor();
    await panel
      .getByText("Schedule 8.1 portfolio scope", { exact: true })
      .waitFor();
    await panel
      .getByText(
        "Schedule 8.1 reports aggregate contributions but does not name contributors.",
        { exact: true },
      )
      .waitFor();
    const position = panel.locator("[data-fund-position]");
    await position
      .getByText("Contributions receivable", { exact: true })
      .waitFor();
    assert.equal(
      await position.getByText("Total assets", { exact: true }).count(),
      0,
    );
    const disclosure = panel.locator("[data-expenditure-sources]");
    await disclosure.locator(":scope > summary").click();
    assert.ok(await disclosure.locator('a[href$="#page=431"]').count());
    await page.keyboard.press("Escape");
    await search.fill("");
    await page
      .getByRole("radio", { name: "By entity", exact: true })
      .locator("..")
      .click();
    await page.waitForTimeout(600); // Let the grouped layout transition finish.
    await page.getByRole("button", { name: peace.label, exact: true }).click();
    await panel.waitFor();
    assert.equal(
      decodeURIComponent(new URL(page.url()).hash.split("=")[1]),
      peace.id,
    );
    await page.keyboard.press("Escape");
    const negatives = page.locator(
      'details[aria-label="Funds with zero or negative expenditure"]',
    );
    await negatives.locator(":scope > summary").click();
    for (const fund of funds.filter((node) => node.amount <= 0)) {
      assert.equal(
        await negatives
          .getByRole("button")
          .filter({ hasText: fund.label })
          .count(),
        1,
      );
    }
    const haiti = funds.find((node) =>
      node.id.endsWith("mptf:haiti-cholera-response-fund"),
    );
    await negatives
      .getByRole("button")
      .filter({ hasText: haiti.label })
      .click();
    await panel.waitFor();
    assert.equal(
      decodeURIComponent(new URL(page.url()).hash.split("=")[1]),
      haiti.id,
    );
    assert.ok((await panel.innerText()).includes(formatBudget(haiti.amount)));
    const history = panel.getByRole("table", {
      name: /Fund expenditure history/,
    });
    await history.waitFor();
    assert.ok(
      (
        await history
          .locator("tbody tr")
          .filter({ hasText: "2024" })
          .innerText()
      ).includes(formatBudget(haiti.amount)),
    );
    // Mixed OCHA sidebars include MPTF expense evidence and a partial donor warning.
    await page.goto(
      `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent("trust-fund-entity:OCHA")}`,
    );
    await panel.waitFor();
    await panel
      .getByText(/Contributor detail below covers the other funds only/)
      .waitFor();
    await panel.locator("[data-expenditure-sources] > summary").click();
    assert.ok(
      await panel
        .locator('[data-expenditure-sources] a[href$="#page=431"]')
        .count(),
    );
    const spotlight = funds.find((node) =>
      node.id.endsWith("mptf:spotlight-initiative-2-0-fund"),
    );
    await page.goto(
      `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent(spotlight.id)}`,
    );
    await panel
      .getByRole("heading", { name: spotlight.label, exact: true })
      .waitFor();
    await history.waitFor();
    for (let year = 2017; year < 2024; year++) {
      const row = history.locator("tbody tr").filter({ hasText: String(year) });
      assert.equal(await row.locator("td").first().innerText(), "Unavailable");
    }
    assert.deepEqual(errors, []);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log(
      `PASS ${width}px: MPTF group search, signed totals, both grouping views, row citations, balance scope, contributor limits and negative accounts`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
