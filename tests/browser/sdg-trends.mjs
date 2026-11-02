import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/system/goals/`, { waitUntil: "networkidle" });
  const chart = page.locator('section[aria-labelledby="sdg-trends-heading"]');
  await chart.evaluate((node) => node.scrollIntoView());
  await page.waitForTimeout(1700);
  assert.deepEqual(await chart.getByRole("button").allTextContents(), [
    ...Array.from({ length: 17 }, (_, index) => String(index + 1)),
    "Non-SDG",
    "Not specified",
  ]);
  const paths = () =>
    chart
      .locator(".recharts-area-curve")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
  const original = await paths();
  assert.equal(original.length, 19);
  const goal = chart.getByRole("button", { name: "2", exact: true });
  await goal.click();
  await page.waitForTimeout(1700);
  assert.equal((await paths()).length, 18);
  await goal.click();
  await page.waitForTimeout(1700);
  assert.deepEqual(
    await paths(),
    original,
    "Restoring a goal preserves stack order",
  );
  await chart.getByRole("button", { name: "1", exact: true }).hover();
  await page.getByRole("tooltip").first().waitFor();
  assert.match(
    await page.getByRole("tooltip").first().innerText(),
    /No Poverty/,
  );

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 390, height: 667 },
    { width: 390, height: 568 },
  ]) {
    await page.mouse.move(0, 0);
    await page.setViewportSize(viewport);
    await chart.evaluate((node) => node.scrollIntoView());
    await page.waitForTimeout(300);
    const plot = await chart.locator(".recharts-wrapper").boundingBox();
    assert.ok(plot);
    await page.mouse.move(plot.x + (plot.width * 6) / 7, plot.y + 80);
    const details = chart.getByRole("region", {
      name: "Annual expenditure details",
    });
    await details.waitFor({ state: "visible" });
    await page.waitForTimeout(300);
    const bounds = await details.boundingBox();
    assert.ok(bounds);
    assert.ok(
      bounds.x >= 15 && bounds.y >= 15,
      "Tooltip stays inside viewport",
    );
    assert.ok(bounds.x + bounds.width <= viewport.width - 15);
    assert.ok(bounds.y + bounds.height <= viewport.height - 15);
    assert.match(await details.innerText(), /Not specified/);
    await details.hover();
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(300);
    const scroll = await details.evaluate((node) => ({
      top: node.scrollTop,
      maximum: node.scrollHeight - node.clientHeight,
    }));
    assert.ok(
      Math.abs(scroll.top - scroll.maximum) <= 1,
      "All tooltip rows can be reached",
    );
    assert.ok(await details.isVisible(), "Tooltip stays open while scrolling");
    const lastRow = await details
      .getByText("Not specified", { exact: true })
      .boundingBox();
    assert.ok(
      lastRow && lastRow.y + lastRow.height <= bounds.y + bounds.height + 1,
    );
    await details.focus();
    await page.waitForTimeout(100);
    assert.ok(
      await details.evaluate((node) => node === document.activeElement),
      "Tooltip retains keyboard focus when held",
    );
    await page.keyboard.press("Home");
    await page.waitForTimeout(300);
    assert.equal(await details.evaluate((node) => node.scrollTop), 0);
    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    assert.ok(
      await details.evaluate(
        (node) =>
          node === document.activeElement &&
          Math.abs(node.scrollTop - (node.scrollHeight - node.clientHeight)) <=
            1,
      ),
      "Keyboard can reach the final tooltip row without losing focus",
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "SDG trends: numbered filters, hover names, stable stack order, viewport bounds and scrollable details passed",
  );
} finally {
  await browser.close();
}
