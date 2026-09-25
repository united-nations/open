import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
(async () => {
  const b = await chromium.launch(browserOptions);
  const p = await b.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const results = [];
  for (const [path, hash, file] of [
    ["locations", "country=HTI", "country-expenses"],
    ["contributors", "donor=Germany", "donors"],
    ["organizations", "entity=UNICEF", "entity-spending"],
    ["goals", "sdg=1", "sdg-expenses"],
  ]) {
    await p.goto(`${portalUrl}/system/${path}/#${hash}`, {
      waitUntil: "networkidle",
    });
    const d = p.getByRole("dialog").first();
    await d.waitFor();
    const before = await d.innerText();
    const choose = async (year) => {
      await d.getByRole("button", { name: "Select year", exact: true }).click();
      await p.getByRole("button", { name: String(year), exact: true }).click();
    };
    await p.route(`**/${file}-2023.json`, async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await r.continue();
    });
    await choose(2023);
    await choose(2024);
    await p.waitForTimeout(800);
    assert.equal(await d.innerText(), before);
    results.push(
      `${path}: superseded year ignored and original props restored`,
    );
    await p.unroute(`**/${file}-2023.json`);
    await p.route(`**/${file}-2023.json`, (r) =>
      r.fulfill({ status: 503, body: "unavailable" }),
    );
    await choose(2023);
    await p.waitForTimeout(350);
    assert.match(await d.innerText(), /could not be loaded for 2023/);
    results.push(`${path}: failed year disclosed`);
    await p.unroute(`**/${file}-2023.json`);
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    "audits/browser/sidebar-years.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results);
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
