import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${portalUrl}/secretariat/programme-budget/`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("radio", { name: "Expenditure", exact: true })
    .check({ force: true });
  await page.evaluate(() => {
    location.hash =
      "regular-budget=section-1~executive-office-of-the-secretary-general";
  });
  const sidebar = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Select year", exact: true }),
  });
  await sidebar.waitFor();
  await sidebar
    .getByRole("button", { name: "Select year", exact: true })
    .click();
  await page.getByRole("button", { name: "2024", exact: true }).click();
  const disclosure = sidebar.locator("details").filter({
    has: page.locator("summary").filter({ hasText: /^Source references$/ }),
  });
  await disclosure.locator("summary").click();
  await disclosure
    .getByText("2024 expenditure", { exact: true })
    .first()
    .waitFor();
  const rows = disclosure.locator("tbody tr");
  assert.equal(await rows.count(), 3);
  for (const [index, label] of [
    "regular budget",
    "other assessed",
    "extrabudgetary",
  ].entries()) {
    assert.ok((await rows.nth(index).innerText()).includes(label));
    assert.ok(
      (await rows.nth(index).innerText()).includes(
        `Row: Subtotal, ${index + 1}`,
      ),
    );
    assert.ok((await rows.nth(index).innerText()).match(/PDF page:\s*31/));
  }
  assert.equal(
    await disclosure.getByText("All funding sources", { exact: true }).count(),
    0,
  );
  for (const amount of ["$17.6M", "$1.2M", "$38.4M"]) {
    assert.ok((await sidebar.innerText()).includes(amount));
  }
  assert.deepEqual(errors, []);
  console.log(
    "EOSG 2024 sidebar shows three funding citations and unchanged financial figures.",
  );
} finally {
  await browser.close();
}
