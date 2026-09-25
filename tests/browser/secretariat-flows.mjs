import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch(browserOptions);
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(portalUrl + "/secretariat/", { waitUntil: "networkidle" });
  const section = page.locator("#secretariat-flows");
  await section
    .getByRole("heading", { name: "Funding flows", exact: true })
    .waitFor();
  assert.doesNotMatch(
    await page.locator("body").innerText(),
    /You can also dive deeper/,
  );
  assert.equal(await section.getByRole("textbox").count(), 0);
  assert.equal(await section.getByRole("checkbox").count(), 0);
  assert.equal(
    await section.getByRole("button", { name: /^(RB|OA|XB)$/ }).count(),
    0,
  );
  const total = await section
    .getByText("Total expenditure", { exact: true })
    .locator("..")
    .innerText();
  const generic = section.getByRole("button", {
    name: /^Unitemized extrabudgetary resources:/,
  });
  assert.equal(await generic.count(), 0);
  for (const code of ["ITC", "UN-Habitat", "UNEP", "UNODC"]) {
    assert.equal(
      await section
        .getByRole("button", {
          name: new RegExp(`^${code} XB:`),
        })
        .count(),
      1,
    );
  }
  assert.equal(
    await section
      .getByText("Total expenditure", { exact: true })
      .locator("..")
      .innerText(),
    total,
  );
  await section
    .getByRole("button", {
      name: /^UNEP XB:/,
    })
    .locator("rect")
    .first()
    .click();
  await section
    .getByRole("button", { name: "Clear selection", exact: true })
    .waitFor();
  await section
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await section.getByRole("button", { name: /^Source:/ }).click();
  assert.match(
    await section.innerText(),
    /Net expenditure.*Positive flows.*Signed adjustments/s,
  );
  await section.getByRole("button", { name: /^Source:/ }).click();
  await page.evaluate(() => {
    window.savedFlows = document.querySelector("#secretariat-flows svg");
  });
  await page.route("**/secretariat-overview-2024.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await section.getByRole("slider").press("ArrowLeft");
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(
      () =>
        window.savedFlows === document.querySelector("#secretariat-flows svg"),
    ),
    true,
  );
  assert.match(await section.innerText(), /showing 2025 until ready/);
  await page.waitForTimeout(1200);
  assert.doesNotMatch(await section.innerText(), /until ready/);
  await section.screenshot({ path: "audits/browser/secretariat-flows.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await section.screenshot({
    path: "audits/browser/secretariat-flows-mobile.png",
  });
  assert.deepEqual(errors, []);
  console.log(
    "Secretariat flows: simplified controls, expansion, preserved total, pinned details, source disclosure and stable loading passed",
  );
} finally {
  await browser.close();
}
