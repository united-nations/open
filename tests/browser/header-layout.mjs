import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(portalUrl + "/secretariat/peacekeeping-budget/", {
    waitUntil: "networkidle",
  });
  for (const width of [1440, 1280, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    const headerHeight = await page
      .locator("header")
      .evaluate((header) => header.getBoundingClientRect().height);
    const declaredHeaderHeight = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--site-header-height",
        ),
      ),
    );
    assert.ok(
      headerHeight >= 40,
      `Header contains its emblem-height content row at ${width}`,
    );
    assert.ok(
      Math.abs(headerHeight - declaredHeaderHeight) < 1,
      `Sticky offsets follow the measured shared header height at ${width}`,
    );
    const headingPadding = await page
      .locator("main h2")
      .first()
      .evaluate((heading) =>
        parseFloat(getComputedStyle(heading.parentElement).paddingTop),
      );
    assert.ok(
      headingPadding >= 32,
      `Heading top padding at ${width}: ${headingPadding}`,
    );
    if (width >= 1024) {
      const header = await page.locator("header").boundingBox();
      const active = await page
        .locator('header nav a[aria-current="page"]')
        .boundingBox();
      assert.ok(
        Math.abs(header.y + header.height - active.y - active.height - 1) < 1,
        `Underline must meet header border at ${width}`,
      );
    }
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(100);
    const boxes = await page.evaluate(() =>
      [
        document.querySelector("header"),
        ...Array.from(document.querySelectorAll("main nav"))
          .slice(0, 2)
          .map((nav) => nav.parentElement),
      ].map((element) => {
        const { top, bottom } = element.getBoundingClientRect();
        return { top, bottom };
      }),
    );
    assert.equal(boxes.length, 3);
    assert.ok(Math.abs(boxes[0].top) < 1, "Site header remains sticky");
    for (let index = 1; index < boxes.length; index++) {
      assert.ok(
        Math.abs(boxes[index].top - boxes[index - 1].bottom) < 1,
        `Sticky navigation must neither overlap nor leave gaps at ${width}: ${JSON.stringify(boxes)}`,
      );
    }
  }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "audits/browser/header-layout.png" });
  console.log(
    "Header underlines, heading spacing and stacked sticky navigation pass at desktop and mobile widths, including resize",
  );
} finally {
  await browser.close();
}
