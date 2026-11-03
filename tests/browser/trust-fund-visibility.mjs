import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const flags = profiles[process.env.SITE_VARIANT ?? "public"];
if (flags.trustFunds && !flags.additionalTrustFunds) {
  const browser = await chromium.launch(browserOptions);
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    const data = JSON.parse(
      fs.readFileSync("public/data/budget-trust-funds-2024.json", "utf8"),
    );
    const control = data.meta.sourceGroups.find(
      (group) => group.id === "volume_i",
    ).amount;
    const compactUSD = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    });
    for (const suffix of ["", "contributors/"]) {
      await page.goto(`${portalUrl}/secretariat/trust-funds/${suffix}`, {
        waitUntil: "networkidle",
      });
      for (const entity of ["UNEP", "UNODC", "UN-Habitat", "ITC"]) {
        const link = page.getByRole("link", { name: entity, exact: true });
        assert.equal(await link.count(), 1);
        assert.match(
          await link.getAttribute("href"),
          /^https:\/\/digitallibrary\.un\.org\/record\/.*\.pdf/,
        );
      }
      assert.equal(
        await page
          .getByRole("group", { name: "Reporting source", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("group", {
            name: "Contributor reporting source",
            exact: true,
          })
          .count(),
        0,
      );
      if (!suffix) {
        const summary = page.locator("dl").filter({
          has: page
            .locator("dt")
            .getByText("Reported expenditure (unconsolidated)", {
              exact: true,
            }),
        });
        await summary
          .locator("dd")
          .getByText(compactUSD.format(control), { exact: true })
          .waitFor();
      } else {
        await page.getByRole("slider").waitFor();
      }
    }
    const fund = data.nodes.find(
      (node) =>
        node.sourceGroup === "volume_i" &&
        node.tier === "detail" &&
        node.code === "DSA",
    );
    await page.goto(
      `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent(fund.id)}`,
      { waitUntil: "networkidle" },
    );
    const fundSidebar = page.getByRole("dialog", {
      name: fund.label,
      exact: true,
    });
    await fundSidebar.waitFor();
    assert.equal(
      (await fundSidebar.locator("[data-fund-description]").textContent())
        .trim()
        .replace(/\s+/g, " "),
      fund.description,
    );
    await fundSidebar.getByText(fund.code, { exact: true }).first().waitFor();
    await fundSidebar.locator("[data-expenditure-sources] > summary").click();
    for (const source of fund.descriptionSources) {
      assert.ok(
        (await fundSidebar
          .locator(
            `[data-expenditure-sources] a[href$="#page=${source.pdfPage}"]`,
          )
          .count()) > 0,
      );
    }
    await fundSidebar
      .getByRole("button", { name: "Select year", exact: true })
      .click();
    await page.getByRole("button", { name: "2023", exact: true }).click();
    const earlier = JSON.parse(
      fs.readFileSync("public/data/budget-trust-funds-2023.json", "utf8"),
    ).nodes.find((node) => node.id === fund.id);
    await page.waitForFunction(
      (description) =>
        document
          .querySelector("[data-fund-description]")
          ?.textContent.trim()
          .replace(/\s+/g, " ") === description,
      earlier.description,
    );
    await page.keyboard.press("Escape");
    const listedFund = data.nodes.find(
      (node) => node.code === "IHA" && node.tier === "detail",
    );
    await page.goto(`${portalUrl}/secretariat/trust-funds/`, {
      waitUntil: "networkidle",
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.goto(
      `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent(listedFund.id)}`,
    );
    const listDescription = page
      .getByRole("dialog", { name: listedFund.label, exact: true })
      .locator("[data-fund-description]");
    await listDescription.waitFor();
    const listedSidebar = page.getByRole("dialog", {
      name: listedFund.label,
      exact: true,
    });
    assert.equal(
      await listedSidebar
        .getByRole("heading", { name: "About this fund" })
        .count(),
      0,
    );
    const descriptionBounds = await listDescription.boundingBox();
    const financialBounds = await listedSidebar
      .getByText("Total expenditure", { exact: true })
      .first()
      .boundingBox();
    assert.ok(
      descriptionBounds.y + descriptionBounds.height <= financialBounds.y,
    );
    assert.equal(await listDescription.locator("ol li").count(), 2);
    assert.deepEqual(
      (await listDescription.locator("ol li").allTextContents()).map((text) =>
        text.trim().replace(/\s+/g, " "),
      ),
      listedFund.descriptionBlocks
        .find((block) => block.type === "list")
        .items.map((item) => `(${item.label}) ${item.text}`),
    );
    assert.equal(
      await listDescription
        .getByRole("link", {
          name: "General Assembly Resolution 40/131",
          exact: true,
        })
        .getAttribute("href"),
      "https://docs.un.org/A/RES/40/131",
    );
    assert.equal(
      await listDescription
        .locator("a")
        .first()
        .evaluate((link) => getComputedStyle(link).color),
      "rgb(0, 119, 184)",
    );
    await page.keyboard.press("Escape");
    await page.goto(
      `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent("xb-entity:UNEP")}`,
      { waitUntil: "networkidle" },
    );
    await page
      .locator("dl")
      .filter({
        has: page
          .locator("dt")
          .getByText("Reported expenditure (unconsolidated)", { exact: true }),
      })
      .locator("dd")
      .getByText(compactUSD.format(control), { exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "Disabled entity deep links cannot expose an additional report",
    );
    assert.ok(
      !requests.some((url) =>
        url.includes("/data/secretariat-xb-contributors.json"),
      ),
    );
    await page.goto(portalUrl, { waitUntil: "networkidle" });
    const card = page
      .locator(
        'a[href$="/secretariat/trust-funds"], a[href$="/secretariat/trust-funds/"]',
      )
      .filter({ has: page.locator('svg[viewBox="0 0 320 168"]') });
    assert.equal(await card.count(), 1);
    const fills = await card
      .locator('rect:not([fill="none"])')
      .evaluateAll((rects) => [
        ...new Set(rects.map((rect) => rect.getAttribute("fill"))),
      ]);
    assert.equal(
      fills.length,
      1,
      "Homepage preview also excludes separately reported entities",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Trust Funds: Volume I total, hidden additional-source controls and deep links, four introductory report links, and contributor scope pass.",
    );
  } finally {
    await browser.close();
  }
} else {
  console.log(
    "Schedule-only visibility checks do not apply to this feature profile.",
  );
}
