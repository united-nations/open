import assert from "node:assert/strict";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/system/contributors/assessments/`, {
    waitUntil: "networkidle",
  });
  const chart = page.getByRole("region", {
    name: "Reported outstanding assessments",
    exact: true,
  });
  const years = chart.getByRole("combobox", { name: "Select year from list" });
  await years.selectOption("2024");
  const balances = chart.getByRole("list", {
    name: "Reported outstanding balances in 2024",
    exact: true,
  });
  const row = balances.getByRole("button", { name: /^PAHO:/ });
  await row.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  await row.click();
  const dialog = page.getByRole("dialog");
  const outstanding = dialog.getByRole("region", {
    name: "Outstanding assessments",
    exact: true,
  });
  await outstanding
    .getByText("Reported outstanding balance", { exact: true })
    .waitFor();
  assert.match(await outstanding.innerText(), /\$50\.6/);
  assert.equal(
    await dialog
      .getByRole("button", { name: "Select year", exact: true })
      .innerText(),
    "2024",
  );
  await page.waitForTimeout(400);
  assert.ok(Math.abs((await page.evaluate(() => scrollY)) - before) < 4);
  const position = await outstanding.evaluate((el) => {
    const content = el.closest(".sidebar-scroll-content");
    return {
      scroll: content.scrollTop,
      max: content.scrollHeight - content.clientHeight,
      delta:
        el.getBoundingClientRect().top - content.getBoundingClientRect().top,
    };
  });
  assert.ok(position.scroll > 0);
  assert.ok(
    position.delta >= 0 &&
      (position.delta < 55 || Math.abs(position.scroll - position.max) < 3),
  );
  assert.match(page.url(), /#entity=PAHO%402024%40outstanding$/);
  assert.equal(await outstanding.locator("details").getAttribute("open"), null);

  await page.goto(
    `${portalUrl}/system/contributors/assessments/#entity=UNCCD%402024`,
    {
      waitUntil: "networkidle",
    },
  );
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: "UNCCD", exact: true })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("region", { name: "Outstanding assessments", exact: true })
    .getByText("Reported outstanding balance", { exact: true })
    .waitFor();
  assert.match(page.url(), /#entity=UNCCD%402024$/);

  // A year outside the displayed assessment range must not substitute latest.
  await page.goto(
    `${portalUrl}/system/contributors/assessments/#entity=UNCCD%402020`,
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(() => location.hash === "");
  assert.equal(await page.getByRole("dialog").count(), 0);

  // Directory-only entries and excluded organizations cannot open assessment details.
  for (const entity of ["ACABQ", "IRMCT", "ICAO"]) {
    await page.goto(
      `${portalUrl}/system/contributors/assessments/#entity=${entity}%402024`,
      { waitUntil: "networkidle" },
    );
    await page.waitForFunction(() => location.hash === "");
    assert.equal(await page.getByRole("dialog").count(), 0);
  }
  await page.goto(
    `${portalUrl}/system/contributors/assessments/#entity=ICAO%402025`,
    { waitUntil: "networkidle" },
  );
  await page
    .getByRole("dialog")
    .getByRole("region", { name: "Assessments and payments", exact: true })
    .getByText("Paid in 2025 towards 2025", { exact: true })
    .waitFor();
  // Organizations still offers earlier years of expenditure data.
  await page.goto(`${portalUrl}/system/organizations/#entity=UNICEF%402020`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: "UNICEF", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Outstanding-only organization rows open existing sidebars, retain reporting years and scroll position; directory-only entries remain rejected.",
  );
} finally {
  await browser.close();
}
