import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const contributorUrl = `${portalUrl}/secretariat/trust-funds/contributors/#trust-fund-contributor=Germany`;
  await page.goto(contributorUrl, { waitUntil: "networkidle" });
  const contributor = page.getByRole("dialog", {
    name: "Germany",
    exact: true,
  });
  await contributor.waitFor();

  // Exercise two offices and browser Back to cover navigation across tabs.
  for (const [code, name] of [
    ["DPO", "Department of Peace Operations"],
    ["OCHA", "Office for the Coordination of Humanitarian Affairs"],
  ]) {
    const office = contributor.getByRole("button", {
      name: new RegExp(name),
    });
    await office.click();
    const link = office.locator("../..").getByRole("link", {
      name: "Open office details",
      exact: true,
    });
    const hash = `#trust-fund=${encodeURIComponent(`trust-fund-entity:${code}`)}`;
    assert.equal(
      await link.getAttribute("href"),
      `${new URL(portalUrl).pathname.replace(/\/$/, "")}/secretariat/trust-funds/${hash}`,
    );
    await link.click();
    await page.waitForURL(
      (url) =>
        url.pathname.endsWith("/secretariat/trust-funds/") && url.hash === hash,
    );
    await page.getByRole("dialog", { name, exact: true }).waitFor();
    assert.equal(await contributor.count(), 0);

    // A copied link must also resolve the office on a fresh page load.
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("dialog", { name, exact: true }).waitFor();
    await page.goBack({ waitUntil: "networkidle" });
    await contributor.waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Trust-fund office links open the matching office; reload and Back pass",
  );
} finally {
  await browser.close();
}
