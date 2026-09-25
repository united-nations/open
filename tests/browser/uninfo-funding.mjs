import { browserOptions, portalUrl } from "./helpers.mjs";
import { chromium } from "playwright";
import fs from "fs";
(async () => {
  const browser = await chromium.launch(browserOptions);
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(portalUrl + "/system/locations/?year=2024#country=HTI", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("button", { name: /Show all .* agency-project rows/ })
    .click();
  const project = JSON.parse(
    fs.readFileSync("public/data/uninfo-countries/HTI.json"),
  ).projects.find((p) => p.id === 135479);
  const card = page
    .getByTitle(project.name, { exact: true })
    .locator("xpath=ancestor::button[1]");
  await card.scrollIntoViewIfNeeded();
  const bars = await card.locator("[data-resource]").evaluateAll((es) =>
    es.map((e) => ({
      metric: e.dataset.resource,
      value: Number(e.dataset.value),
      width: parseFloat(e.firstElementChild.style.width),
    })),
  );
  const pass =
    bars.length === 3 &&
    bars[0].value === 4570500 &&
    bars[0].width < 10 &&
    bars[1].value === 50262036 &&
    bars[1].width === 100 &&
    bars[2].width === 100;
  await card.screenshot({ path: "audits/browser/remediation-haiti.png" });
  fs.writeFileSync(
    "audits/browser/remediation-haiti.json",
    JSON.stringify({ project: 135479, bars, pass, errors }, null, 2),
  );
  console.log({ pass, bars, errors });
  await browser.close();
  if (!pass || errors.length) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
