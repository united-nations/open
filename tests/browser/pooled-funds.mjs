import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";
import profiles from "../../config/features.json" with { type: "json" };

const enabled = profiles[process.env.SITE_VARIANT ?? "public"].pooledFunds;
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${portalUrl}/`, { waitUntil: "networkidle" });
  const card = page.locator(
    'main a[href="/system/pooled-funds/"], main a[href="/system/pooled-funds"]',
  );
  assert.equal(await card.count(), enabled ? 1 : 0);
  if (enabled) {
    assert.match(
      await card.innerText(),
      /Contributors and recipients across the Multi-Partner Trust Fund Office portfolio/,
    );
    assert.equal(
      await card.locator('svg[viewBox^="0 0 320"]').count(),
      1,
      "Homepage card has a financial preview",
    );
  }
  await page.goto(`${portalUrl}/system/organizations/`, {
    waitUntil: "networkidle",
  });
  assert.equal(
    await page.getByRole("link", { name: "Pooled Funds", exact: true }).count(),
    enabled ? 1 : 0,
  );
  const response = await page.goto(
    `${portalUrl}/system/pooled-funds/?year=2024`,
    { waitUntil: "networkidle" },
  );
  assert.equal(response.status(), enabled ? 200 : 404);
  if (enabled) {
    await page
      .getByRole("heading", {
        name: "How do pooled funds support joint action?",
      })
      .waitFor();
    for (const label of ["Fund typology", "Fund for trends"]) {
      assert.equal(
        await page
          .getByRole("group", { name: label, exact: true })
          .locator("select")
          .count(),
        0,
        "Fund selectors use the established site components",
      );
    }
    await page
      .getByRole("radio", { name: "Deposits", exact: true })
      .locator("..")
      .hover();
    await page
      .getByRole("tooltip")
      .getByText(/Money paid into a fund/)
      .waitFor();
    await page.mouse.move(0, 0);
    assert.equal(
      await page
        .getByRole("slider", { includeHidden: true })
        .getAttribute("aria-valuenow"),
      "2024",
    );
    await page
      .getByRole("searchbox", { name: "Search pooled funds" })
      .fill("PB000");
    const tile = page
      .getByRole("button", { name: /Peacebuilding Fund/ })
      .first();
    await tile.waitFor();
    await page.evaluate(() => window.scrollTo(0, 200));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await tile.click();
    const dialog = page.getByRole("dialog", {
      name: "Peacebuilding Fund",
      exact: true,
    });
    await dialog.waitFor();
    await dialog
      .getByText("Annual financial figures", { exact: true })
      .waitFor();
    assert.match(await dialog.innerText(), /\$126M/);
    assert.match(await dialog.innerText(), /\$141M/);
    assert.match(await dialog.innerText(), /\$183M/);
    assert.ok(
      (await dialog.locator("[data-pooled-fund-description]").innerText())
        .length > 35,
    );
    assert.equal(
      await dialog.locator("select").count(),
      0,
      "Recipient measure uses the shared segmented control",
    );
    const numberStyle = await dialog
      .locator("[data-pooled-annual-figures] dd")
      .first()
      .evaluate((element) => ({
        size: getComputedStyle(element).fontSize,
        weight: getComputedStyle(element).fontWeight,
      }));
    assert.deepEqual(
      numberStyle,
      { size: "14px", weight: "400" },
      "Annual financial details use body-sized numbers",
    );
    await dialog
      .getByRole("button", { name: "About net transfers", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "About net transfers", exact: true })
      .getByText(/A transfer does not mean the money has been spent/)
      .waitFor();
    await dialog
      .getByRole("button", { name: "About net transfers", exact: true })
      .press("Escape");
    assert.ok(
      await dialog
        .getByRole("link", { name: /More about this fund on MPTF Gateway/ })
        .count(),
    );
    await dialog
      .getByRole("button", { name: "Close pooled fund details" })
      .click();
    assert.ok(
      Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore) < 2,
      "Opening and closing preserves page scroll",
    );
    await page
      .getByRole("radio", { name: "Expenditure", exact: true })
      .locator("..")
      .click();
    await page.getByRole("searchbox", { name: "Search pooled funds" }).fill("");
    await page
      .getByRole("radio", { name: "List", exact: true })
      .locator("..")
      .click();
    await page
      .getByRole("group", { name: "Ranked chart data", exact: true })
      .waitFor();
    // Fund search expands category groups; child choices support keyboard activation.
    const trendSelector = page.getByRole("group", {
      name: "Fund for trends",
      exact: true,
    });
    await trendSelector
      .getByRole("button", { name: "All funds", exact: true })
      .press("Enter");
    await page.getByPlaceholder("Search...", { exact: true }).fill("PB000");
    await page
      .getByRole("button", { name: "Peacebuilding Fund (PB000)", exact: true })
      .press("Enter");
    await trendSelector
      .getByRole("button", { name: "Peacebuilding Fund", exact: true })
      .waitFor();
    await page.screenshot({
      path: "audits/browser/pooled-funds.png",
      fullPage: true,
    });

    // Deep-linked fund year stays independent from page selection and survives history.
    await page.goto(
      `${portalUrl}/system/pooled-funds/?year=2023#fund=PB000%402024`,
      { waitUntil: "networkidle" },
    );
    await page
      .getByRole("dialog", { name: "Peacebuilding Fund", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("slider", { includeHidden: true })
        .getAttribute("aria-valuenow"),
      "2023",
    );
    assert.match(await page.getByRole("dialog").innerText(), /\$126M/);
    await page
      .getByRole("button", { name: "Close pooled fund details" })
      .click();
    await page.goto(
      `${portalUrl}/system/pooled-funds/?year=2015#fund=PB000%402015`,
      { waitUntil: "networkidle" },
    );
    assert.match(
      await page.getByRole("dialog").innerText(),
      /no reported observation for 2015/,
    );

    for (const [route, hash] of [
      ["contributors", "donor=Norway"],
      ["organizations", "entity=UNDP%402024"],
    ]) {
      await page.goto(`${portalUrl}/system/${route}/?year=2024#${hash}`, {
        waitUntil: "networkidle",
      });
      const section = page
        .getByRole("dialog")
        .locator("[data-pooled-funds-profile]");
      await section
        .getByRole("heading", { name: "Pooled funds", exact: true })
        .waitFor();
      await section
        .getByRole("heading", { name: "Funds", exact: true })
        .waitFor();
      const first = section.getByRole("button").first();
      await first.click();
      await page.waitForURL(/\/system\/pooled-funds\/\?year=2024#fund=/);
      await page.getByRole("dialog").waitFor();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${portalUrl}/system/pooled-funds/`, {
      waitUntil: "networkidle",
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "No mobile horizontal overflow",
    );
    await page.waitForTimeout(1500); // Recharts animates paths independently of CSS reduced motion.
    await page.screenshot({
      path: "audits/browser/pooled-funds-mobile.png",
      fullPage: true,
    });
    await page.goto(`${portalUrl}/about/`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("#pooled-funds-methodology").count(), 1);
  } else {
    await page.goto(
      `${portalUrl}/system/contributors/?year=2024#donor=Norway`,
      { waitUntil: "networkidle" },
    );
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.locator("[data-pooled-funds-profile]").count(), 0);
    assert.ok(
      !requests.some((url) => /\/data\/pooled-funds/.test(url)),
      "Disabled profile never requests MPTF data",
    );
    await page.goto(`${portalUrl}/about/`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("#pooled-funds-methodology").count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log(
    `Pooled funds: ${enabled ? "charts, financial figures, deep links, profiles and mobile layout" : "disabled route, navigation, sidebars and requests"} passed.`,
  );
} finally {
  await browser.close();
}
