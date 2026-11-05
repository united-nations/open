import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import profiles from "../../config/features.json" with { type: "json" };
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const results = [];
  const open = async (route, hash) => {
    await page.goto("about:blank");
    await page.goto(`${portalUrl}/system/${route}/#${hash}`, {
      waitUntil: "networkidle",
    });
    const dialog = page.getByRole("dialog").first();
    await dialog.waitFor();
    return dialog;
  };
  const choose = async (dialog, year) => {
    await dialog
      .getByRole("button", { name: "Select year", exact: true })
      .click();
    await page.getByRole("button", { name: String(year), exact: true }).click();
  };
  const waitForExpenditure = async (value) => {
    await page.waitForFunction(
      (expected) =>
        new RegExp(`Total expenditure\\s+${expected}`).test(
          document.querySelector('[role="dialog"]')?.innerText ?? "",
        ),
      value,
    );
  };

  for (const { route, hash, year, file, key, id, row } of [
    {
      route: "locations",
      hash: "country=FIN",
      year: 2015,
      file: "country-expenses",
      key: "iso3",
      id: "FIN",
      row: { iso3: "FIN", name: "Finland", total: 0, entities: {} },
    },
    {
      route: "organizations",
      hash: "entity=IRMCT",
      year: 2021,
      file: "entity-spending",
      key: "entity",
      id: "IRMCT",
      row: { entity: "IRMCT", amount: 0, source: "CEB" },
    },
  ]) {
    let dialog = await open(route, hash);
    await choose(dialog, year);
    await dialog
      .getByText(/Expenditure data unavailable for this .* and year\./)
      .waitFor();
    assert.match(await dialog.innerText(), /Total expenditure\s+Unavailable/);
    if (route === "locations")
      assert.match(await dialog.innerText(), /Entities active\s+—/);
    results.push(`${route}: absent observation remains unavailable`);
    await page.screenshot({
      path: `audits/browser/integrity-${route}-missing.png`,
    });

    const target = `**/data/${file}-${year}.json`;
    const raw = JSON.parse(
      fs.readFileSync(`public/data/${file}-${year}.json`, "utf8"),
    );
    assert.equal(
      raw.some((item) => item[key] === id),
      false,
      "The real absent-record regression must remain absent in the source export",
    );
    await page.route(target, (route) => route.fulfill({ json: [...raw, row] }));
    dialog = await open(route, hash);
    await choose(dialog, year);
    await waitForExpenditure("\\$0");
    assert.doesNotMatch(
      await dialog.innerText(),
      /Expenditure data unavailable/,
    );
    if (route === "locations")
      assert.match(await dialog.innerText(), /Entities active\s+0/);
    results.push(`${route}: explicitly reported zero remains zero`);
    await page.unroute(target);
  }

  await page.goto(`${portalUrl}/system/locations/`, {
    waitUntil: "networkidle",
  });
  const slider = page.getByRole("slider").first();
  while (Number(await slider.getAttribute("aria-valuenow")) > 2022) {
    const before = await slider.getAttribute("aria-valuenow");
    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(
      (old) =>
        document
          .querySelector('[role="slider"]')
          ?.getAttribute("aria-valuenow") !== old,
      before,
    );
  }
  await page.getByText("Chart", { exact: true }).click();
  await page
    .getByText(/^Unresolved geographic classification/)
    .first()
    .waitFor();
  await page.screenshot({
    path: "audits/browser/integrity-geography-2022.png",
    fullPage: true,
  });
  results.push(
    "Locations: conflicting country regions have an explicit unresolved group",
  );

  if (profiles[process.env.SITE_VARIANT ?? "public"].uninfo) {
    const dialog = await open("locations", "country=LBN");
    await choose(dialog, 2024);
    const unclassified = dialog.locator('[data-uninfo-sdg="unclassified"]');
    await unclassified.waitFor();
    assert.match(await unclassified.innerText(), /Not classified by SDG/);
    assert.equal(await unclassified.locator("button, a").count(), 0);
    assert.equal(await unclassified.getAttribute("role"), null);
    const metrics = await unclassified
      .locator("[data-resource]")
      .evaluateAll((elements) =>
        Object.fromEntries(
          elements.map((element) => [
            element.dataset.resource,
            Number(element.dataset.value),
          ]),
        ),
      );
    assert.equal(metrics.Required, 147216042);
    await unclassified.click();
    assert.equal(new URL(page.url()).hash, "#country=LBN");
    assert.doesNotMatch(await dialog.innerText(), /NaN|undefined/);
    results.push(
      "UNINFO: unclassified resources are visible without a numbered-goal link",
    );
    await page.screenshot({
      path: "audits/browser/integrity-uninfo-unclassified.png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await unclassified.scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: "audits/browser/integrity-uninfo-unclassified-mobile.png",
    });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/data-integrity-fixes.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
