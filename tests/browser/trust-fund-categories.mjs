import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moduleAt } from "../../src/lib/tests/moduleAt.mjs";

const { formatBudget } = await moduleAt(
  "node_modules/@un-eosg/ui/lib/format-budget.ts",
);
const data = JSON.parse(
  fs.readFileSync("public/data/trust-fund-contributors-2025.json"),
);
const route = `${portalUrl}/secretariat/trust-funds/contributors/`;
const browser = await chromium.launch(browserOptions);
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route);
    await page.getByRole("searchbox").fill("Germany");
    await page
      .getByRole("region", { name: "Government", exact: true })
      .getByRole("button", { name: "Germany", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("region", { name: "Others", exact: true })
        .getByRole("button", { name: "Germany", exact: true })
        .count(),
      0,
      "Source Government rows must not create a second Germany tile in Others",
    );
    const germany = data.contributors.find((item) => item.name === "Germany");
    assert.ok(germany.flows.some((flow) => flow.group === "governments"));
    assert.ok(!germany.flows.some((flow) => flow.group === "other"));

    // The real 2025 unknown-category observations are negative OUN refunds.
    // Their category still has a legend control, without artificial chart area.
    const legend = page.getByRole("group", { name: "Contributor groups" });
    await legend
      .getByRole("button", { name: "Category not reported", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("region", { name: "Category not reported", exact: true })
        .count(),
      0,
    );
    const named = data.contributors.find((item) =>
      item.flows.some((flow) => flow.group === "category_unknown"),
    );
    assert.ok(named && named.counterparty_group !== "Unspecified");
    await page.goto(
      `${route}#trust-fund-contributor=${encodeURIComponent(named.name)}`,
    );
    const panel = page.getByRole("dialog", { name: named.name, exact: true });
    await panel.getByText("Category not reported", { exact: true }).waitFor();
    await panel
      .getByText(
        "The source names these contributors without reporting a contributor category.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await panel
        .getByText(/Schedule 8\.1 reports voluntary contributions/)
        .count(),
      0,
      "A named contributor with an unknown category must keep the ordinary contributor sidebar",
    );
    const unknown = named.flows.find(
      (flow) => flow.group === "category_unknown",
    );
    await panel
      .getByText(formatBudget(unknown.amount_usd), { exact: true })
      .first()
      .waitFor();
    assert.deepEqual(errors, []);
    await page.close();

    // A bounded fixture exercises positive unknown-category tiles and signed
    // filtering, which the retained sources currently do not contain.
    const fixturePage = await browser.newPage({
      viewport: { width, height: 1000 },
    });
    const fixtureErrors = [];
    fixturePage.on("pageerror", (error) => fixtureErrors.push(error.message));
    const contributor = (name, group, amount, counterpartyGroup = "Mixed") => ({
      name,
      counterparty_group: counterpartyGroup,
      amount_usd: amount,
      positive_amount_usd: Math.max(0, amount),
      negative_amount_usd: Math.min(0, amount),
      reported_names: [name],
      destinations: [],
      flows: [
        {
          group,
          type: "voluntary_contribution",
          label:
            group === "category_unknown"
              ? "Category not reported"
              : "Voluntary contributions",
          amount_usd: amount,
          supportingSources: [],
        },
      ],
    });
    const fixture = {
      ...data,
      contributors: [
        contributor(
          "Named government contributor",
          "governments",
          2000,
          "Government",
        ),
        contributor(
          "Named contributor without category",
          "category_unknown",
          1000,
        ),
        contributor("Named refund without category", "category_unknown", -100),
        contributor(
          "MPTF voluntary contributions",
          "unitemized",
          3000,
          "Unspecified",
        ),
      ],
    };
    await fixturePage.route(
      "**/data/trust-fund-contributors-2025.json",
      (request) => request.fulfill({ json: fixture }),
    );
    await fixturePage.goto(route);
    const unknownRegion = fixturePage.getByRole("region", {
      name: "Category not reported",
      exact: true,
    });
    await unknownRegion
      .getByRole("button", {
        name: "Named contributor without category",
        exact: true,
      })
      .waitFor();
    assert.equal(await unknownRegion.getByRole("button").count(), 1);
    const unspecifiedRegion = fixturePage.getByRole("region", {
      name: "Contributors unspecified",
      exact: true,
    });
    await unspecifiedRegion
      .getByRole("button", {
        name: "MPTF voluntary contributions",
        exact: true,
      })
      .waitFor();
    const total = fixturePage.locator("dl dd");
    await total.getByText(formatBudget(5900), { exact: true }).waitFor();
    const unknownToggle = fixturePage
      .getByRole("group", { name: "Contributor groups" })
      .getByRole("button", { name: "Category not reported", exact: true });
    await unknownToggle.click();
    await total.getByText(formatBudget(5000), { exact: true }).waitFor();
    assert.equal(await unknownToggle.getAttribute("aria-pressed"), "false");
    await unspecifiedRegion
      .getByRole("button", {
        name: "MPTF voluntary contributions",
        exact: true,
      })
      .waitFor();
    await unknownToggle.click();
    await total.getByText(formatBudget(5900), { exact: true }).waitFor();
    assert.deepEqual(fixtureErrors, []);
    await fixturePage.close();
  }
  console.log(
    "Trust-fund categories: corrected Government rows, unknown named categories, signed filtering and unnamed MPTF separation passed.",
  );
} finally {
  await browser.close();
}
