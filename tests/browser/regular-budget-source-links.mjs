import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { browserOptions, portalUrl } from "./helpers.mjs";

const manifest = JSON.parse(
  fs.readFileSync("public/data/manifest.json", "utf8"),
);
const year = manifest.regularBudgetContributors.default;
const data = JSON.parse(
  fs.readFileSync(
    `public/data/regular-budget-contributors-${year}.json`,
    "utf8",
  ),
);
const member = data.contributors.find((row) => row.name === "Germany");
assert.ok(member?.pdfPage);
const symbol = data.meta.sources.assessment_document.symbol;
const browser = await chromium.launch(browserOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto(`${portalUrl}/secretariat/programme-budget/contributors/`, {
    waitUntil: "networkidle",
  });
  const tile = page.getByRole("button", { name: "Germany", exact: true });
  await tile.focus();
  const triggerId = await tile.getAttribute("id");
  assert.ok(triggerId);
  const popup = page.locator(`[role="dialog"][aria-labelledby="${triggerId}"]`);
  await popup.waitFor();
  const source = popup.getByRole("link", {
    name: `${symbol}, PDF page ${member.pdfPage} (opens in a new tab)`,
    exact: true,
  });
  assert.equal(
    new URL(await source.getAttribute("href")).hash,
    `#page=${member.pdfPage}`,
  );
  await tile.press("Tab");
  assert.ok(
    await source.evaluate((node) => node === document.activeElement),
    "Tab must reach the PDF link inside the tile popup",
  );
  await source.click({ trial: true });
  console.log(
    "Regular-budget tile PDF citations are keyboard- and pointer-accessible.",
  );
} finally {
  await browser.close();
}
