import assert from "node:assert/strict";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const flags = profiles[process.env.SITE_VARIANT ?? "public"];
if (flags.portal) {
  const browser = await chromium.launch(browserOptions);
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    async function checkPreview(container) {
      const more = container
        .getByRole("button", { name: "Show more", exact: true })
        .first();
      await more.waitFor();
      assert.equal(await more.getAttribute("aria-expanded"), "false");
      const contentId = await more.getAttribute("aria-controls");
      const content = page.locator(`[id="${contentId}"]`);
      const height = await content.evaluate((element) => element.clientHeight);
      assert.ok(
        await content.evaluate(
          (element) => element.scrollHeight > element.clientHeight,
        ),
      );
      await more.focus();
      await page.keyboard.press("Enter");
      const less = container
        .getByRole("button", { name: "Show less", exact: true })
        .first();
      assert.equal(await less.getAttribute("aria-expanded"), "true");
      assert.ok(
        (await content.evaluate((element) => element.clientHeight)) > height,
      );
      await less.click();
      assert.equal(await more.getAttribute("aria-expanded"), "false");
      assert.equal(
        await content.evaluate((element) => element.clientHeight),
        height,
      );
      return { content, more };
    }

    if (flags.trustFunds) {
      for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(
          `${portalUrl}/secretariat/trust-funds/#trust-fund=${encodeURIComponent("trust-fund-entity:OCHA:fund:DDN")}`,
          { waitUntil: "networkidle" },
        );
        const dialog = page.getByRole("dialog", {
          name: /Trust Fund for the Strengthening/,
        });
        const { content, more } = await checkPreview(dialog);
        await more.click();
        assert.equal(await content.locator("ol li").count(), 3);
        const citation = content.getByRole("link", {
          name: "General Assembly Resolution 3243 (XXIX)",
          exact: true,
        });
        assert.equal(
          await citation.getAttribute("href"),
          "https://docs.un.org/A/RES/3243(XXIX)",
        );
        await dialog
          .getByRole("button", { name: "Show less", exact: true })
          .click();
        // A link reached by keyboard must never remain clipped out of view.
        await citation.focus();
        await dialog
          .getByRole("button", { name: "Show less", exact: true })
          .waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await dialog
          .getByRole("button", { name: "Show less", exact: true })
          .click();
        await page.screenshot({
          path: `audits/browser/sidebar-text-${viewport.width}.png`,
        });
        await more.click();
        await dialog
          .getByRole("button", { name: "Close fund details", exact: true })
          .click();
        await page.evaluate(() => {
          window.location.hash =
            "trust-fund=trust-fund-entity%3ADPO%3Afund%3ACPK";
        });
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Show more", exact: true })
          .waitFor();
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${portalUrl}/system/organizations/#entity=UNCDF`, {
      waitUntil: "networkidle",
    });
    await checkPreview(page.getByRole("dialog").first());

    if (flags.pooledFunds) {
      await page.goto(`${portalUrl}/system/pooled-funds/#fund=PB000%402024`, {
        waitUntil: "networkidle",
      });
      const description = page.locator("[data-pooled-fund-description]");
      await description.waitFor();
      const section = description.locator("../../..");
      assert.equal(
        await section
          .getByRole("button", { name: "Show more", exact: true })
          .count(),
        0,
        "Short descriptions need no expansion control",
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Sidebar text: responsive previews, rich text, keyboard expansion, reset and short descriptions passed.",
    );
  } finally {
    await browser.close();
  }
}
