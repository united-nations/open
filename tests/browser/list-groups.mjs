import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const rows = page.locator("[data-ranked-list-item]");
  const groups = page.locator("[data-ranked-list-group-heading]");
  const subgroups = page.locator("[data-ranked-list-subgroup-heading]");
  const controlledContent = async (button) => {
    const id = await button.getAttribute("aria-controls");
    assert.ok(id, "Disclosure buttons identify their controlled content");
    return page.locator(`[id="${id}"]`);
  };
  const remaining = async () => {
    const more = page.getByRole("button", { name: /^Show more/ });
    if (!(await more.count())) return 0;
    return Number((await more.innerText()).match(/\((\d+) remaining\)/)[1]);
  };
  const openList = async (route) => {
    await page.goto(`${portalUrl}${route}`, { waitUntil: "networkidle" });
    await page
      .getByRole("radio", { name: "List", exact: true })
      .first()
      .locator("..")
      .click();
    await rows.first().waitFor();
  };

  await openList("/system/organizations/");
  const group = groups.first();
  assert.equal(await group.getAttribute("aria-expanded"), "true");
  const content = await controlledContent(group);
  const members = await content.locator("[data-ranked-list-item]").count();
  const total = (await rows.count()) + (await remaining());
  assert.equal(await rows.count(), 20, "Initial pagination stays unchanged");

  await group.focus();
  await page.keyboard.press("Enter");
  assert.equal(await group.getAttribute("aria-expanded"), "false");
  assert.equal(await content.isVisible(), false);
  assert.equal(
    (await rows.count()) + (await remaining()),
    total - members,
    "Collapsed groups do not consume pages or inflate remaining counts",
  );
  assert.equal(
    await rows.count(),
    Math.min(20, total - members),
    "Collapsing a group reveals later rows",
  );
  assert.equal(
    await group.evaluate((button) => button === document.activeElement),
    true,
  );

  await page.keyboard.press("Space");
  assert.equal(await group.getAttribute("aria-expanded"), "true");
  assert.equal(await content.isVisible(), true);
  await page.getByRole("button", { name: /^Show more/ }).click();
  assert.equal(await rows.count(), Math.min(40, total));
  await page.getByRole("button", { name: "Show less", exact: true }).click();
  assert.equal(await rows.count(), 20);

  await group.click();
  await page.getByPlaceholder("Search entities...").fill("UNICEF");
  assert.equal(await groups.first().getAttribute("aria-expanded"), "true");
  assert.equal(
    await rows.count(),
    1,
    "Search reveals a collapsed group's match",
  );
  assert.match(await rows.first().innerText(), /UNICEF/);

  await openList("/system/locations/");
  const parent = groups.first();
  const subgroup = subgroups.first();
  await subgroup.waitFor();
  const subgroupContent = await controlledContent(subgroup);
  await subgroup.click();
  assert.equal(await subgroup.getAttribute("aria-expanded"), "false");
  assert.equal(await subgroupContent.isVisible(), false);
  assert.equal(await parent.getAttribute("aria-expanded"), "true");
  await parent.click();
  await parent.click();
  assert.equal(
    await subgroup.getAttribute("aria-expanded"),
    "false",
    "Reopening a parent preserves its subgroup's collapsed state",
  );
  await subgroup.click();
  assert.equal(await subgroupContent.isVisible(), true);

  await page.setViewportSize({ width: 390, height: 1000 });
  await subgroup.click();
  assert.equal(await subgroup.getAttribute("aria-expanded"), "false");
  assert.ok((await subgroup.boundingBox()).height >= 44);
  assert.ok((await parent.boundingBox()).height >= 44);
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.mouse.move(0, 0);
  await page.screenshot({ path: "audits/browser/list-groups-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "List group disclosures, pagination, search, keyboard and mobile checks passed",
  );
} finally {
  await browser.close();
}
